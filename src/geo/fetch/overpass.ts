import type { GeocodeResult, OverpassResponse } from '../types';
import { estimateStreetArea } from './estimate';

export type StreetArea = OverpassResponse & { estimated?: boolean };

// One request per street: the nearby roads plus the buildings along the named street.
// The main server gets one patient retry (it says how long until a free slot);
// the mirrors get one quick try each.
const MAIN = 'https://overpass-api.de/api';
const MIRRORS: [string, number][] = [
  ['https://overpass.kumi.systems/api/interpreter', 7_000],
  ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 6_000],
  ['https://overpass.private.coffee/api/interpreter', 6_000],
];
const MAX_WAIT_S = 25;
const ROADS = 'primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street';
const CACHE_KEY = 'gridroom.overpass.v1';
const cache = new Map<string, OverpassResponse>();
let inFlight: Promise<StreetArea> | null = null;

const quote = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

function areaQuery(geo: GeocodeResult) {
  const at = `${geo.lat.toFixed(6)},${geo.lon.toFixed(6)}`;
  return `[out:json][timeout:20][maxsize:33554432];
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

async function post(endpoint: string, query: string, ms: number): Promise<OverpassResponse | 'busy' | null> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(ms),
    });
    if (res.status === 429 || res.status === 504) return 'busy';
    if (!res.ok) return null;
    const data = (await res.json()) as OverpassResponse;
    return Array.isArray(data.elements) ? data : null;
  } catch {
    return null; // timeout or network error
  }
}

// The main server's status page says how many free slots this connection has,
// or how many seconds until the next one.
async function secondsUntilSlot(): Promise<number | null> {
  try {
    const text = await (await fetch(`${MAIN}/status`, { signal: AbortSignal.timeout(4_000) })).text();
    if (/[1-9]\d* slots? available now/.test(text)) return 0;
    const waits = [...text.matchAll(/in (-?\d+) seconds/g)].map(m => Number(m[1]));
    return waits.length ? Math.max(0, Math.min(...waits)) : null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function run(query: string, geo: GeocodeResult, onWait?: (msg: string) => void): Promise<StreetArea> {
  const first = await post(`${MAIN}/interpreter`, query, 15_000);
  if (first && first !== 'busy') return first;

  const wait = await secondsUntilSlot();
  if (wait !== null && wait <= MAX_WAIT_S) {
    onWait?.(wait > 0 ? `The map server is busy. Waiting ${wait} seconds for a turn…` : 'Trying the map server again…');
    await sleep(wait * 1000 + 500);
    const second = await post(`${MAIN}/interpreter`, query, 15_000);
    if (second && second !== 'busy') return second;
  }

  onWait?.('Trying a backup map server…');
  for (const [endpoint, ms] of MIRRORS) {
    const data = await post(endpoint, query, ms);
    if (data && data !== 'busy') return data;
  }
  // every map server failed: fall back to the street's real shape with estimated lots
  try {
    return { ...(await estimateStreetArea(geo)), estimated: true };
  } catch {
    throw new Error('The map servers are busy right now. Try again in a minute, or use the sample street.');
  }
}

export async function fetchStreetArea(geo: GeocodeResult, onWait?: (msg: string) => void): Promise<StreetArea> {
  const query = areaQuery(geo);
  const hit = cache.get(query) ?? fromSession(query);
  if (hit) return hit;
  if (inFlight) return inFlight; // never two map requests at once
  inFlight = run(query, geo, onWait)
    .then(data => {
      if (!data.estimated) {
        cache.set(query, data);
        toSession(query, data);
      }
      return data;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
