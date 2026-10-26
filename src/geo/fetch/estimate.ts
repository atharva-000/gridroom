import type { GeocodeResult, LatLng, OsmWay, OverpassResponse } from '../types';
import { politeWait } from './nominatim';

// Backup for when every Overpass server is down: Nominatim can still return the
// street's real centerline, and houses are placed along it at a typical lot width.
const LOT_M = 30;
const SETBACK_M = 18;
const M_PER_DEG_LAT = 111_320;

type GeoJson = { type: string; coordinates: number[][] | number[][][] };

function lines(g: GeoJson): LatLng[][] {
  if (g.type === 'LineString') return [(g.coordinates as number[][]).map(([lon, lat]) => ({ lat, lon }))];
  if (g.type === 'MultiLineString') return (g.coordinates as number[][][]).map(l => l.map(([lon, lat]) => ({ lat, lon })));
  return [];
}

function square(c: LatLng, mPerDegLon: number): LatLng[] {
  const dLat = 6 / M_PER_DEG_LAT;
  const dLon = 6 / mPerDegLon;
  return [
    { lat: c.lat - dLat, lon: c.lon - dLon },
    { lat: c.lat - dLat, lon: c.lon + dLon },
    { lat: c.lat + dLat, lon: c.lon + dLon },
    { lat: c.lat + dLat, lon: c.lon - dLon },
    { lat: c.lat - dLat, lon: c.lon - dLon },
  ];
}

export async function estimateStreetArea(geo: GeocodeResult): Promise<OverpassResponse> {
  await politeWait();
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      street: geo.road,
      ...(geo.town ? { city: geo.town } : {}),
      state: 'New Jersey',
      countrycodes: 'us',
      format: 'jsonv2',
      polygon_geojson: '1',
      polygon_threshold: '0.00002',
      limit: '10',
    });
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error('map busy');
  const hits = (await res.json()) as Array<{ osm_type: string; osm_id: number; category: string; geojson: GeoJson }>;

  const mPerDegLon = M_PER_DEG_LAT * Math.cos((geo.lat * Math.PI) / 180);
  const near = (p: LatLng) => Math.hypot((p.lat - geo.lat) * M_PER_DEG_LAT, (p.lon - geo.lon) * mPerDegLon) < 1500;

  const roads: OsmWay[] = [];
  for (const h of hits) {
    if (h.category !== 'highway' || h.osm_type !== 'way') continue;
    for (const pts of lines(h.geojson)) {
      if (pts.length >= 2 && pts.some(near)) {
        roads.push({ type: 'way', id: h.osm_id * 10 + roads.length, nodes: [], geometry: pts, tags: { highway: 'residential', name: geo.road } });
      }
    }
  }
  if (!roads.length) throw new Error('no street');

  // houses on both sides, one per lot, set back from the centerline
  const homes: OsmWay[] = [];
  let id = -1;
  for (const road of roads) {
    const pts = road.geometry;
    let next = LOT_M / 2; // distance along the street of the next lot
    let walked = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const dx = (pts[i + 1].lon - pts[i].lon) * mPerDegLon;
      const dy = (pts[i + 1].lat - pts[i].lat) * M_PER_DEG_LAT;
      const len = Math.hypot(dx, dy);
      for (; next < walked + len; next += LOT_M) {
        const t = (next - walked) / len;
        const nx = -dy / len;
        const ny = dx / len;
        for (const side of [1, -1]) {
          const c = {
            lat: pts[i].lat + (dy * t + side * ny * SETBACK_M) / M_PER_DEG_LAT,
            lon: pts[i].lon + (dx * t + side * nx * SETBACK_M) / mPerDegLon,
          };
          homes.push({ type: 'way', id: id--, nodes: [], geometry: square(c, mPerDegLon), tags: { building: 'house' } });
        }
      }
      walked += len;
    }
  }
  return { elements: [...roads, ...homes] };
}
