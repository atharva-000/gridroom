import { useMemo, useState } from 'react';
import { simulate } from '../engine';
import type { Level } from '../levels/levels';
import { StreetView } from './StreetView';
import { VoltageChart } from './VoltageChart';

const initial = (n: number, indexes: number[]) => Array.from({ length: n }, (_, i) => indexes.includes(i));

type Props = { level: Level; onBack: () => void; onNext?: () => void };

export function PlayScreen({ level, onBack, onNext }: Props) {
  const [solar, setSolar] = useState(() => initial(level.numHomes, level.startSolar));
  const [evCharging, setEvCharging] = useState(() => initial(level.numHomes, level.startEV));
  const [smartInverters, setSmartInverters] = useState(false);
  const [moves, setMoves] = useState(0);
  const [engineerView, setEngineerView] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [checked, setChecked] = useState(false);

  const out = useMemo(() => simulate({ numHomes: level.numHomes, solar, evCharging, smartInverters, scenario: level.scenario, segmentLengthM: level.segmentLengthM }), [level, solar, evCharging, smartInverters]);
  const countSolar = solar.filter(Boolean).length;
  const delays = level.startEV.filter(i => !evCharging[i]).length;
  const solved = out.ok && (level.goal !== 'maxSolar' || countSolar >= level.stars[0]);
  const score = !solved ? 0 : level.goal === 'maxSolar'
    ? level.stars.filter(target => countSolar >= target).length
    : level.goal === 'fixLowWithSolar'
      ? level.stars.filter(target => countSolar <= target).length
      : level.stars.filter(target => delays <= target).length;

  const tap = (i: number) => {
    if (level.action === 'toggleSolar') setSolar(old => old.map((v, index) => index === i ? !v : v));
    else if (level.startEV.includes(i)) setEvCharging(old => old.map((v, index) => index === i ? !v : v));
    else return;
    setMoves(v => v + 1);
    setChecked(false);
  };

  const reset = () => {
    setSolar(initial(level.numHomes, level.startSolar));
    setEvCharging(initial(level.numHomes, level.startEV));
    setSmartInverters(false);
    setMoves(0);
    setChecked(false);
  };

  const status = !out.converged ? "Solver didn't settle. Try a different setup." : out.ok
    ? 'All houses in the safe range ✓'
    : `${out.tooHigh.length} house(s) too high ▲ · ${out.tooLow.length} house(s) too low ▼`;

  return (
    <main className="page">
      <header className="game-header"><button onClick={onBack}>← Back</button><div><h1>{level.name}</h1><p>{level.goalText}</p></div><div className="counters"><span>Moves: {moves}</span><span aria-label={`${score} out of 3 stars`}>{'★'.repeat(score)}{'☆'.repeat(3 - score)}</span></div></header>
      <div className="scenario">{level.scenario === 'spring' ? '☀️ Sunny spring noon' : level.scenario === 'heatwave' ? '🔥 Heat wave afternoon' : '🚗 Evening rush'}</div>
      <section className="panel"><h2>Neighborhood grid</h2><p className="muted">Tap a house to {level.action === 'toggleSolar' ? 'add or remove solar' : 'delay or restore EV charging'}.</p><StreetView out={out} solar={solar} evCharging={evCharging} onHouseClick={tap} engineerView={engineerView}/></section>
      <section className="panel"><h2>Voltage along the street</h2><VoltageChart voltages={out.voltages}/></section>
      <section className="panel controls"><div className="button-row">{level.smartInvertersAllowed && <label className="toggle"><input type="checkbox" checked={smartInverters} onChange={e => { setSmartInverters(e.target.checked); setChecked(false); }}/> Smart inverters</label>}<label className="toggle"><input type="checkbox" checked={engineerView} onChange={e => setEngineerView(e.target.checked)}/> Engineer view</label><button onClick={reset}>Reset</button><button onClick={() => setHintVisible(v => !v)}>Hint</button></div>{hintVisible && <p>{level.hint}</p>}{engineerView && <p className="data">Min: {out.minV.toFixed(4)} pu · Max: {out.maxV.toFixed(4)} pu · Losses: {out.lossesKw.toFixed(3)} kW · Iterations: {out.iterations}</p>}<div className="status-row"><strong>{status}</strong><button className="primary" onClick={() => setChecked(true)}>Check</button></div>{checked && <div className="result" role="status"><h2>{solved ? `Success! ${'★'.repeat(score)}` : 'Not yet'}</h2><p>{solved ? level.lesson : out.tooHigh.length ? `${out.tooHigh.length} houses are still too high.` : out.tooLow.length ? `${out.tooLow.length} houses are still too low.` : level.goalText}</p><div className="button-row"><button onClick={reset}>Retry</button>{solved && onNext && <button className="primary" onClick={onNext}>Next level</button>}<button onClick={onBack}>Level select</button></div></div>}</section>
    </main>
  );
}
