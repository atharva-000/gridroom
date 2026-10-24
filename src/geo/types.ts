import type { SimOutput } from '../engine/contract';

export interface LatLng { lat: number; lon: number }

export interface GeocodeResult {
  lat: number; lon: number;
  road: string;
  houseNumber?: string;
  townLabel: string;
}

export interface OsmWay {
  type: 'way'; id: number; nodes: number[];
  geometry: LatLng[]; tags?: Record<string, string>;
}
export interface OverpassResponse { elements: OsmWay[] }

export interface StreetLine {
  name: string;
  wayIds: number[];
  points: LatLng[];          // end A = points[0], end B = last point
  lengthM: number;
  endARank: number;          // 0 = dead end
  endBRank: number;
  warnings: string[];
}

export interface StreetHouse {
  id: string;                // "osm-<wayId>" or "manual-<i>"
  position?: LatLng;         // missing for manual streets
  distAlongM: number;        // distance from end A along the street
  isUserHome: boolean;
}

export interface StreetModel {
  streetName: string;
  townLabel: string;
  line: LatLng[];            // empty for manual streets
  lengthM: number;
  houses: StreetHouse[];     // sorted by distAlongM
  feedEnd: 'A' | 'B';        // suggested end where power comes in
  source: 'osm' | 'manual' | 'sample' | 'mock';
  warnings: string[];
}

export type UtilityInput =
  | { kind: 'pseg'; color: 'red' | 'yellow' | 'green' }
  | { kind: 'jcpl'; kw: number }
  | { kind: 'unknown' };

export interface StreetOptions {
  feedEnd: 'A' | 'B';
  utility: UtilityInput;
  solar: boolean[];          // indexed like model.houses
  smartInverters: boolean;
}

export interface Capacity { best: number; worst: number; bestSmart: number; worstSmart: number }

export interface StreetAnalysis {
  voltages: number[];        // indexed like model.houses
  out: SimOutput;            // raw engine output, in feed order
  feedOrder: number[];       // feedOrder[k] = model.houses index of k-th house from the feed point
  roomKwUsed: number;
  capacity: Capacity;
  // only when utility is unknown
  capacityByColor?: { red: Capacity; yellow: Capacity; green: Capacity };
  yourHome: null | {
    positionFromFeed: number;          // 1 = first house
    distanceFromFeedM: number;
    alreadySolar: boolean;
    withYours: { ok: boolean; maxV: number };       // marked solar + solar on the home
    withYoursSmart: { ok: boolean; maxV: number };  // same, smart inverters on
  };
}

export type AnalyzeStreetFn = (model: StreetModel, opts: StreetOptions) => StreetAnalysis;
