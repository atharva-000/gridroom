// flat-earth helpers in meters (fine for a couple of km)
import type { LatLng } from './types';

const M_PER_DEG_LAT = 110540;
const M_PER_DEG_LON = 111320; // * cos(lat)

export interface XY { x: number; y: number }

export function toXY(p: LatLng, origin: LatLng): XY {
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);
  return {
    x: (p.lon - origin.lon) * M_PER_DEG_LON * cosLat,
    y: (p.lat - origin.lat) * M_PER_DEG_LAT,
  };
}

export function fromXY(p: XY, origin: LatLng): LatLng {
  const cosLat = Math.cos((origin.lat * Math.PI) / 180);
  return { lat: origin.lat + p.y / M_PER_DEG_LAT, lon: origin.lon + p.x / (M_PER_DEG_LON * cosLat) };
}

export function distanceM(a: LatLng, b: LatLng): number {
  const q = toXY(b, a);
  return Math.hypot(q.x, q.y);
}

export function polylineLength(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceM(points[i - 1], points[i]);
  return total;
}

// distM = distance to the line, alongM = distance from points[0] to the closest point
export function projectOntoPolyline(p: LatLng, points: LatLng[]): { distM: number; alongM: number } {
  if (points.length === 0) return { distM: Infinity, alongM: 0 };
  if (points.length === 1) return { distM: distanceM(p, points[0]), alongM: 0 };
  const origin = points[0];
  const P = toXY(p, origin);
  let best = { distM: Infinity, alongM: 0 };
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const A = toXY(points[i - 1], origin);
    const B = toXY(points[i], origin);
    const dx = B.x - A.x, dy = B.y - A.y;
    const segLen = Math.hypot(dx, dy);
    const t = segLen === 0 ? 0 : Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.y - A.y) * dy) / (segLen * segLen)));
    const cx = A.x + t * dx, cy = A.y + t * dy;
    const d = Math.hypot(P.x - cx, P.y - cy);
    if (d < best.distM) best = { distM: d, alongM: walked + t * segLen };
    walked += segLen;
  }
  return best;
}

// piece of the line between fromM and toM (measured from points[0])
export function slicePolyline(points: LatLng[], fromM: number, toM: number): LatLng[] {
  if (points.length < 2 || toM <= fromM) return points.slice(0, 1);
  const lerp = (a: LatLng, b: LatLng, t: number): LatLng => ({ lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t });
  const out: LatLng[] = [];
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = distanceM(a, b);
    const segStart = walked, segEnd = walked + len;
    if (segEnd >= fromM && segStart <= toM && len > 0) {
      if (out.length === 0) out.push(lerp(a, b, Math.max(0, (fromM - segStart) / len)));
      if (segEnd <= toM) out.push(b);
      else { out.push(lerp(a, b, (toM - segStart) / len)); break; }
    }
    walked = segEnd;
  }
  return out;
}

// OSM closed ways repeat the first point at the end
function openRing(ring: LatLng[]): LatLng[] {
  if (ring.length > 1) {
    const a = ring[0], b = ring[ring.length - 1];
    if (a.lat === b.lat && a.lon === b.lon) return ring.slice(0, -1);
  }
  return ring;
}

export function polygonAreaM2(ring: LatLng[]): number {
  const pts = openRing(ring);
  if (pts.length < 3) return 0;
  const xy = pts.map(p => toXY(p, pts[0]));
  let s = 0;
  for (let i = 0; i < xy.length; i++) {
    const a = xy[i], b = xy[(i + 1) % xy.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function centroid(ring: LatLng[]): LatLng {
  const pts = openRing(ring);
  const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const lon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
  return { lat, lon };
}

export function pointInPolygon(p: LatLng, ring: LatLng[]): boolean {
  const pts = openRing(ring);
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    const crosses = (a.lat > p.lat) !== (b.lat > p.lat)
      && p.lon < ((b.lon - a.lon) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lon;
    if (crosses) inside = !inside;
  }
  return inside;
}
