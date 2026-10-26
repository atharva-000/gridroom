import type { GeocodeResult } from '../types';

// New Jersey only. Nominatim policy: no autocomplete, at most 1 request per second, cache results.
const NJ_VIEWBOX = '-75.60,41.40,-73.85,38.90'; // left, top, right, bottom
const CACHE_KEY = 'gridroom.geocode.v1';
const cache = new Map<string, GeocodeResult>(readCache());
let lastRequest = 0;

function readCache(): [string, GeocodeResult][] {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function writeCache() {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify([...cache].slice(-30)));
  } catch {
    // storage blocked; the in-memory cache still works
  }
}

// Nominatim allows one request per second; every call in the app goes through this.
export async function politeWait() {
  const wait = 1100 - (Date.now() - lastRequest);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const query = address.trim().replace(/\s+/g, ' ');
  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  await politeWait();

  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '1',
      countrycodes: 'us',
      viewbox: NJ_VIEWBOX,
      bounded: '1',
    });

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new Error("Couldn't reach the address search. Check the internet connection and try again.");
  }
  if (res.status === 429) throw new Error('Too many searches in a row. Wait a few seconds and try again.');
  if (!res.ok) throw new Error('The address search is busy right now. Try again in a minute.');

  const [hit] = (await res.json()) as Array<{ lat: string; lon: string; address?: Record<string, string> }>;
  if (!hit) throw new Error("No New Jersey address matched. Check the spelling and include the town or ZIP.");
  if (!hit.address?.road) throw new Error('That matched a place, not a street address. Include a house number and street.');
  if (hit.address.state && hit.address.state !== 'New Jersey') throw new Error('GridRoom only looks up New Jersey addresses.');

  const a = hit.address;
  const town = a.town ?? a.city ?? a.village ?? a.hamlet ?? a.suburb ?? a.township ?? '';
  const result: GeocodeResult = {
    lat: Number(hit.lat),
    lon: Number(hit.lon),
    road: a.road,
    houseNumber: a.house_number,
    townLabel: [town, 'NJ'].filter(Boolean).join(', '),
    town,
  };
  cache.set(key, result);
  writeCache();
  return result;
}
