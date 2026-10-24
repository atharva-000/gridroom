// fake street for UI work
import type { StreetModel } from './types';
export const MOCK_STREET: StreetModel = (() => {
  const n = 18, spacing = 22, mLat = 110540, mLon = 111320;
  const len = n * spacing + 20;
  return {
    streetName: 'Mock Street (fake data)', townLabel: 'Test, NJ',
    line: [{ lat: 0, lon: 0 }, { lat: 0, lon: len / mLon }],
    lengthM: len,
    houses: Array.from({ length: n }, (_, i) => {
      const d = 10 + i * spacing;
      return { id: `mock-${i}`, position: { lat: (i % 2 ? -18 : 18) / mLat, lon: d / mLon }, distAlongM: d, isUserHome: i === 9 };
    }),
    feedEnd: 'A', source: 'mock', warnings: [],
  };
})();
