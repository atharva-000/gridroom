import type { StreetModel } from './types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function manualStreetModel(numHomes: number, lengthM: number): StreetModel {
  const n = Math.round(clamp(numHomes, 3, 60));
  const L = clamp(lengthM, 50, 1500);
  const home = Math.floor(n / 2);
  return {
    streetName: 'Street entered by hand',
    townLabel: '',
    line: [],
    lengthM: L,
    houses: Array.from({ length: n }, (_, i) => ({
      id: `manual-${i}`,
      distAlongM: ((i + 0.5) * L) / n,
      isUserHome: i === home,
    })),
    feedEnd: 'A',
    source: 'manual',
    warnings: [],
  };
}
