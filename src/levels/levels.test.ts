// make sure every level can actually be won with 3 stars
import { describe, it, expect } from 'vitest';
import { LEVELS } from './levels';
import { simulate } from '../engine';
import { type SimInput, emptyFlags } from '../engine/contract';

const L = (id: number) => LEVELS.find(l => l.id === id)!;
const input = (id: number, solar: number[], ev: number[], smart = false): SimInput => {
  const lv = L(id);
  const s = emptyFlags(lv.numHomes); solar.forEach(i => (s[i] = true));
  const e = emptyFlags(lv.numHomes); ev.forEach(i => (e[i] = true));
  return { numHomes: lv.numHomes, solar: s, evCharging: e, scenario: lv.scenario, smartInverters: smart, segmentLengthM: lv.segmentLengthM };
};
const first = (k: number) => [...Array(k).keys()];
const last = (k: number, n = 25) => [...Array(k).keys()].map(i => n - 1 - i);

describe('level star targets are reachable', () => {
  it('L1: 17 solar homes near the transformer is a 3-star win', () => {
    expect(simulate(input(1, first(L(1).stars[2]), [])).ok).toBe(true);
  });
  it('L1: 10 homes at the far end loses (teaches the lesson)', () => {
    expect(simulate(input(1, last(10), [])).ok).toBe(false);
  });
  it('L2: 14 solar homes near the transformer is a 3-star win', () => {
    expect(simulate(input(2, first(L(2).stars[2]), [])).ok).toBe(true);
  });
  it('L3: starts with low houses; 5 far-end solar homes fix it (3 stars)', () => {
    expect(simulate(input(3, [], [])).tooLow.length).toBeGreaterThan(0);
    expect(simulate(input(3, last(L(3).stars[2]), [])).ok).toBe(true);
  });
  it('L4: starts low; delaying the 2 farthest cars fixes it (3 stars)', () => {
    const ev = L(4).startEV;
    expect(simulate(input(4, [], ev)).ok).toBe(false);
    expect(simulate(input(4, [], ev.filter(i => i !== 22 && i !== 24))).ok).toBe(true);
  });
  it('L5: 19 homes is impossible without smart inverters (even in the best order)', () => {
    expect(simulate(input(5, first(19), [])).ok).toBe(false);
  });
  it('L5: 21 homes near the transformer with smart inverters is a 3-star win', () => {
    expect(simulate(input(5, first(L(5).stars[2]), [], true)).ok).toBe(true);
  });
});
