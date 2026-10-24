import { describe, it, expect } from 'vitest';
import { centroid, pointInPolygon, polygonAreaM2, polylineLength, projectOntoPolyline, slicePolyline } from './geometry';
import { stitchStreet, roadRank } from './stitchStreet';
import { buildStreetModel, MAX_HOUSES } from './buildStreetModel';
import { manualStreetModel } from './manualStreet';
import { analyzeStreet, feedLayout, roomKwFor } from './analyzeStreet';
import type { OverpassResponse } from './types';
import { at, building, BUILDINGS, GEO, STREETS, STREETS_WITH_BRANCH, way } from './fixtures/streetFixture';

const none = (n: number) => Array(n).fill(false);

describe('geometry', () => {
  it('measures a polyline in meters', () => {
    expect(polylineLength([at(0, 0), at(300, 0), at(300, 400)])).toBeCloseTo(700, 0);
  });
  it('projects a point onto a polyline', () => {
    const p = projectOntoPolyline(at(250, 30), [at(0, 0), at(400, 0)]);
    expect(p.distM).toBeCloseTo(30, 0);
    expect(p.alongM).toBeCloseTo(250, 0);
  });
  it('area, centroid and point-in-polygon of a 10 × 12 m house', () => {
    const b = building(1, 50, 50, { building: 'house' });
    expect(polygonAreaM2(b.geometry)).toBeCloseTo(120, 0);
    const c = centroid(b.geometry);
    expect(c.lat).toBeCloseTo(at(50, 50).lat, 7);
    expect(pointInPolygon(at(52, 48), b.geometry)).toBe(true);
    expect(pointInPolygon(at(60, 50), b.geometry)).toBe(false);
  });
});

describe('stitchStreet', () => {
  it('joins two pieces (flipping the reversed one) into one 400 m line', () => {
    const line = stitchStreet(GEO, STREETS);
    expect(line.wayIds).toEqual([1, 2]);
    expect(line.lengthM).toBeCloseTo(400, 0);
    expect(line.points[0].lon).toBeCloseTo(at(0, 0).lon, 7);
    expect(line.points[line.points.length - 1].lon).toBeCloseTo(at(400, 0).lon, 7);
    expect(line.warnings).toEqual([]);
  });
  it('ranks ends: tertiary cross street = 3, dead end = 0', () => {
    const line = stitchStreet(GEO, STREETS);
    expect(line.endARank).toBe(3);
    expect(line.endBRank).toBe(0);
    expect(roadRank('secondary_link')).toBe(4);
  });
  it('at a branch, follows the straightest piece and warns', () => {
    const line = stitchStreet(GEO, STREETS_WITH_BRANCH);
    expect(line.wayIds).toEqual([1, 2]);
    expect(line.warnings[0]).toMatch(/branches/);
  });
  it('trims a long street to the 1.5 km centered on the address, even when one piece is long', () => {
    const long: OverpassResponse = {
      elements: [
        way(1, [1, 2], [[0, 0], [3300, 0]], { highway: 'residential', name: 'Maple Lane' }),
        way(10, [11, 2, 12], [[3300, -100], [3300, 0], [3300, 100]], { highway: 'secondary', name: 'Big Road' }),
      ],
    };
    const geo = { ...GEO, ...at(2500, 20) };
    const line = stitchStreet(geo, long);
    expect(line.lengthM).toBeCloseTo(1500, 0);
    expect(line.points[0].lon).toBeCloseTo(at(1750, 0).lon, 6);
    expect(line.points[line.points.length - 1].lon).toBeCloseTo(at(3250, 0).lon, 6);
    expect(line.endBRank).toBe(4); // the real end still meets the bigger road
    expect(line.warnings.some(w => /1\.5 km/.test(w))).toBe(true);
    const houses: OverpassResponse = {
      elements: [
        building(600, 200, 20, { building: 'house' }),            // 1.5 km+ away from the kept piece → out
        ...Array.from({ length: 5 }, (_, i) => building(610 + i, 2000 + i * 100, 20, { building: 'house' })),
      ],
    };
    const m = buildStreetModel(geo, line, houses);
    expect(m.houses.map(h => h.id)).not.toContain('osm-600');
    expect(m.houses).toHaveLength(5);
    expect(m.houses[0].distAlongM).toBeCloseTo(250, 0);
  });
  it('slicePolyline cuts at exact distances', () => {
    const cut = slicePolyline([at(0, 0), at(100, 0), at(100, 100)], 50, 150);
    expect(polylineLength(cut)).toBeCloseTo(100, 1);
    expect(cut[0].lon).toBeCloseTo(at(50, 0).lon, 7);
    expect(cut[cut.length - 1].lat).toBeCloseTo(at(100, 50).lat, 7);
  });
  it('throws a friendly error when the street name is missing', () => {
    expect(() => stitchStreet({ ...GEO, road: 'Nowhere Road' }, STREETS)).toThrow(/Couldn't find that street/);
  });
});

describe('buildStreetModel', () => {
  const line = stitchStreet(GEO, STREETS);
  const model = buildStreetModel(GEO, line, BUILDINGS);

  it('keeps the 20 houses and filters out shed, far building, other street, apartments', () => {
    expect(model.houses).toHaveLength(20);
    const ids = model.houses.map(h => h.id);
    ['osm-300', 'osm-301', 'osm-302', 'osm-303'].forEach(id => expect(ids).not.toContain(id));
    expect(model.warnings.some(w => /Apartment/.test(w))).toBe(true);
  });
  it('sorts houses by distance along the street', () => {
    const d = model.houses.map(h => h.distAlongM);
    expect(d).toEqual([...d].sort((a, b) => a - b));
    expect(d[0]).toBeCloseTo(20, 0);
  });
  it('marks the house the address point falls inside as the user home', () => {
    const homes = model.houses.filter(h => h.isUserHome);
    expect(homes.map(h => h.id)).toEqual(['osm-104']); // the house centered at x = 180, y = 20
  });
  it('picks the end meeting the bigger road as the feed end', () => {
    expect(model.feedEnd).toBe('A');
  });
  it('caps at 60 houses around the user home', () => {
    const long: OverpassResponse = {
      elements: [way(1, [1, 2], [[0, 0], [1440, 0]], { highway: 'residential', name: 'Maple Lane' })],
    };
    const geo = { ...GEO, ...at(1000, 20) };
    const lineL = stitchStreet(geo, long);
    const many: OverpassResponse = {
      elements: [
        ...Array.from({ length: 35 }, (_, i) => building(400 + i, 20 + i * 40, 20, { building: 'house' })),
        ...Array.from({ length: 35 }, (_, i) => building(500 + i, 20 + i * 40, -20, { building: 'house' })),
      ],
    };
    const m = buildStreetModel(geo, lineL, many);
    expect(m.houses).toHaveLength(MAX_HOUSES);
    expect(m.houses.some(h => h.isUserHome)).toBe(true);
    expect(m.warnings.some(w => /60 houses/.test(w))).toBe(true);
  });
  it('refuses a street with fewer than 3 houses', () => {
    const few: OverpassResponse = { elements: BUILDINGS.elements.slice(0, 2) };
    expect(() => buildStreetModel(GEO, line, few)).toThrow(/too few houses/);
  });
});

describe('manualStreetModel', () => {
  it('10 houses on 300 m are 30 m apart', () => {
    const m = manualStreetModel(10, 300);
    expect(m.houses).toHaveLength(10);
    expect(m.houses[1].distAlongM - m.houses[0].distAlongM).toBeCloseTo(30, 9);
    expect(m.houses.filter(h => h.isUserHome)).toHaveLength(1);
  });
  it('clamps silly input', () => {
    expect(manualStreetModel(500, 10).houses).toHaveLength(60);
    expect(manualStreetModel(1, 5000).lengthM).toBe(1500);
  });
});

describe('analyzeStreet', () => {
  const m = manualStreetModel(15, 300);
  const red = { kind: 'pseg' as const, color: 'red' as const };

  it('utility map → room for solar', () => {
    expect(roomKwFor(red)).toBe(50);
    expect(roomKwFor({ kind: 'jcpl', kw: 99999 })).toBe(5000);
    expect(roomKwFor({ kind: 'unknown' })).toBe(316);
  });
  it('manual 15 houses / 300 m, PSE&G red: best 10, worst 9, smart 13 / 13', () => {
    const a = analyzeStreet(m, { feedEnd: 'A', utility: red, solar: none(15), smartInverters: false });
    expect(a.capacity).toEqual({ best: 10, worst: 9, bestSmart: 13, worstSmart: 13 });
    expect(a.roomKwUsed).toBe(50);
  });
  it('feeding from end B mirrors an evenly spaced street', () => {
    const a = analyzeStreet(m, { feedEnd: 'B', utility: red, solar: none(15), smartInverters: false });
    expect(a.capacity).toEqual({ best: 10, worst: 9, bestSmart: 13, worstSmart: 13 });
    expect(a.feedOrder[0]).toBe(14);
  });
  it('green leaves room for every house on a short street', () => {
    const a = analyzeStreet(m, { feedEnd: 'A', utility: { kind: 'pseg', color: 'green' }, solar: none(15), smartInverters: false });
    expect(a.capacity.best).toBe(15);
    expect(a.capacity.worst).toBe(15);
  });
  it('unknown utility gives capacity for all three colors', () => {
    const a = analyzeStreet(m, { feedEnd: 'A', utility: { kind: 'unknown' }, solar: none(15), smartInverters: false });
    expect(a.capacityByColor!.red.best).toBe(10);
    expect(a.capacityByColor!.green.best).toBeGreaterThanOrEqual(a.capacityByColor!.red.best);
  });
  it('maps voltages back to house order and reports the user home', () => {
    const solar = none(15);
    [0, 1, 2, 3].forEach(i => (solar[i] = true));
    const a = analyzeStreet(m, { feedEnd: 'A', utility: red, solar, smartInverters: false });
    expect(a.voltages).toHaveLength(15);
    expect(a.voltages[14]).toBeCloseTo(a.out.voltages[14], 12);
    expect(a.yourHome).not.toBeNull();
    expect(a.yourHome!.positionFromFeed).toBe(8);
    expect(a.yourHome!.withYours.ok).toBe(true);
  });
  it('too much solar: adding the home pushes the street over, smart inverters help', () => {
    const solar = Array(15).fill(true);
    solar[7] = false;
    const a = analyzeStreet(m, { feedEnd: 'A', utility: red, solar, smartInverters: false });
    expect(a.yourHome!.withYours.ok).toBe(false);
    expect(a.yourHome!.withYoursSmart.maxV).toBeLessThan(a.yourHome!.withYours.maxV);
  });
  it('segments use real spacing with a 2 m minimum', () => {
    const { segmentLengthsM } = feedLayout(
      { ...m, houses: [{ id: 'a', distAlongM: 10, isUserHome: false }, { id: 'b', distAlongM: 10.5, isUserHome: false }, { id: 'c', distAlongM: 50, isUserHome: false }] },
      'A');
    expect(segmentLengthsM).toEqual([10, 2, 39.5]);
  });
});
