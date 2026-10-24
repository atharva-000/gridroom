// Runs the engine on a street built from map data.
// Utility "room" (kW) -> upstream impedance: adding roomKw at the street entrance should take
// V from 1.02 to 1.05, so r = 0.03 / (roomKw / 100) = 3 / roomKw.
import { simulate, hostingCapacity } from '../engine';
import { type SimInput, V_MAX, emptyFlags } from '../engine/contract';
import type { AnalyzeStreetFn, Capacity, StreetModel, StreetOptions, UtilityInput } from './types';

export const ROOM_KW = { red: 50, yellow: 316, green: 2000 } as const;
const MIN_SEGMENT_M = 2;

export function roomKwFor(u: UtilityInput): number {
  if (u.kind === 'pseg') return ROOM_KW[u.color];
  if (u.kind === 'jcpl') return Math.max(5, Math.min(5000, Number.isFinite(u.kw) ? u.kw : ROOM_KW.yellow));
  return ROOM_KW.yellow;
}

export function upstreamForRoom(roomKw: number) {
  const r = 3 / roomKw;
  return { r, x: r };
}

// sort houses outward from the feed end and get segment lengths
export function feedLayout(model: StreetModel, feedEnd: 'A' | 'B') {
  const dist = model.houses.map(h => (feedEnd === 'A' ? h.distAlongM : model.lengthM - h.distAlongM));
  const feedOrder = model.houses.map((_, i) => i).sort((a, b) => dist[a] - dist[b] || a - b);
  const segmentLengthsM = feedOrder.map((hi, k) =>
    Math.max(MIN_SEGMENT_M, k === 0 ? dist[hi] : dist[hi] - dist[feedOrder[k - 1]]));
  return { feedOrder, segmentLengthsM, distFromFeed: dist };
}

// capacity only depends on the layout, so cache it
const capacityCache = new Map<string, Capacity>();

function capacityFor(base: Omit<SimInput, 'solar' | 'smartInverters'>): Capacity {
  const key = JSON.stringify([base.segmentLengthsM, base.upstreamImpedancePu]);
  const hit = capacityCache.get(key);
  if (hit) return hit;
  const off = { ...base, smartInverters: false };
  const on = { ...base, smartInverters: true };
  const cap: Capacity = {
    best: hostingCapacity(off, 'near'),
    worst: hostingCapacity(off, 'far'),
    bestSmart: hostingCapacity(on, 'near'),
    worstSmart: hostingCapacity(on, 'far'),
  };
  if (capacityCache.size > 100) capacityCache.clear();
  capacityCache.set(key, cap);
  return cap;
}

export const analyzeStreet: AnalyzeStreetFn = (model: StreetModel, opts: StreetOptions) => {
  const n = model.houses.length;
  if (n < 1) throw new Error('There are no houses to model.');
  const { feedOrder, segmentLengthsM, distFromFeed } = feedLayout(model, opts.feedEnd);
  const roomKw = roomKwFor(opts.utility);

  const baseFor = (kw: number) => ({
    numHomes: n,
    evCharging: emptyFlags(n),
    scenario: 'spring' as const,
    segmentLengthM: 40,
    segmentLengthsM,
    upstreamImpedancePu: upstreamForRoom(kw),
  });
  const base = baseFor(roomKw);

  const solarFeed = feedOrder.map(hi => !!opts.solar[hi]);
  const out = simulate({ ...base, solar: solarFeed, smartInverters: opts.smartInverters });
  const voltages: number[] = Array(n).fill(0);
  feedOrder.forEach((hi, k) => (voltages[hi] = out.voltages[k]));

  const capacity = capacityFor(base);
  const capacityByColor = opts.utility.kind === 'unknown'
    ? { red: capacityFor(baseFor(ROOM_KW.red)), yellow: capacityFor(baseFor(ROOM_KW.yellow)), green: capacityFor(baseFor(ROOM_KW.green)) }
    : undefined;

  let yourHome: ReturnType<AnalyzeStreetFn>['yourHome'] = null;
  const homeIdx = model.houses.findIndex(h => h.isUserHome);
  if (homeIdx >= 0) {
    const k = feedOrder.indexOf(homeIdx);
    const withHome = solarFeed.slice();
    withHome[k] = true;
    const off = simulate({ ...base, solar: withHome, smartInverters: false });
    const on = simulate({ ...base, solar: withHome, smartInverters: true });
    yourHome = {
      positionFromFeed: k + 1,
      distanceFromFeedM: Math.round(distFromFeed[homeIdx]),
      alreadySolar: !!opts.solar[homeIdx],
      withYours: { ok: off.maxV <= V_MAX && off.ok, maxV: off.maxV },
      withYoursSmart: { ok: on.maxV <= V_MAX && on.ok, maxV: on.maxV },
    };
  }

  return { voltages, out, feedOrder, roomKwUsed: roomKw, capacity, capacityByColor, yourHome };
};
