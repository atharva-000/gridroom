import type { GeocodeResult, OverpassResponse } from '../types';

// One request per street: the nearby roads plus the buildings along the named street.
// Servers are tried in order; a busy one (429/504) is skipped rather than retried in a loop.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const ROADS = 'primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street';
const CACHE_KEY = 'gridroom.overpass.v1';
const cache = new Map<string, OverpassResponse>();
let inFlight: Promise<OverpassResponse> | null = null;

const quote = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

function areaQuery(geo: GeocodeResult) {
  const at = `${geo.lat.toFixed(6)},${geo.lon.toFixed(6)}`;
  return `[out:json][timeout:20];
way(around:800,${at})["highway"~"^(${ROADS})$"]->.roads;
way.roads["name"="${quote(geo.road)}"]->.street;
way(around.street:45)["building"]->.homes;
(.roads; .homes;);
out geom;`;
}

function fromSession(key: string): OverpassResponse | null {
  try {
    const all = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, OverpassResponse>;
    return all[key] ?? null;
  } catch {
    return null;
  }
}

function toSession(key: string, data: OverpassResponse) {
  try {
    // keep only the latest street; responses can be a few hundred KB
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ [key]: data }));
  } catch {
    // storage full or blocked
  }
}

async function run(query: string): Promise<OverpassResponse> {
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as OverpassResponse;
      if (Array.isArray(data.elements)) return data;
    } catch {
      // timeout or network error: next server
    }
  }
  throw new Error('The map servers are busy right now. Try again in a minute, or use the sample street.');
}

export async function fetchStreetArea(geo: GeocodeResult): Promise<OverpassResponse> {
  const query = areaQuery(geo);
  const hit = cache.get(query) ?? fromSession(query);
  if (hit) return hit;
  if (inFlight) return inFlight; // never two map requests at once
  inFlight = run(query)
    .then(data => {
      cache.set(query, data);
      toSession(query, data);
      return data;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
