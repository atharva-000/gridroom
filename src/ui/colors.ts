const stops: [number, [number, number, number]][] = [
  [0.90, [31, 79, 191]],
  [0.95, [106, 167, 255]],
  [0.97, [47, 168, 79]],
  [1.03, [47, 168, 79]],
  [1.04, [232, 195, 29]],
  [1.05, [240, 138, 36]],
  [1.07, [217, 48, 37]],
];

export function voltageColor(v: number): string {
  if (!Number.isFinite(v)) return '#64748b';
  if (v <= stops[0][0]) return '#1f4fbf';
  if (v >= stops[stops.length - 1][0]) return '#d93025';
  for (let i = 0; i < stops.length - 1; i++) {
    const [left, a] = stops[i];
    const [right, b] = stops[i + 1];
    if (v <= right) {
      const t = (v - left) / (right - left);
      const rgb = a.map((channel, j) => Math.round(channel + t * (b[j] - channel)));
      return `#${rgb.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
    }
  }
  return '#2fa84f';
}
