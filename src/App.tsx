import { useState } from 'react';
import { LEVELS } from './levels/levels';
import { PlayScreen } from './ui/PlayScreen';
import { Home } from './ui/Home';
import { Intro } from './ui/Intro';
import { LevelSelect } from './ui/LevelSelect';
import { MyStreet } from './ui/MyStreet';
import { HowWeBuilt } from './ui/HowWeBuilt';
import { Shell } from './ui/Shell';
import { type Progress, loadProgress, saveStars } from './ui/progress';
import type { Screen } from './ui/screens';
import './style.css';

const TITLES: Record<Screen, string> = {
  home: 'Overview',
  intro: 'How the grid works',
  levels: 'Levels',
  play: 'Levels',
  mystreet: 'Check a street',
  how: 'How we built it',
};

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
  const starTotal = LEVELS.reduce((s, l) => s + (progress[l.id]?.stars ?? 0), 0);

  let body;
  switch (screen) {
    case 'intro':
      body = <Intro onDone={() => play(1)} />;
      break;
    case 'levels':
      body = <LevelSelect progress={progress} onPlay={play} />;
      break;
    case 'play':
      body = (
        <PlayScreen
          key={level.id}
          level={level}
          total={LEVELS.length}
          onBack={() => go('levels')}
          onNext={level.id < LEVELS.length ? () => play(level.id + 1) : undefined}
          onSolved={stars => setProgress(p => saveStars(p, level.id, stars))}
        />
      );
      break;
    case 'mystreet':
      body = <MyStreet />;
      break;
    case 'how':
      body = <HowWeBuilt />;
      break;
    default:
      body = <Home progress={progress} go={go} play={play} />;
  }

  const title = screen === 'play' ? `Level ${level.id}` : TITLES[screen];
  return (
    <Shell screen={screen} title={title} starTotal={starTotal} starMax={LEVELS.length * 3} go={go}>
      {body}
    </Shell>
  );
}
