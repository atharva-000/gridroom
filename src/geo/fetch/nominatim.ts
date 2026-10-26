import type { GeocodeResult } from '../types';

// Nominatim policy: no autocomplete, max 1 request per second, cache results.
const cache = new Map<string, GeocodeResult>();
let lastRequest = 0;

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const query = address.trim();
  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const wait = 1100 - (Date.now() - lastRequest);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&limit=1&countrycodes=us`;
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  } catch {
    throw new Error("Couldn't reach the address search. Check the internet connection and try again.");
  }
  if (!res.ok) throw new Error('The address search is busy right now. Try again in a minute.');

  const [hit] = (await res.json()) as Array<{ lat: string; lon: string; address?: Record<string, string> }>;
  if (!hit?.address?.road) throw new Error("Couldn't find that street. Try the full address with town and ZIP.");
  const a = hit.address;
  const town = a.town ?? a.city ?? a.village ?? a.hamlet ?? a.suburb ?? '';
  const result: GeocodeResult = {
    lat: Number(hit.lat),
    lon: Number(hit.lon),
    road: a.road,
    houseNumber: a.house_number,
    townLabel: [town, a.state].filter(Boolean).join(', '),
  };
  cache.set(key, result);
  return result;
}
