import type { OverpassResponse } from '../types';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const cache = new Map<string, OverpassResponse>();

async function runQuery(query: string): Promise<OverpassResponse> {
  const cached = cache.get(query);
  if (cached) return cached;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as OverpassResponse;
      cache.set(query, data);
      return data;
    } catch {
      // try the next server
    }
  }
  throw new Error('The map servers are busy right now. Try again in a few minutes, or use the sample street.');
}

export function fetchStreetWays(lat: number, lon: number) {
  return runQuery(`[out:json][timeout:25];
way(around:800,${lat.toFixed(6)},${lon.toFixed(6)})["highway"~"^(primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street)$"];
out geom;`);
}

export function fetchBuildings(wayIds: number[]) {
  return runQuery(`[out:json][timeout:25];
way(id:${wayIds.join(',')})->.street;
way(around.street:45)["building"];
out geom;`);
}
