// Joins the OSM ways for one street name into a single line.
import type { GeocodeResult, OsmWay, OverpassResponse, StreetLine, LatLng } from './types';
import { polylineLength, projectOntoPolyline, slicePolyline, toXY } from './geometry';

export const MAX_STREET_M = 1500;
const MAX_GROW_M = 6000;

const BASE_RANK: Record<string, number> = {
  primary: 5, secondary: 4, tertiary: 3, unclassified: 2, residential: 1, living_street: 1,
};

export function roadRank(highway: string | undefined): number {
  if (!highway) return 0;
  return BASE_RANK[highway.replace(/_link$/, '')] ?? 0;
}

export const normName = (s: string | undefined) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

// turn angle at b, 0 = straight
function turnAngle(a: LatLng, b: LatLng, c: LatLng): number {
  const B = toXY(b, a), C = toXY(c, a);
  const d1 = { x: B.x, y: B.y };
  const d2 = { x: C.x - B.x, y: C.y - B.y };
  const dot = d1.x * d2.x + d1.y * d2.y;
  const len = Math.hypot(d1.x, d1.y) * Math.hypot(d2.x, d2.y);
  if (len === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / len)));
}

export function stitchStreet(geo: GeocodeResult, resp: OverpassResponse): StreetLine {
  const ways = resp.elements.filter((e): e is OsmWay => e.type === 'way' && Array.isArray(e.geometry) && e.geometry.length >= 2);
  const name = normName(geo.road);
  const candidates = ways.filter(w => normName(w.tags?.name) === name);
  if (candidates.length === 0) throw new Error("Couldn't find that street in the map data.");

  const here = { lat: geo.lat, lon: geo.lon };
  const start = candidates.reduce((best, w) =>
    projectOntoPolyline(here, w.geometry).distM < projectOntoPolyline(here, best.geometry).distM ? w : best);

  const used = new Set<number>([start.id]);
  const wayIds = [start.id];
  let nodes = start.nodes.slice();
  let points = start.geometry.slice();
  const warnings = new Set<string>();

  const nextPiece = (endNode: number, prev: LatLng, endPoint: LatLng) => {
    const fits = candidates
      .filter(w => !used.has(w.id) && (w.nodes[0] === endNode || w.nodes[w.nodes.length - 1] === endNode))
      .map(w => {
        const forward = w.nodes[0] === endNode;
        const geom = forward ? w.geometry : w.geometry.slice().reverse();
        const ids = forward ? w.nodes : w.nodes.slice().reverse();
        return { w, geom, ids, angle: turnAngle(prev, endPoint, geom[1]) };
      });
    if (fits.length === 0) return null;
    if (fits.length > 1) warnings.add('This street branches; the straightest path was used.');
    return fits.reduce((a, b) => (b.angle < a.angle ? b : a));
  };

  let growBack = true, growFront = true;
  while (growBack || growFront) {
    if (polylineLength(points) > MAX_GROW_M) break;
    if (growBack) {
      const p = nodes[0] === nodes[nodes.length - 1] ? null
        : nextPiece(nodes[nodes.length - 1], points[points.length - 2], points[points.length - 1]);
      if (p) {
        used.add(p.w.id); wayIds.push(p.w.id);
        nodes = nodes.concat(p.ids.slice(1));
        points = points.concat(p.geom.slice(1));
      } else growBack = false;
    }
    if (polylineLength(points) > MAX_GROW_M) break;
    if (growFront) {
      const rp = points.slice().reverse();
      const p = nodes[0] === nodes[nodes.length - 1] ? null : nextPiece(nodes[0], rp[rp.length - 2], rp[rp.length - 1]);
      if (p) {
        used.add(p.w.id); wayIds.unshift(p.w.id);
        nodes = p.ids.slice().reverse().concat(nodes.slice(1));
        points = p.geom.slice().reverse().concat(points.slice(1));
      } else growFront = false;
    }
  }

  // rank each end by the biggest road that touches it
  const chainIds = new Set(wayIds);
  const rankAt = (nodeId: number) => ways
    .filter(w => !chainIds.has(w.id) && w.nodes.includes(nodeId))
    .reduce((best, w) => Math.max(best, roadRank(w.tags?.highway)), 0);

  // too long: keep MAX_STREET_M centered on the address (end ranks still come from the real ends)
  const fullLength = polylineLength(points);
  if (fullLength > MAX_STREET_M) {
    const center = projectOntoPolyline(here, points).alongM;
    const from = Math.max(0, Math.min(fullLength - MAX_STREET_M, center - MAX_STREET_M / 2));
    points = slicePolyline(points, from, from + MAX_STREET_M);
    warnings.add('Long street: only the 1.5 km around the address is modeled.');
  }

  return {
    name: candidates[0].tags?.name ?? geo.road,
    wayIds,
    points,
    lengthM: polylineLength(points),
    endARank: rankAt(nodes[0]),
    endBRank: rankAt(nodes[nodes.length - 1]),
    warnings: [...warnings],
  };
}
