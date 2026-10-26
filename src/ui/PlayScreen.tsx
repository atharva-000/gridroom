import { useMemo, useState } from 'react';
import { simulate } from '../engine';
import type { Level } from '../levels/levels';
import { StreetView } from './StreetView';
import { VoltageChart } from './VoltageChart';
import { PowerStrip } from './PowerStrip';
import { Stars } from './Stars';

const initial = (n: number, indexes: number[]) => Array.from({ length: n }, (_, i) => indexes.includes(i));

const SCENARIO = { spring: 'Sunny spring noon', heatwave: 'Heat wave afternoon', evening: 'Evening rush, 6 PM' } as const;

type Props = { level: Level; total: number; onBack: () => void; onNext?: () => void; onSolved?: (stars: number) => void };

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word + 's'}`;

export function PlayScreen({ level, total, onBack, onNext, onSolved }: Props) {
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

  const status = !out.converged ? "The solver didn't settle. Try a different setup." : out.ok
    ? 'All houses in the safe range'
    : [out.tooHigh.length && `${plural(out.tooHigh.length, 'house')} too high`, out.tooLow.length && `${plural(out.tooLow.length, 'house')} too low`].filter(Boolean).join(' · ');

  const counter = level.action === 'toggleEV'
    ? { label: 'Charging delayed', value: delays }
    : { label: 'Homes with solar', value: countSolar };

  return (
    <main className="page">
      <div className="title-row">
        <div>
          <p className="meta">Level {level.id} of {total} · {SCENARIO[level.scenario]}</p>
          <h1>{level.name}</h1>
          <p className="lede">{level.goalText}</p>
        </div>
        <dl className="title-stats">
          <div><dt>{counter.label}</dt><dd className="num">{counter.value}</dd></div>
          <div><dt>Moves</dt><dd className="num">{moves}</dd></div>
          <div><dt>Stars</dt><dd className="stars-big"><Stars count={score} size={20} /></dd></div>
        </dl>
      </div>

      <PowerStrip out={out} />

      <section className="panel" aria-labelledby="street-h">
        <div className="panel-head">
          <div>
            <h2 id="street-h">The street</h2>
            <p className="muted small">Tap a house to {level.action === 'toggleSolar' ? 'add or remove solar' : 'delay or restore its car charging'}.</p>
          </div>
          <div className="toolbar">
            {level.smartInvertersAllowed && (
              <label className="switch"><input type="checkbox" checked={smartInverters} onChange={e => { setSmartInverters(e.target.checked); setChecked(false); }} /> Smart inverters</label>
            )}
            <label className="switch"><input type="checkbox" checked={engineerView} onChange={e => setEngineerView(e.target.checked)} /> Engineer view</label>
            <button onClick={() => setHintVisible(v => !v)} aria-expanded={hintVisible}>Hint</button>
            <button onClick={reset}>Reset</button>
          </div>
        </div>
        {hintVisible && <p className="hint">{level.hint}</p>}
        <StreetView out={out} solar={solar} evCharging={evCharging} onHouseClick={tap} engineerView={engineerView} />
        {engineerView && <p className="data num">Min {out.minV.toFixed(4)} pu · Max {out.maxV.toFixed(4)} pu · Losses {out.lossesKw.toFixed(3)} kW · {out.iterations} iterations</p>}
        <div className="check-bar">
          <p className={`status ${out.ok ? 'good' : 'bad'}`} role="status">{status}</p>
          <button className="primary" onClick={() => { setChecked(true); if (solved) onSolved?.(score); }}>Check</button>
        </div>
        {checked && (
          <div className={`result ${solved ? 'good' : 'bad'}`} role="status">
            <h2>{solved ? `Solved with ${plural(score, 'star')}` : 'Not yet'}</h2>
            <p>{solved ? level.lesson : out.tooHigh.length ? `${plural(out.tooHigh.length, 'house')} still too high.` : out.tooLow.length ? `${plural(out.tooLow.length, 'house')} still too low.` : level.goalText}</p>
            <div className="button-row">
              {solved && onNext && <button className="primary" onClick={onNext}>Next level</button>}
              <button onClick={reset}>Try again</button>
              <button className="text" onClick={onBack}>All levels</button>
            </div>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="chart-h">
        <div className="panel-head">
          <h2 id="chart-h">Voltage along the street</h2>
          <p className="muted small">Shaded band is the safe range, 0.95 to 1.05 per-unit</p>
        </div>
        <VoltageChart voltages={out.voltages} />
      </section>
    </main>
  );
}
