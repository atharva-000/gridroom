import { useState } from 'react';
import { INTRO_CARDS } from '../content/text';

function Drawing({ step }: { step: number }) {
  const houses = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 420 130" className="intro-art" role="img" aria-label={INTRO_CARDS[step].title}>
      <rect x="8" y="40" width="56" height="44" rx="6" fill="#f4f6f8" stroke="#cdced1" strokeWidth="1" />
      <text x="36" y="66" textAnchor="middle" fontSize="11" fill="#263238">source</text>
      <line x1="64" y1="62" x2="410" y2="62" stroke={step === 0 ? '#9cc7d2' : '#8b8f93'} strokeWidth={step === 0 ? 10 : 3} strokeLinecap="round" />
      {houses.map(i => {
        const x = 110 + i * 70;
        const high = step === 1 && i >= 3;
        return (
          <g key={i}>
            <path d={`M${x - 16} 40 L${x} 24 L${x + 16} 40 Z`} fill="#334e68" />
            <rect x={x - 13} y="40" width="26" height="20" fill={high ? '#d93025' : '#2fa84f'} />
            {step >= 1 && <rect x={x - 9} y="31" width="14" height="5" fill="#123e86" />}
            {step === 1 && <path d={`M${x + 10} 96 H${x - 8} M${x - 3} 91 L${x - 9} 96 L${x - 3} 101`} stroke="#c4242a" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
            {step === 2 && <text x={x} y="100" textAnchor="middle" fontSize="12" fill="#1b6c80">smart</text>}
          </g>
        );
      })}
      {step === 0 && <text x="236" y="102" textAnchor="middle" fontSize="13" fill="#1b6c80">power flows from the source to the houses</text>}
    </svg>
  );
}

export function Intro({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const card = INTRO_CARDS[step];
  const last = step === INTRO_CARDS.length - 1;
  return (
    <main className="page">
      <div className="title-row">
        <div>
          <h1>How the grid works</h1>
          <p className="lede">Three ideas you need before Level 1.</p>
        </div>
      </div>
      <section className="panel intro-card">
        <ol className="steps" aria-label="Progress">
          {INTRO_CARDS.map((c, i) => <li key={c.title} className={i === step ? 'current' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}><span className="step-num num">{i + 1}</span>{c.title}</li>)}
        </ol>
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
