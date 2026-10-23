import { SimInput, SimOutput, SimulateFn, HostingCapacityFn, V_MIN, V_MAX, BASE_KVA, SOURCE_V, segmentImpedances } from './contract';
const LOAD = { spring: [0.8, 0.25], heatwave: [3.5, 1.4], evening: [2.5, 0.6] } as const;
const SOLAR = { spring: 6.0, heatwave: 4.5, evening: 0 } as const;
const EV_KW = 7.2;
export const simulate: SimulateFn = (inp: SimInput): SimOutput => {
  const n = inp.numHomes;
  const z = segmentImpedances(inp);
  const [pL, qL] = LOAD[inp.scenario];
  const loadKw = Array.from({ length: n }, (_, i) => pL + (inp.evCharging[i] ? EV_KW : 0));
  const solarKw = Array.from({ length: n }, (_, i) => inp.solar[i] ? SOLAR[inp.scenario] : 0);
  const voltages: number[] = [];
  let v = SOURCE_V;
  for (let k = 0; k < n; k++) {
    let pDown = 0, qDown = 0;
    for (let j = k; j < n; j++) { pDown += loadKw[j] - solarKw[j]; qDown += qL; }
    let dv = (z[k].r * pDown + z[k].x * qDown) / BASE_KVA;
    if (inp.smartInverters && dv < 0) dv *= 0.7;
    v -= dv;
    voltages.push(v);
  }
  const tooHigh = voltages.flatMap((vv, i) => vv > V_MAX ? [i] : []);
  const tooLow = voltages.flatMap((vv, i) => vv < V_MIN ? [i] : []);
  return { voltages, minV: Math.min(...voltages), maxV: Math.max(...voltages), tooHigh, tooLow,
    ok: tooHigh.length === 0 && tooLow.length === 0, reactiveKvar: Array(n).fill(0), solarKw,
    loadKw, lossesKw: 0, iterations: 1, converged: true };
};
export const hostingCapacity: HostingCapacityFn = (base, order) => {
  const n = base.numHomes;
  const idx = [...Array(n).keys()];
  if (order === 'far') idx.reverse();
  let best = 0;
  for (let k = 0; k <= n; k++) {
    const solar = Array(n).fill(false);
    idx.slice(0, k).forEach(i => solar[i] = true);
    if (simulate({ ...base, solar }).maxV <= V_MAX) best = k; else break;
  }
  return best;
};
