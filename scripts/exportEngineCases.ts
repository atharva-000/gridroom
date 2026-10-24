// dumps engine results for validation/validate.py (npm run export-validation)
import { writeFileSync } from 'node:fs';
import { simulate } from '../src/engine/realEngine';
import { type SimInput, emptyFlags } from '../src/engine/contract';

const n = 25;
const base: SimInput = { numHomes: n, solar: emptyFlags(n), evCharging: emptyFlags(n), scenario: 'spring', smartInverters: false, segmentLengthM: 40 };
const ev = emptyFlags(n); [3, 7, 11, 15, 18, 20, 22, 24].forEach(i => (ev[i] = true));

const cases = {
  spring_all_solar: { ...base, solar: Array(n).fill(true) },
  heatwave_no_solar: { ...base, scenario: 'heatwave' as const },
  evening_with_evs: { ...base, scenario: 'evening' as const, evCharging: ev },
};
const out: Record<string, { input: SimInput; voltages: number[]; loadKw: number[]; solarKw: number[] }> = {};
for (const [name, inp] of Object.entries(cases)) {
  const r = simulate(inp);
  out[name] = { input: inp, voltages: r.voltages, loadKw: r.loadKw, solarKw: r.solarKw };
}
writeFileSync(new URL('../validation/engine_cases.json', import.meta.url), JSON.stringify(out, null, 2));
console.log('Wrote validation/engine_cases.json');
