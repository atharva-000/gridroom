import { useState } from 'react';
import { INTRO_CARDS } from '../content/text';

function Drawing({ step }: { step: number }) {
  const houses = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 420 130" className="intro-art" role="img" aria-label={INTRO_CARDS[step].title}>
      <rect x="8" y="40" width="56" height="44" rx="6" fill="#dce6e9" stroke="#395b62" strokeWidth="2" />
      <text x="36" y="66" textAnchor="middle" fontSize="11" fill="#263238">source</text>
      <line x1="64" y1="62" x2="410" y2="62" stroke={step === 0 ? '#6aa7ff' : '#526570'} strokeWidth={step === 0 ? 14 : 4} strokeLinecap="round" />
      {houses.map(i => {
        const x = 110 + i * 70;
        const high = step === 1 && i >= 3;
        return (
          <g key={i}>
            <path d={`M${x - 16} 40 L${x} 24 L${x + 16} 40 Z`} fill="#334e68" />
            <rect x={x - 13} y="40" width="26" height="20" fill={high ? '#d93025' : '#2fa84f'} />
            {step >= 1 && <rect x={x - 9} y="31" width="14" height="5" fill="#123e86" />}
            {step === 1 && <text x={x} y="100" textAnchor="middle" fontSize="16" fill="#b91c1c">←</text>}
            {step === 2 && <text x={x} y="100" textAnchor="middle" fontSize="12" fill="#0f766e">smart</text>}
          </g>
        );
      })}
      {step === 0 && <text x="236" y="100" textAnchor="middle" fontSize="16" fill="#1f4fbf">power flows this way →</text>}
    </svg>
  );
}

export function Intro({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const card = INTRO_CARDS[step];
  const last = step === INTRO_CARDS.length - 1;
  return (
    <main className="page">
      <header className="game-header">
        <button onClick={onBack}>← Home</button>
        <div><h1>How the grid works</h1><p className="muted">{step + 1} of {INTRO_CARDS.length}</p></div>
      </header>
      <section className="panel intro-card">
        <Drawing step={step} />
        <h2>{card.title}</h2>
        <p>{card.body}</p>
        <div className="button-row">
          {step > 0 && <button onClick={() => setStep(s => s - 1)}>Back</button>}
          {last
            ? <button className="primary" onClick={onDone}>Start Level 1</button>
            : <button className="primary" onClick={() => setStep(s => s + 1)}>Next</button>}
        </div>
      </section>
    </main>
  );
}
