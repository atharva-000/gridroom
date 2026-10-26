import type { SimOutput } from '../engine/contract';
import { V_MIN, V_MAX } from '../engine/contract';
import { voltageColor } from './colors';

interface Props {
  out: SimOutput;
  solar: boolean[];
  evCharging: boolean[];
  onHouseClick: (index: number) => void;
  engineerView: boolean;
  userHomeIndex?: number;
}

export function StreetView({ out, solar, evCharging, onHouseClick, engineerView, userHomeIndex }: Props) {
  const n = out.voltages.length;
  const step = 52;
  const width = 142 + n * step;
  return (
    <div className="street-scroll">
      <svg viewBox={`0 0 ${width} 194`} width={width} height={194} role="group" aria-label="Interactive houses on the electrical distribution street">
        <rect x="8" y="57" width="102" height="57" rx="6" fill="#f4f6f8" stroke="#cdced1" strokeWidth="1" />
        <text x="59" y="79" textAnchor="middle" fontSize="11" fontWeight="600" fill="#131416">Transformer</text>
        <text x="59" y="94" textAnchor="middle" fontSize="10" fill="#5d5f60">power comes in</text>
        <path d={`M110 116 H${width - 19}`} stroke="#8b8f93" strokeWidth="3" />
        {out.voltages.map((v, i) => {
          const x = 136 + i * step;
          const badHigh = v > V_MAX;
          const badLow = v < V_MIN;
          return (
            <g key={i} role="button" tabIndex={0} aria-label={`House ${i + 1}: voltage ${v.toFixed(3)}, solar ${solar[i] ? 'on' : 'off'}, EV charging ${evCharging[i] ? 'on' : 'off'}`} onClick={() => onHouseClick(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onHouseClick(i); } }} style={{ cursor: 'pointer', outline: 'none' }}>
              <rect x={x - 18} y="64" width="37" height="49" rx="3" fill={voltageColor(v)} stroke="#384b57" strokeWidth="1.5" />
              <path d={`M${x - 23} 64 L${x} 42 L${x + 23} 64 Z`} fill="#334e68" />
              <rect x={x - 4} y="89" width="10" height="24" fill="#eff6ff" />
              {solar[i] && <g><path d={`M${x - 11} 55 L${x + 6} 55 L${x + 12} 63 L${x - 16} 63 Z`} fill="#123e86" stroke="#d7f3ff" strokeWidth="1" /><path d={`M${x - 1} 55 L${x + 1} 63 M${x - 10} 59 L${x + 8} 59`} stroke="#9dc7e5" strokeWidth="0.8" /></g>}
              {evCharging[i] && <g aria-hidden="true"><path d={`M${x - 13} 136 v-6 l4 -6 h16 l4 6 v6 z`} fill="#1b6c80" /><circle cx={x - 7} cy="137" r="2.6" fill="#131416" /><circle cx={x + 7} cy="137" r="2.6" fill="#131416" /></g>}
              {(badHigh || badLow) && <text x={x} y="33" textAnchor="middle" fontSize="18" fontWeight="bold" fill={badHigh ? '#b91c1c' : '#1e40af'}>{badHigh ? '▲' : '▼'}</text>}
              {userHomeIndex === i && <circle cx={x + 16} cy="40" r="4" fill="#131416" />}
              <text x={x} y="159" textAnchor="middle" fontSize="11" fill="currentColor">{i + 1}</text>
              {engineerView && <text x={x} y="174" textAnchor="middle" fontSize="10" fill="currentColor">{v.toFixed(3)}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
