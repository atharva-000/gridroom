import { useState } from 'react';
import { LEVELS } from '../levels/levels';
import { type Progress, isUnlocked } from './progress';
import { Stars } from './Stars';

type Props = { progress: Progress; onPlay: (levelId: number) => void };

const SCENARIO = { spring: 'Spring noon', heatwave: 'Heat wave', evening: 'Evening rush' } as const;

export function LevelSelect({ progress, onPlay }: Props) {
  // clicking the title five times unlocks everything (for teachers demoing later levels)
  const [titleClicks, setTitleClicks] = useState(0);
  const teacherMode = titleClicks >= 5;
  return (
    <main className="page">
      <div className="title-row">
        <div>
          <h1 onClick={() => setTitleClicks(c => c + 1)}>Levels</h1>
          <p className="lede">{teacherMode ? 'Teacher mode: every level is unlocked.' : 'Earn at least one star on a level to open the next one.'}</p>
        </div>
      </div>
      <div className="panel flush">
        <table className="level-table">
          <thead>
            <tr><th className="col-num">#</th><th>Level</th><th className="col-hide">Conditions</th><th>Stars</th><th className="col-act"><span className="sr-only">Play</span></th></tr>
          </thead>
          <tbody>
            {LEVELS.map(level => {
              const open = isUnlocked(progress, level.id, teacherMode);
              const stars = progress[level.id]?.stars ?? 0;
              return (
                <tr key={level.id} className={open ? '' : 'locked'}>
                  <td className="col-num num">{level.id}</td>
                  <td><strong>{level.name}</strong><span className="sub">{level.goalText}</span></td>
                  <td className="col-hide muted">{SCENARIO[level.scenario]} · {level.segmentLengthM * level.numHomes} m</td>
                  <td><span className="lvl-stars"><Stars count={stars} /></span></td>
                  <td className="col-act">
                    <button className={open && stars === 0 ? 'primary small' : 'small'} disabled={!open} onClick={() => onPlay(level.id)}>
                      {!open ? 'Locked' : stars ? 'Replay' : 'Play'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
