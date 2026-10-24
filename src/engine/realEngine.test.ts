import { describe, it, expect } from 'vitest';
import { simulate, hostingCapacity, voltVarFraction } from './realEngine';
import { type SimInput, emptyFlags } from './contract';

const base = (over: Partial<SimInput> = {}): SimInput => {
  const n = over.numHomes ?? 25;
  return {
    numHomes: n, solar: emptyFlags(n), evCharging: emptyFlags(n),
    scenario: 'spring', smartInverters: false, segmentLengthM: 40, ...over,
  };
};
const flags = (n: number, on: number[]) => { const f = emptyFlags(n); on.forEach(i => (f[i] = true)); return f; };
const all = (n: number) => Array(n).fill(true);
const hcBase = (over: Partial<SimInput> = {}) => { const { solar: _s, ...rest } = base(over); return rest; };
const near = (x: number, y: number, tol = 0.002) => expect(Math.abs(x - y)).toBeLessThanOrEqual(tol);

describe('power flow (no smart inverters)', () => {
  it('heat wave, 40 m, no solar → min ≈ 0.954', () => {
    near(simulate(base({ scenario: 'heatwave' })).minV, 0.954);
  });
  it('spring, all solar → max ≈ 1.079', () => {
    near(simulate(base({ solar: all(25) })).maxV, 1.079);
  });
  it('heat wave, 60 m, no solar → min ≈ 0.917', () => {
    near(simulate(base({ scenario: 'heatwave', segmentLengthM: 60 })).minV, 0.917);
  });
  it('evening with 8 EVs → min ≈ 0.937', () => {
    near(simulate(base({ scenario: 'evening', evCharging: flags(25, [3, 7, 11, 15, 18, 20, 22, 24]) })).minV, 0.937);
  });
  it('evening, EVs at 22 and 24 delayed → min ≈ 0.953', () => {
    near(simulate(base({ scenario: 'evening', evCharging: flags(25, [3, 7, 11, 15, 18, 20]) })).minV, 0.953);
  });
  it('segmentLengthsM of all 40 m equals segmentLengthM 40', () => {
    const a = simulate(base({ solar: all(25) }));
    const b = simulate(base({ solar: all(25), segmentLengthsM: Array(25).fill(40) }));
    a.voltages.forEach((v, i) => expect(v).toBeCloseTo(b.voltages[i], 12));
  });
  it('voltage drops along the street when there is no solar', () => {
    const v = simulate(base({ scenario: 'heatwave' })).voltages;
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeLessThan(v[i - 1]);
  });
  it('reports losses and converges', () => {
    const out = simulate(base({ scenario: 'heatwave' }));
    expect(out.converged).toBe(true);
    expect(out.lossesKw).toBeGreaterThan(0);
  });
});

describe('volt/VAR', () => {
  it('curve points match IEEE 1547 Category B', () => {
    expect(voltVarFraction(0.90)).toBeCloseTo(0.44);
    expect(voltVarFraction(1.00)).toBe(0);
    expect(voltVarFraction(1.05)).toBeCloseTo(-0.22);
    expect(voltVarFraction(1.10)).toBeCloseTo(-0.44);
  });
  it('spring, all solar, smart on → max ≈ 1.058 and converged', () => {
    const out = simulate(base({ solar: all(25), smartInverters: true }));
    near(out.maxV, 1.058);
    expect(out.converged).toBe(true);
    expect(Math.min(...out.reactiveKvar)).toBeLessThan(0); // inverters absorb when voltage is high
  });
});

describe('hosting capacity', () => {
  it('40 m, smart off → far 9, near 18', () => {
    expect(hostingCapacity(hcBase(), 'far')).toBe(9);
    expect(hostingCapacity(hcBase(), 'near')).toBe(18);
  });
  it('40 m, smart on → far 13, near 21', () => {
    expect(hostingCapacity(hcBase({ smartInverters: true }), 'far')).toBe(13);
    expect(hostingCapacity(hcBase({ smartInverters: true }), 'near')).toBe(21);
  });
  it('60 m, smart off → far 6, near 16', () => {
    expect(hostingCapacity(hcBase({ segmentLengthM: 60 }), 'far')).toBe(6);
    expect(hostingCapacity(hcBase({ segmentLengthM: 60 }), 'near')).toBe(16);
  });
  it('heat wave hosting capacity is not 0 just because of low voltage', () => {
    expect(hostingCapacity(hcBase({ scenario: 'heatwave', segmentLengthM: 60 }), 'near')).toBeGreaterThan(0);
  });
  it('15 homes × 20 m, upstream 0.06 (PSE&G red)', () => {
    const b = hcBase({ numHomes: 15, segmentLengthsM: Array(15).fill(20), upstreamImpedancePu: { r: 0.06, x: 0.06 } });
    expect(hostingCapacity(b, 'near')).toBe(10);
    expect(hostingCapacity({ ...b, smartInverters: true }, 'near')).toBe(13);
    expect(hostingCapacity(b, 'far')).toBe(8);
    expect(hostingCapacity({ ...b, smartInverters: true }, 'far')).toBe(12);
  });
  it('25 homes × 20 m, upstream 0.009494 (PSE&G yellow)', () => {
    const b = hcBase({ segmentLengthsM: Array(25).fill(20), upstreamImpedancePu: { r: 0.009494, x: 0.009494 } });
    expect(hostingCapacity(b, 'near')).toBe(21);
    expect(hostingCapacity({ ...b, smartInverters: true }, 'near')).toBe(25);
    expect(hostingCapacity(b, 'far')).toBe(15);
    expect(hostingCapacity({ ...b, smartInverters: true }, 'far')).toBe(25);
  });
});

describe('speed', () => {
  it('60 homes, all solar, smart on runs in under 20 ms', () => {
    const inp = base({ numHomes: 60, solar: all(60), smartInverters: true, segmentLengthM: 20 });
    simulate(inp); // warm up
    const t0 = performance.now();
    const out = simulate(inp);
    expect(performance.now() - t0).toBeLessThan(20);
    expect(out.voltages).toHaveLength(60);
  });
});
