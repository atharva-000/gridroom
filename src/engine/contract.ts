export type Scenario = 'spring' | 'heatwave' | 'evening';
export interface SimInput {
  numHomes: number;
  solar: boolean[];
  evCharging: boolean[];
  scenario: Scenario;
  smartInverters: boolean;
  segmentLengthM: number;
  segmentLengthsM?: number[];
  upstreamImpedancePu?: { r: number; x: number };
}
export interface SimOutput {
  voltages: number[];
  minV: number;
  maxV: number;
  tooHigh: number[];
  tooLow: number[];
  ok: boolean;
  reactiveKvar: number[];
  solarKw: number[];
  loadKw: number[];
  lossesKw: number;
  iterations: number;
  converged: boolean;
}
export const V_MIN = 0.95;
export const V_MAX = 1.05;
export const BASE_KVA = 100;
export const SOURCE_V = 1.02;
export const Z_PER_40M = { r: 0.004, x: 0.004 };
export type SimulateFn = (input: SimInput) => SimOutput;
export type HostingCapacityFn = (base: Omit<SimInput, 'solar'>, order: 'near' | 'far') => number;
export const emptyFlags = (n: number): boolean[] => Array(n).fill(false);
export function segmentImpedances(inp: SimInput): { r: number; x: number }[] {
  const lengths = inp.segmentLengthsM ?? Array(inp.numHomes).fill(inp.segmentLengthM);
  return lengths.map((L, k) => {
    const r = (Z_PER_40M.r * L) / 40;
    const x = (Z_PER_40M.x * L) / 40;
    if (k === 0 && inp.upstreamImpedancePu) {
      return { r: r + inp.upstreamImpedancePu.r, x: x + inp.upstreamImpedancePu.x };
    }
    return { r, x };
  });
}
