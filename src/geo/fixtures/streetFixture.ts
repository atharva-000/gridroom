// test data placed in meters around a made-up origin
import type { GeocodeResult, LatLng, OsmWay, OverpassResponse } from '../types';
import { fromXY } from '../geometry';

export const ORIGIN: LatLng = { lat: 40.0, lon: -75.0 };
export const at = (x: number, y: number): LatLng => fromXY({ x, y }, ORIGIN);

export const way = (id: number, nodes: number[], xy: [number, number][], tags: Record<string, string>): OsmWay => ({
  type: 'way', id, nodes, geometry: xy.map(([x, y]) => at(x, y)), tags,
});

/** Square footprint centered at (x, y), w × h meters, closed like OSM ways. */
export const building = (id: number, x: number, y: number, tags: Record<string, string>, w = 10, h = 12): OsmWay => {
  const pts: [number, number][] = [
    [x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2], [x - w / 2, y - h / 2],
  ];
  return way(id, [id * 10, id * 10 + 1, id * 10 + 2, id * 10 + 3, id * 10], pts, tags);
};

/**
 * "Maple Lane": 400 m, east–west along y = 0, in two pieces.
 *   way 1: nodes 1→2→3, x = 0 → 200
 *   way 2: nodes 5→4→3, x = 400 → 200 (stored backwards, so stitching must flip it)
 * "Main Street" (tertiary) crosses at x = 0 through node 1. The x = 400 end (node 5) is a dead end.
 */
export const STREETS: OverpassResponse = {
  elements: [
    way(1, [1, 2, 3], [[0, 0], [100, 0], [200, 0]], { highway: 'residential', name: 'Maple Lane' }),
    way(2, [5, 4, 3], [[400, 0], [300, 0], [200, 0]], { highway: 'residential', name: 'Maple Lane' }),
    way(10, [11, 1, 12], [[0, -300], [0, 0], [0, 300]], { highway: 'tertiary', name: 'Main Street' }),
    way(20, [21, 22], [[600, 500], [700, 500]], { highway: 'residential', name: 'Oak Court' }),
  ],
};

/** Same street plus a branch of Maple Lane at node 3 that turns 45°. */
export const STREETS_WITH_BRANCH: OverpassResponse = {
  elements: [
    ...STREETS.elements,
    way(3, [3, 6], [[200, 0], [300, 100]], { highway: 'residential', name: 'Maple Lane' }),
  ],
};

export const GEO: GeocodeResult = { ...at(180, 20), road: 'Maple Lane', houseNumber: '18', townLabel: 'Testville, NJ' };

/** Houses every 40 m on both sides (x = 20, 60, …, 380), plus things that must be filtered out. */
export const BUILDINGS: OverpassResponse = {
  elements: [
    ...Array.from({ length: 10 }, (_, i) => building(100 + i, 20 + i * 40, 20, { building: 'house' })),
    ...Array.from({ length: 10 }, (_, i) => building(200 + i, 20 + i * 40, -20, { building: 'yes' })),
    building(300, 100, 32, { building: 'yes' }, 4, 5),                         // 20 m² shed → out
    building(301, 150, 80, { building: 'house' }),                            // 80 m from street → out
    building(302, 40, 22, { building: 'house', 'addr:street': 'Main Street' }), // faces another street → out
    building(303, 300, 30, { building: 'apartments' }, 20, 20),               // apartments → out + warning
  ],
};
