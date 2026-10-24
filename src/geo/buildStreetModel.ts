// building footprints near the street -> ordered list of houses
import type { GeocodeResult, OsmWay, OverpassResponse, StreetHouse, StreetLine, StreetModel } from './types';
import { centroid, distanceM, pointInPolygon, polygonAreaM2, projectOntoPolyline } from './geometry';
import { normName } from './stitchStreet';

export const MAX_HOUSES = 60;
const HOUSE_TAGS = new Set(['house', 'detached', 'residential', 'semidetached_house', 'bungalow', 'terrace', 'yes']);
const MIN_AREA_M2 = 40;
const MAX_AREA_M2 = 800;
const MAX_SETBACK_M = 45;
const HOME_SNAP_M = 40;

interface Candidate { way: OsmWay; distAlongM: number; center: { lat: number; lon: number } }

export function buildStreetModel(geo: GeocodeResult, line: StreetLine, resp: OverpassResponse): StreetModel {
  const warnings = [...line.warnings];
  const streetName = normName(line.name);
  let sawApartments = false;
  const found: Candidate[] = [];
  const seen = new Set<number>();

  for (const el of resp.elements) {
    if (el.type !== 'way' || !el.tags?.building || !Array.isArray(el.geometry) || el.geometry.length < 3) continue;
    if (seen.has(el.id)) continue;
    seen.add(el.id);
    const kind = el.tags.building;
    if (kind === 'apartments') { sawApartments = true; continue; }
    if (!HOUSE_TAGS.has(kind)) continue;
    const area = polygonAreaM2(el.geometry);
    if (area < MIN_AREA_M2 || area > MAX_AREA_M2) continue;
    const addrStreet = el.tags['addr:street'];
    if (addrStreet && normName(addrStreet) !== streetName) continue;
    const center = centroid(el.geometry);
    const proj = projectOntoPolyline(center, line.points);
    if (proj.distM > MAX_SETBACK_M) continue;
    found.push({ way: el, distAlongM: proj.alongM, center });
  }
  if (sawApartments) warnings.push("Apartment buildings aren't modeled.");

  // user's home: building containing the point, else nearest within HOME_SNAP_M
  const here = { lat: geo.lat, lon: geo.lon };
  let homeId: number | null = found.find(f => pointInPolygon(here, f.way.geometry))?.way.id ?? null;
  if (homeId === null) {
    let bestD = HOME_SNAP_M;
    for (const f of found) {
      const d = distanceM(here, f.center);
      if (d <= bestD) { bestD = d; homeId = f.way.id; }
    }
  }
  if (homeId === null) warnings.push('Home not found. Tap a house to mark it.');

  let kept = found;
  if (found.length > MAX_HOUSES) {
    const anchor = homeId !== null
      ? found.find(f => f.way.id === homeId)!.distAlongM
      : projectOntoPolyline(here, line.points).alongM;
    kept = found.slice().sort((a, b) => Math.abs(a.distAlongM - anchor) - Math.abs(b.distAlongM - anchor)).slice(0, MAX_HOUSES);
    warnings.push(`Only the ${MAX_HOUSES} houses closest to the address are modeled.`);
  }
  if (kept.length < 3) throw new Error('We found too few houses on this street.');

  const houses: StreetHouse[] = kept
    .slice()
    .sort((a, b) => a.distAlongM - b.distAlongM)
    .map(f => ({ id: `osm-${f.way.id}`, position: f.center, distAlongM: f.distAlongM, isUserHome: f.way.id === homeId }));

  return {
    streetName: line.name,
    townLabel: geo.townLabel,
    line: line.points,
    lengthM: line.lengthM,
    houses,
    feedEnd: line.endBRank > line.endARank ? 'B' : 'A',
    source: 'osm',
    warnings,
  };
}
