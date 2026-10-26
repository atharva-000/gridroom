import { useState } from 'react';
import { LEVELS } from '../levels/levels';
import { type Progress, isUnlocked } from './progress';

type Props = { progress: Progress; onPlay: (levelId: number) => void; onBack: () => void };

export function LevelSelect({ progress, onPlay, onBack }: Props) {
  // clicking the title five times unlocks everything (for teachers demoing later levels)
  const [titleClicks, setTitleClicks] = useState(0);
  const teacherMode = titleClicks >= 5;
  return (
    <main className="page">
      <header className="game-header">
        <button onClick={onBack}>← Home</button>
        <div>
          <h1 onClick={() => setTitleClicks(c => c + 1)}>Levels</h1>
          <p className="muted">{teacherMode ? 'Teacher mode: every level is unlocked.' : 'Earn at least one star to unlock the next level.'}</p>
        </div>
      </header>
      <div className="level-grid">
        {LEVELS.map(level => {
          const open = isUnlocked(progress, level.id, teacherMode);
          const stars = progress[level.id]?.stars ?? 0;
          return (
            <button key={level.id} className="level-card" disabled={!open} onClick={() => onPlay(level.id)}>
              <strong>{level.id}. {level.name}</strong>
              <span>{level.lesson}</span>
              <small>
                {open ? <><span className="stars" aria-label={`${stars} of 3 stars`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span> Play →</> : '🔒 Locked'}
              </small>
            </button>
          );
        })}
      </div>
    </main>
  );
}
