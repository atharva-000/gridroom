import { useEffect, useState, type ReactNode } from 'react';
import type { Screen } from './screens';
import { Star } from './Stars';

const Icon = ({ d }: { d: string }) => (
  <svg className="nav-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: 'home', label: 'Overview', icon: 'M2.5 7.5 8 3l5.5 4.5V13a.5.5 0 0 1-.5.5h-3.5V10h-3v3.5H3a.5.5 0 0 1-.5-.5z' },
  { id: 'levels', label: 'Levels', icon: 'M2.5 3.5h4v4h-4zM9.5 3.5h4v4h-4zM2.5 9.5h4v4h-4zM9.5 9.5h4v4h-4z' },
  { id: 'mystreet', label: 'Check a street', icon: 'M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 9.8 8 14 8 14zM8 8.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4z' },
  { id: 'intro', label: 'How the grid works', icon: 'M2.5 3.5h4a1.5 1.5 0 0 1 1.5 1.5v8.5a1.5 1.5 0 0 0-1.5-1.5h-4zM13.5 3.5h-4A1.5 1.5 0 0 0 8 5v8.5A1.5 1.5 0 0 1 9.5 12h4z' },
  { id: 'how', label: 'How we built it', icon: 'M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5' },
];

// The mark: a street with three houses, colored by voltage.
export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#1b6c80" />
      <line x1="5" y1="17" x2="23" y2="17" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8.5" cy="11.5" r="2.6" fill="#7fd6a3" />
      <circle cx="14" cy="11.5" r="2.6" fill="#f2cf4a" />
      <circle cx="19.5" cy="11.5" r="2.6" fill="#ff8a6b" />
    </svg>
  );
}

type Props = {
  screen: Screen;
  title: string;
  starTotal: number;
  starMax: number;
  go: (s: Screen) => void;
  children: ReactNode;
};

export function Shell({ screen, title, starTotal, starMax, go, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const activeId: Screen = screen === 'play' ? 'levels' : screen;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  const nav = (
    <nav aria-label="Main">
      <ul className="nav-list">
        {NAV.map(item => (
          <li key={item.id}>
            <button
              className={`nav-item${activeId === item.id ? ' active' : ''}`}
              aria-current={activeId === item.id ? 'page' : undefined}
              onClick={() => { setMenuOpen(false); go(item.id); }}
            >
              <Icon d={item.icon} />
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand-row" onClick={() => go('home')}>
          <Mark />
          <span>
            <strong>GridRoom</strong>
            <small>Solar on the street</small>
          </span>
        </button>
        {nav}
        <p className="sidebar-foot">Congressional App Challenge 2026 · NJ-12</p>
      </aside>

      <header className="topbar">
        <button className="menu-button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
          <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        <p className="crumbs"><span className="crumb-app">GridRoom</span><span className="crumb-sep">/</span>{title}</p>
        <p className="topbar-stat num" aria-label={`${starTotal} of ${starMax} stars earned`}>
          <span className="star"><Star size={13} /></span> {starTotal}<span className="unit">/{starMax}</span>
        </p>
      </header>

      <div className="sheet">{children}</div>

      {menuOpen && (
        <div className="menu-sheet" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="menu-head">
            <span className="brand-inline"><Mark /> <strong>GridRoom</strong></span>
            <button className="menu-close" onClick={() => setMenuOpen(false)}>Close</button>
          </div>
          {nav}
        </div>
      )}
    </div>
  );
}
