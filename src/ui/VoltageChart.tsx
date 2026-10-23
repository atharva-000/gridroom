import { voltageColor } from './colors';

export function VoltageChart({ voltages }: { voltages: number[] }) {
  const width = 900;
  const height = 286;
  const left = 58;
  const right = 22;
  const top = 18;
  const bottom = 43;
  const x = (i: number) => left + (voltages.length === 1 ? 0 : (i / (voltages.length - 1)) * (width - left - right));
  const y = (v: number) => top + ((1.10 - v) / 0.20) * (height - top - bottom);
  const points = voltages.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Voltage by house; safe range 0.95 to 1.05 per unit" className="voltage-chart">
      <rect x={left} y={y(1.05)} width={width - left - right} height={y(0.95) - y(1.05)} fill="#e1f4e7" />
      {[0.90, 0.95, 1, 1.05, 1.10].map(tick => <g key={tick}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke={tick === 0.95 || tick === 1.05 ? '#238456' : '#d6dde3'} strokeDasharray={tick === 0.95 || tick === 1.05 ? '7 5' : 'none'} /><text x={left - 9} y={y(tick) + 4} fontSize="13" fill="currentColor" textAnchor="end">{tick.toFixed(2)}</text></g>)}
      <polyline fill="none" stroke="#0f766e" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points} />
      {voltages.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="4.7" fill={voltageColor(v)} stroke="#203b45" strokeWidth="1" />)}
      {voltages.map((_, i) => i % Math.max(1, Math.ceil(voltages.length / 13)) === 0 && <text key={i} x={x(i)} y={height - 18} fontSize="12" textAnchor="middle" fill="currentColor">{i + 1}</text>)}
      <text x={width / 2} y={height - 2} textAnchor="middle" fill="currentColor" fontSize="13">House number from feed point</text>
      <text x={width - right - 4} y={y(1.05) - 7} textAnchor="end" fill="#24784d" fontSize="12">Safe range</text>
    </svg>
  );
}
