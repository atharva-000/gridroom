// Radial feeder power flow (per-unit, 100 kVA base).
// House 0 is next to the source, house n-1 is the far end.

import {
  type SimInput, type SimOutput, type SimulateFn, type HostingCapacityFn,
  V_MIN, V_MAX, BASE_KVA, SOURCE_V, segmentImpedances,
} from './contract';
import { type Complex, c, sub, mul, div, conj, abs, add } from './complex';

// per-house kW / kvar
export const LOAD_KW = { spring: 0.8, heatwave: 3.5, evening: 2.5 } as const;
export const LOAD_KVAR = { spring: 0.25, heatwave: 1.4, evening: 0.6 } as const;
export const SOLAR_KW = { spring: 6.0, heatwave: 4.5, evening: 0 } as const;
export const EV_KW = 7.2;
export const INVERTER_KVA = 7.2;

const PF_TOL = 1e-9;
const PF_MAX_ITERS = 100;
const VV_DAMPING = 0.3; // without damping the inverters overshoot and V oscillates
const VV_TOL_KVAR = 1e-4;
const VV_MAX_ITERS = 80;

// IEEE 1547-2018 Cat B default curve. Returns Q / S_rated, + = inject, - = absorb
export function voltVarFraction(v: number): number {
  const pts: [number, number][] = [[0.92, 0.44], [0.98, 0], [1.02, 0], [1.08, -0.44]];
  if (v <= pts[0][0]) return pts[0][1];
  if (v >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [v1, q1] = pts[i];
    const [v2, q2] = pts[i + 1];
    if (v >= v1 && v <= v2) return q1 + ((q2 - q1) * (v - v1)) / (v2 - v1);
  }
  return 0;
}

interface SweepResult { V: Complex[]; J: Complex[]; iterations: number; converged: boolean }

// backward/forward sweep. pNet/qNet = net draw per house (negative = exporting)
function sweep(
  z: Complex[], pNet: number[], qNet: number[], vStart: Complex[],
): SweepResult {
  const n = z.length;
  const source = c(SOURCE_V);
  const S = pNet.map((p, i) => c(p / BASE_KVA, qNet[i] / BASE_KVA));
  let V = vStart.slice();
  let J: Complex[] = Array(n).fill(c(0));

  for (let it = 1; it <= PF_MAX_ITERS; it++) {
    // backward: I = conj(S/V), J[k] = sum of currents past segment k
    const I = S.map((s, i) => conj(div(s, V[i])));
    J = Array(n);
    let running = c(0);
    for (let k = n - 1; k >= 0; k--) {
      running = add(running, I[k]);
      J[k] = running;
    }

    // forward: drop z*J along the line
    const Vnew: Complex[] = Array(n);
    let prev = source;
    let maxChange = 0;
    for (let k = 0; k < n; k++) {
      prev = sub(prev, mul(z[k], J[k]));
      Vnew[k] = prev;
      maxChange = Math.max(maxChange, abs(sub(Vnew[k], V[k])));
    }
    V = Vnew;
    if (maxChange < PF_TOL) return { V, J, iterations: it, converged: true };
  }
  return { V, J, iterations: PF_MAX_ITERS, converged: false };
}

export const simulate: SimulateFn = (inp: SimInput): SimOutput => {
  const n = inp.numHomes;
  const zList = segmentImpedances(inp).map(s => c(s.r, s.x));

  const loadKw = Array.from({ length: n }, (_, i) => LOAD_KW[inp.scenario] + (inp.evCharging[i] ? EV_KW : 0));
  const loadKvar = Array.from({ length: n }, () => LOAD_KVAR[inp.scenario]);
  const solarKw = Array.from({ length: n }, (_, i) => (inp.solar[i] ? SOLAR_KW[inp.scenario] : 0));
  const pNet = loadKw.map((p, i) => p - solarKw[i]);

  // inverter Q in kvar (+ = inject)
  let qInv: number[] = Array(n).fill(0);
  let V: Complex[] = Array(n).fill(c(SOURCE_V));
  let totalIters = 0;
  let converged = true;

  const run = () => {
    const qNet = loadKvar.map((q, i) => q - qInv[i]);
    const r = sweep(zList, pNet, qNet, V);
    V = r.V;
    totalIters += r.iterations;
    if (!r.converged) converged = false;
    return r;
  };

  let result = run();

  if (inp.smartInverters) {
    // Q limit from the inverter kVA rating
    const qLimit = solarKw.map(p => Math.sqrt(Math.max(INVERTER_KVA ** 2 - p ** 2, 0)));
    let settled = false;
    for (let round = 0; round < VV_MAX_ITERS; round++) {
      let maxStep = 0;
      const next = qInv.map((q, i) => {
        if (!inp.solar[i]) return 0;
        const target = Math.max(-qLimit[i], Math.min(qLimit[i], voltVarFraction(abs(V[i])) * INVERTER_KVA));
        const step = VV_DAMPING * (target - q);
        maxStep = Math.max(maxStep, Math.abs(step));
        return q + step;
      });
      qInv = next;
      result = run();
      if (maxStep < VV_TOL_KVAR) { settled = true; break; }
    }
    if (!settled) converged = false;
  }

  const voltages = result.V.map(abs);
  const lossesKw = result.J.reduce((sum, j, k) => sum + zList[k].re * abs(j) ** 2 * BASE_KVA, 0);
  const tooHigh = voltages.flatMap((v, i) => (v > V_MAX ? [i] : []));
  const tooLow = voltages.flatMap((v, i) => (v < V_MIN ? [i] : []));

  return {
    voltages,
    minV: Math.min(...voltages),
    maxV: Math.max(...voltages),
    tooHigh,
    tooLow,
    ok: tooHigh.length === 0 && tooLow.length === 0,
    reactiveKvar: qInv.slice(),
    solarKw,
    loadKw,
    lossesKw,
    iterations: totalIters,
    converged,
  };
};

// add solar one house at a time until something goes over V_MAX
export const hostingCapacity: HostingCapacityFn = (base, order) => {
  const n = base.numHomes;
  const idx = [...Array(n).keys()];
  if (order === 'far') idx.reverse();
  const solar = Array(n).fill(false);
  let best = 0;
  if (simulate({ ...base, solar }).maxV > V_MAX) return 0;
  for (let k = 1; k <= n; k++) {
    solar[idx[k - 1]] = true;
    if (simulate({ ...base, solar: solar.slice() }).maxV <= V_MAX) best = k;
    else break;
  }
  return best;
};
