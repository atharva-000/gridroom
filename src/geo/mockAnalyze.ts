// stand-in for analyzeStreet, used while building the UI
import { simulate } from '../engine';
import type { AnalyzeStreetFn } from './types';
export const analyzeStreet: AnalyzeStreetFn = (m, o) => {
  const n = m.houses.length;
  const feedOrder = m.houses.map((_, i) => i);
  if (o.feedEnd === 'B') feedOrder.reverse();
  const out = simulate({
    numHomes: n, solar: feedOrder.map(i => o.solar[i]), evCharging: Array(n).fill(false),
    scenario: 'spring', smartInverters: o.smartInverters, segmentLengthM: m.lengthM / n,
  });
  const voltages: number[] = Array(n).fill(1);
  feedOrder.forEach((hi, k) => (voltages[hi] = out.voltages[k]));
  const cap = { best: n, worst: Math.floor(n / 2), bestSmart: n, worstSmart: Math.floor(n * 0.75) };
  return { voltages, out, feedOrder, roomKwUsed: 316, capacity: cap, yourHome: null };
};
