import { useState } from 'react';
import { LEVELS } from './levels/levels';
import { PlayScreen } from './ui/PlayScreen';
import './style.css';

export default function App() {
  const [selected, setSelected] = useState<number | null>(null);
  const level = LEVELS.find(item => item.id === selected);
  if (level) return <PlayScreen key={level.id} level={level} onBack={() => setSelected(null)} onNext={level.id < LEVELS.length ? () => setSelected(level.id + 1) : undefined}/>;
  return <main className="page"><header className="landing"><h1>GridRoom</h1><p>Why can't every house go solar? Find out by running the grid yourself.</p></header><h2>Select a level</h2><div className="level-grid">{LEVELS.map(item => <button key={item.id} className="level-card" onClick={() => setSelected(item.id)}><strong>{item.id}. {item.name}</strong><span>{item.lesson}</span><small>Play →</small></button>)}</div><p className="muted">Sample circuit for learning, not real utility voltage measurements.</p></main>;
}
