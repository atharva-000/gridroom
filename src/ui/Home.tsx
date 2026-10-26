import { LEVELS } from '../levels/levels';
import { DISCLAIMER } from '../content/text';
import { type Progress, isUnlocked } from './progress';
import type { Screen } from './screens';
import { Stars } from './Stars';

type Props = { progress: Progress; go: (s: Screen) => void; play: (levelId: number) => void };

export function Home({ progress, go, play }: Props) {
  const stars = (id: number) => progress[id]?.stars ?? 0;
  const done = LEVELS.filter(l => stars(l.id) > 0).length;
  const total = LEVELS.reduce((s, l) => s + stars(l.id), 0);
  const next = LEVELS.find(l => stars(l.id) === 0) ?? LEVELS[LEVELS.length - 1];

  return (
    <main className="page">
      <div className="title-row">
        <div>
          <h1>Overview</h1>
          <p className="lede">Why can't every house go solar? Run a street's grid in five levels, then model a real New Jersey street.</p>
        </div>
        <button className="btn primary" onClick={() => play(next.id)}>
          {done === 0 ? 'Start Level 1' : done === LEVELS.length ? 'Replay Level 5' : `Continue: Level ${next.id}`}
        </button>
      </div>

      <div className="grid-6">
        <section className="panel span-4" aria-labelledby="levels-h">
          <div className="panel-head">
            <h2 id="levels-h">Levels</h2>
            <button className="btn text" onClick={() => go('levels')}>All levels</button>
          </div>
          <ul className="level-list">
            {LEVELS.map(l => {
              const open = isUnlocked(progress, l.id, false);
              return (
                <li key={l.id}>
                  <span className="lvl-num num">{l.id}</span>
                  <span className="lvl-text">
                    <strong>{l.name}</strong>
                    <span>{l.lesson}</span>
                  </span>
                  <span className="lvl-stars"><Stars count={stars(l.id)} /></span>
                  <button className="btn small" disabled={!open} onClick={() => play(l.id)}>{open ? 'Play' : 'Locked'}</button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel span-2 stat-panel" aria-labelledby="progress-h">
          <h2 id="progress-h">Progress</h2>
          <dl className="stat-list">
            <div><dt>Stars earned</dt><dd className="num">{total}<span className="unit"> / {LEVELS.length * 3}</span></dd></div>
            <div><dt>Levels cleared</dt><dd className="num">{done}<span className="unit"> / {LEVELS.length}</span></dd></div>
            <div><dt>Safe voltage range</dt><dd className="num">0.95–1.05<span className="unit"> pu</span></dd></div>
          </dl>
          <p className="muted small">Stars are saved in this browser.</p>
        </section>

        <section className="panel span-3" aria-labelledby="street-h">
          <h2 id="street-h">Check a street</h2>
          <p>Look up a New Jersey address. GridRoom maps the houses on that street, uses the utility's public solar map to estimate how full the circuit is, and shows the voltage at every house.</p>
          <div className="button-row">
            <button className="btn" onClick={() => go('mystreet')}>Look up an address</button>
            <button className="btn text" onClick={() => go('mystreet')}>Try the sample street</button>
          </div>
        </section>

        <section className="panel span-3" aria-labelledby="engine-h">
          <h2 id="engine-h">How the engine was checked</h2>
          <p className="big-figure num">6 × 10<sup>−11</sup><span className="unit"> pu</span></p>
          <p>Largest difference between GridRoom's power-flow solver and pandapower on the same 25-house street.</p>
          <button className="btn text" onClick={() => go('how')}>How we built it</button>
        </section>
      </div>

      <p className="muted small footer-note">{DISCLAIMER}</p>
    </main>
  );
}
