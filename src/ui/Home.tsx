import { DISCLAIMER, TAGLINE } from '../content/text';
import type { Screen } from './screens';

export function Home({ go }: { go: (s: Screen) => void }) {
  return (
    <main className="page">
      <header className="landing">
        <h1 className="brand">GridRoom</h1>
        <p className="tagline">{TAGLINE}</p>
      </header>
      <div className="home-grid">
        <button className="home-card home-card-main" onClick={() => go('levels')}>
          <strong>Play the game</strong>
          <span>Five levels on a 25-house street: solar, a heat wave, EV charging and smart inverters.</span>
        </button>
        <button className="home-card" onClick={() => go('mystreet')}>
          <strong>Check a street</strong>
          <span>Model a real street from map data and the utility's public solar map.</span>
        </button>
        <button className="home-card" onClick={() => go('intro')}>
          <strong>How the grid works</strong>
          <span>A one-minute explainer before you play.</span>
        </button>
        <button className="home-card" onClick={() => go('how')}>
          <strong>How we built it</strong>
          <span>The power-flow engine and how we checked it.</span>
        </button>
      </div>
      <p className="muted small footer-note">{DISCLAIMER}</p>
    </main>
  );
}
