import { useState } from 'react';
import { LEVELS } from './levels/levels';
import { PlayScreen } from './ui/PlayScreen';
import { Home } from './ui/Home';
import { Intro } from './ui/Intro';
import { LevelSelect } from './ui/LevelSelect';
import { MyStreet } from './ui/MyStreet';
import { HowWeBuilt } from './ui/HowWeBuilt';
import { type Progress, loadProgress, saveStars } from './ui/progress';
import type { Screen } from './ui/screens';
import './style.css';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [levelId, setLevelId] = useState(1);
  const [progress, setProgress] = useState<Progress>(() => loadProgress());

  const go = (next: Screen) => {
    setScreen(next);
    window.scrollTo?.(0, 0);
  };
  const play = (id: number) => {
    setLevelId(id);
    go('play');
  };
  const level = LEVELS.find(l => l.id === levelId) ?? LEVELS[0];

  switch (screen) {
    case 'intro':
      return <Intro onBack={() => go('home')} onDone={() => play(1)} />;
    case 'levels':
      return <LevelSelect progress={progress} onPlay={play} onBack={() => go('home')} />;
    case 'play':
      return (
        <PlayScreen
          key={level.id}
          level={level}
          onBack={() => go('levels')}
          onNext={level.id < LEVELS.length ? () => play(level.id + 1) : undefined}
          onSolved={stars => setProgress(p => saveStars(p, level.id, stars))}
        />
      );
    case 'mystreet':
      return <MyStreet onBack={() => go('home')} />;
    case 'how':
      return <HowWeBuilt onBack={() => go('home')} />;
    default:
      return <Home go={go} />;
  }
}
