import type { StreetModel } from '../geo/types';
import { V_MAX, V_MIN } from '../engine/contract';
import { toXY } from '../geo/geometry';
import { voltageColor } from './colors';

const W = 900;
const PAD = 40;
const MIN_GAP = 30; // px between houses on the same side in strip view

type Pt = { x: number; y: number };

type Props = {
  model: StreetModel;
  feedEnd: 'A' | 'B';
  voltages?: number[];           // per house, same order as model.houses
  solar?: boolean[];
  onHouseClick?: (index: number) => void;
  showValues?: boolean;
};

function nearestGap(points: Pt[]) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      best = Math.min(best, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
  return best;
}

// True map shape: fine for short streets where houses don't overlap.
function mapLayout(model: StreetModel) {
  const H = 380;
  const origin = model.line[0];
  const raw = [...model.line, ...model.houses.map(h => h.position!)].map(p => toXY(p, origin));
  const xs = raw.map(p => p.x), ys = raw.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((W - 2 * PAD) / Math.max(maxX - minX, 1), (H - 2 * PAD) / Math.max(maxY - minY, 1));
  const offX = (W - (maxX - minX) * scale) / 2, offY = (H - (maxY - minY) * scale) / 2;
  const placed = raw.map(p => ({ x: offX + (p.x - minX) * scale, y: H - (offY + (p.y - minY) * scale) }));
  return { width: W, height: H, line: placed.slice(0, model.line.length), houses: placed.slice(model.line.length) };
}

// Which side of the street a house is on (+1 / -1), from its map position.
function sideOf(model: StreetModel, i: number): number {
  const pos = model.houses[i].position;
  if (!pos || model.line.length < 2) return i % 2 === 0 ? 1 : -1;
  const origin = model.line[0];
  const P = toXY(pos, origin);
  let best = Infinity, side = 1;
  for (let k = 1; k < model.line.length; k++) {
    const A = toXY(model.line[k - 1], origin), B = toXY(model.line[k], origin);
    const dx = B.x - A.x, dy = B.y - A.y, len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2));
    const d = Math.hypot(P.x - (A.x + t * dx), P.y - (A.y + t * dy));
    if (d < best) { best = d; side = dx * (P.y - A.y) - dy * (P.x - A.x) >= 0 ? 1 : -1; }
  }
  return side;
}

// Straightened street: houses in their real order, nudged apart so none overlap.
function stripLayout(model: StreetModel) {
  const H = 220;
  const scale = (W - 2 * PAD) / Math.max(model.lengthM, 1);
  const lastX: Record<number, number> = { 1: -Infinity, [-1]: -Infinity };
  const houses = model.houses.map((h, i) => {
    const side = sideOf(model, i);
    const x = Math.max(PAD + h.distAlongM * scale, lastX[side] + MIN_GAP);
    lastX[side] = x;
    return { x, y: H / 2 - side * 42 };
  });
  const width = Math.max(W, Math.max(...houses.map(p => p.x)) + PAD);
  return { width, height: H, line: [{ x: 18, y: H / 2 }, { x: width - 18, y: H / 2 }], houses };
}

export function StreetMap({ model, feedEnd, voltages, solar, onHouseClick, showValues }: Props) {
  const canMap = model.line.length >= 2 && model.houses.every(h => h.position);
  let layout = canMap ? mapLayout(model) : null;
  if (!layout || nearestGap(layout.houses) < 20) layout = stripLayout(model);
  const { width, height, line, houses } = layout;
  const hitR = Math.max(8, Math.min(16, nearestGap(houses) / 2));

  const endA = line[0];
  const endB = line[line.length - 1];
  const feed = feedEnd === 'A' ? endA : endB;
  const other = feedEnd === 'A' ? endB : endA;
  const lx = feed.x + (other.x < feed.x ? -34 : 34); // keep the label inside the map
  const strip = width !== W || height !== 380;

  return (
    <div className="street-map-wrap">
      {strip && model.line.length >= 2 && <p className="muted small map-note">Houses shown in order along the street; spacing is stretched where houses are close together.</p>}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="street-map"
        style={width > W ? { width, maxWidth: 'none' } : undefined}
        role="group"
        aria-label={`Map of ${model.streetName}`}
      >
        <polyline points={line.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#c5ced3" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={line.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#526570" strokeWidth="2" strokeDasharray="6 6" />
        {[{ p: endA, label: 'A' }, { p: endB, label: 'B' }].map(({ p, label }) => (
          <g key={label}>
            <circle cx={p.x} cy={p.y} r="14" fill="#fff" stroke="#395b62" strokeWidth="2" />
            <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill="#263238">{label}</text>
          </g>
        ))}
        <g aria-hidden="true">
          <rect x={lx - 26} y={feed.y - 34} width="52" height="18" rx="4" fill="#131416" />
          <text x={lx} y={feed.y - 21} textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff">power in</text>
        </g>

        {model.houses.map((house, i) => {
          const p = houses[i];
          const v = voltages?.[i];
          const fill = v === undefined ? '#cbd5da' : voltageColor(v);
          const high = v !== undefined && v > V_MAX;
          const low = v !== undefined && v < V_MIN;
          return (
            <g
              key={house.id}
              role={onHouseClick ? 'button' : undefined}
              tabIndex={onHouseClick ? 0 : undefined}
              aria-label={`House ${i + 1}${house.isUserHome ? ' (home)' : ''}${v !== undefined ? `, voltage ${v.toFixed(3)}` : ''}${solar?.[i] ? ', has solar' : ''}`}
              onClick={() => onHouseClick?.(i)}
              onKeyDown={e => { if (onHouseClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onHouseClick(i); } }}
              style={{ cursor: onHouseClick ? 'pointer' : 'default' }}
            >
              <circle cx={p.x} cy={p.y} r={hitR} fill="transparent" />
              <circle cx={p.x} cy={p.y} r={house.isUserHome ? 10 : 8} fill={fill} stroke={house.isUserHome ? '#111827' : '#384b57'} strokeWidth={house.isUserHome ? 3 : 1.2} />
              {solar?.[i] && <rect x={p.x - 6} y={p.y - 18} width="12" height="5" rx="1" fill="#123e86" />}
              {(high || low) && <text x={p.x + 10} y={p.y - 8} fontSize="12" fontWeight="bold" fill={high ? '#b91c1c' : '#1e40af'}>{high ? '▲' : '▼'}</text>}
              {house.isUserHome && <text x={p.x} y={p.y + 24} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#111827">home</text>}
              {showValues && v !== undefined && <text x={p.x} y={p.y + (house.isUserHome ? 36 : 22)} textAnchor="middle" fontSize="9" fill="#334155">{v.toFixed(3)}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
