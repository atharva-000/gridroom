// Builds public/sample-street.json around a public library (never someone's home).
//   npm run sample-street
//   npm run sample-street -- "333 North Post Road, Princeton Junction, NJ"
// Nominatim policy: max 1 req/s, identifying User-Agent.
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stitchStreet } from '../src/geo/stitchStreet';
import { buildStreetModel } from '../src/geo/buildStreetModel';
import type { GeocodeResult, OverpassResponse, StreetModel } from '../src/geo/types';

const UA = 'GridRoom/1.0 (Congressional App Challenge student project)';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const MIN_HOUSES = 8;
const REQUEST_TIMEOUT_MS = 45_000;
const WHOLE_RUN_TIMEOUT_MS = 4 * 60_000;

// Public libraries in NJ-12. Tried in order until one has a residential street with enough houses.
const PUBLIC_PLACES = [
  '333 North Post Road, Princeton Junction, NJ 08550', // West Windsor Branch Library
  '9 Van Doren Street, Plainsboro, NJ 08536',          // Plainsboro Public Library
  '65 Witherspoon Street, Princeton, NJ 08542',        // Princeton Public Library
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// fetch, falling back to curl (Node's fetch was hanging on some Windows setups)
async function getJson(url: string, post?: { body: string; contentType: string }): Promise<unknown> {
  try {
    const res = await fetch(url, {
      method: post ? 'POST' : 'GET',
      headers: { 'User-Agent': UA, ...(post ? { 'Content-Type': post.contentType } : {}) },
      body: post?.body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.log(`    download failed with Node (${(e as Error).message}); trying curl instead`);
  }
  const args = ['-sS', '--fail', '-m', String(REQUEST_TIMEOUT_MS / 1000), '-A', UA];
  if (post) args.push('-H', `Content-Type: ${post.contentType}`, '--data-binary', '@-');
  args.push(url);
  const text = execFileSync(process.platform === 'win32' ? 'curl.exe' : 'curl', args, {
    input: post?.body, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(text);
}

async function geocode(address: string): Promise<GeocodeResult | null> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(address)}&format=jsonv2&addressdetails=1&limit=1&countrycodes=us`;
  const [hit] = (await getJson(url)) as any[];
  if (!hit?.address?.road) return null;
  const a = hit.address;
  const town = a.town ?? a.city ?? a.village ?? a.hamlet ?? a.suburb ?? '';
  return {
    lat: Number(hit.lat), lon: Number(hit.lon), road: a.road, houseNumber: a.house_number,
    townLabel: [town, a.state].filter(Boolean).join(', '),
  };
}

async function overpass(query: string): Promise<OverpassResponse> {
  const post = { body: 'data=' + encodeURIComponent(query), contentType: 'application/x-www-form-urlencoded' };
  for (const endpoint of OVERPASS) {
    try {
      return (await getJson(endpoint, post)) as OverpassResponse;
    } catch (e) {
      console.log(`    ${endpoint} failed (${(e as Error).message.split('\n')[0]}); trying the next server`);
    }
  }
  throw new Error('All Overpass map servers failed (they are often busy). Try again in a few minutes.');
}

const streetsQuery = (lat: number, lon: number) => `[out:json][timeout:25];
way(around:800,${lat},${lon})["highway"~"^(primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street)$"];
out geom;`;

const buildingsQuery = (ids: number[]) => `[out:json][timeout:25];
way(id:${ids.join(',')})->.street;
way(around.street:45)["building"];
out geom;`;

export function toSample(m: StreetModel): StreetModel {
  return {
    ...m,
    source: 'sample',
    houses: m.houses.map(h => ({ ...h, isUserHome: false })),
    warnings: m.warnings.filter(w => !/Tap a house to mark it/.test(w)),
  };
}

async function main(): Promise<boolean> {
  const places = process.argv.length > 2 ? [process.argv.slice(2).join(' ')] : PUBLIC_PLACES;
  for (const [i, place] of places.entries()) {
    if (i > 0) await sleep(1100); // Nominatim: max 1 request per second
    console.log(`Trying ${place}`);
    try {
      console.log('  1/3 finding the address...');
      const geo = await geocode(place);
      if (!geo) { console.log('  no street found for this address'); continue; }
      console.log(`      found ${geo.road}, ${geo.townLabel}`);
      console.log('  2/3 mapping the street...');
      const line = stitchStreet(geo, await overpass(streetsQuery(geo.lat, geo.lon)));
      console.log(`      ${Math.round(line.lengthM)} m of ${line.name}`);
      console.log('  3/3 finding houses...');
      const model = buildStreetModel(geo, line, await overpass(buildingsQuery(line.wayIds)));
      if (model.houses.length < MIN_HOUSES) { console.log(`  only ${model.houses.length} houses, skipping`); continue; }
      const sample = toSample(model);
      const out = new URL('../public/', import.meta.url);
      mkdirSync(out, { recursive: true });
      writeFileSync(new URL('sample-street.json', out), JSON.stringify(sample, null, 2));
      console.log(`Saved public/sample-street.json: ${sample.streetName}, ${sample.townLabel}, ${sample.houses.length} houses, ${Math.round(sample.lengthM)} m, power from end ${sample.feedEnd}`);
      sample.warnings.forEach(w => console.log(`  note: ${w}`));
      return true;
    } catch (e) {
      console.log(`  ${(e as Error).message.split('\n')[0]}`);
    }
  }
  console.error('No sample street saved. Pass a public address in quotes to try another place.');
  return false;
}

const isCli = process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/makeSampleStreet.ts');
if (isCli) {
  // keeps the process alive during downloads and kills a stuck run
  const watchdog = setTimeout(() => {
    console.error(`Stopped: no result after ${WHOLE_RUN_TIMEOUT_MS / 60_000} minutes. Check the internet connection or VPN and try again.`);
    process.exit(1);
  }, WHOLE_RUN_TIMEOUT_MS);
  main()
    .then(ok => { clearTimeout(watchdog); process.exitCode = ok ? 0 : 1; })
    .catch(e => { clearTimeout(watchdog); console.error(`Unexpected error: ${(e as Error).stack ?? e}`); process.exitCode = 1; });
}
