import { useMemo, useState } from 'react';
import type { StreetModel, UtilityInput } from '../geo/types';
import { analyzeStreet, buildStreetModel, manualStreetModel, stitchStreet } from '../geo';
import { geocodeAddress } from '../geo/fetch/nominatim';
import { fetchBuildings, fetchStreetWays } from '../geo/fetch/overpass';
import { V_MAX, V_MIN } from '../engine/contract';
import { JCPL_MAP_URL, LIMITATIONS, MAPS_EXPLAINED, MEANING, PRIVACY, PSEG_MAP_URL } from '../content/text';
import { StreetMap } from './StreetMap';
import { VoltageChart } from './VoltageChart';

type Step = 'find' | 'check' | 'utility' | 'results';
const STEPS: { id: Step; label: string }[] = [
  { id: 'find', label: 'Find the street' },
  { id: 'check', label: 'Check the map' },
  { id: 'utility', label: "Utility's map" },
  { id: 'results', label: 'Results' },
];

function spreadNeighbors(model: StreetModel, count: number, current: boolean[]): boolean[] {
  const homeIdx = model.houses.findIndex(h => h.isUserHome);
  const others = model.houses.map((_, i) => i).filter(i => i !== homeIdx);
  const next = model.houses.map(() => false);
  for (let j = 0; j < count && others.length; j++) next[others[Math.floor(((j + 0.5) * others.length) / count)]] = true;
  if (homeIdx >= 0) next[homeIdx] = current[homeIdx] ?? false;
  return next;
}

export function MyStreet({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>('find');
  const [model, setModel] = useState<StreetModel | null>(null);
  const [feedEnd, setFeedEnd] = useState<'A' | 'B'>('A');
  const [utility, setUtility] = useState<UtilityInput>({ kind: 'unknown' });
  const [company, setCompany] = useState<'pseg' | 'jcpl' | 'other'>('other');
  const [jcplKw, setJcplKw] = useState('');
  const [solar, setSolar] = useState<boolean[]>([]);
  const [smart, setSmart] = useState(false);
  const [showValues, setShowValues] = useState(false);
  const [editMode, setEditMode] = useState<'home' | 'remove'>('home');

  const [address, setAddress] = useState('');
  const [searchLocked, setSearchLocked] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualHomes, setManualHomes] = useState(15);
  const [manualLength, setManualLength] = useState(300);

  const load = (m: StreetModel) => {
    setModel(m);
    setFeedEnd(m.feedEnd);
    setSolar(m.houses.map(() => false));
    setError(null);
    setStep('check');
  };

  const search = async () => {
    if (!address.trim() || searchLocked || loading) return;
    setSearchLocked(true);
    setTimeout(() => setSearchLocked(false), 2000);
    setError(null);
    try {
      setLoading('Finding the address…');
      const geo = await geocodeAddress(address);
      setLoading('Mapping the street…');
      const line = stitchStreet(geo, await fetchStreetWays(geo.lat, geo.lon));
      setLoading('Finding houses…');
      load(buildStreetModel(geo, line, await fetchBuildings(line.wayIds)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const loadSample = async () => {
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}sample-street.json`);
      if (!res.ok) throw new Error();
      load((await res.json()) as StreetModel);
    } catch {
      setError("Couldn't load the sample street.");
    }
  };

  const editHouse = (i: number) => {
    if (!model) return;
    if (editMode === 'home') {
      setModel({ ...model, houses: model.houses.map((h, j) => ({ ...h, isUserHome: j === i ? !h.isUserHome : false })) });
    } else if (model.houses.length > 3) {
      setModel({ ...model, houses: model.houses.filter((_, j) => j !== i) });
      setSolar(s => s.filter((_, j) => j !== i));
    }
  };

  const chooseUtility = (u: UtilityInput) => setUtility(u);

  const analysis = useMemo(() => {
    if (!model || step !== 'results') return null;
    try {
      return analyzeStreet(model, { feedEnd, utility, solar, smartInverters: smart });
    } catch {
      return null;
    }
  }, [model, step, feedEnd, utility, solar, smart]);

  const homeIdx = model ? model.houses.findIndex(h => h.isUserHome) : -1;
  const neighborCount = solar.filter((on, i) => on && i !== homeIdx).length;

  const meaning = !analysis
    ? ''
    : utility.kind === 'unknown'
      ? MEANING.unknown
      : !analysis.yourHome
        ? MEANING.noHome
        : analysis.yourHome.withYours.ok
          ? MEANING.fits
          : analysis.yourHome.withYoursSmart.ok
            ? MEANING.smartFixes
            : MEANING.full;

  const high = analysis ? analysis.voltages.filter(v => v > V_MAX).length : 0;
  const low = analysis ? analysis.voltages.filter(v => v < V_MIN).length : 0;
  const stepIndex = STEPS.findIndex(s => s.id === step);

  return (
    <main className="page">
      <header className="game-header">
        <button onClick={onBack}>← Home</button>
        <div>
          <h1>Check a street</h1>
          <p className="muted">{model ? `${model.streetName}${model.townLabel ? `, ${model.townLabel}` : ''}` : 'Model a real street at a sunny spring noon.'}</p>
        </div>
      </header>

      <ol className="steps">
        {STEPS.map((s, i) => <li key={s.id} className={i === stepIndex ? 'current' : i < stepIndex ? 'done' : ''}>{s.label}</li>)}
      </ol>

      {step === 'find' && (
        <section className="panel">
          <h2>Find the street</h2>
          <form className="search-row" onSubmit={e => { e.preventDefault(); search(); }}>
            <label className="sr-only" htmlFor="address">Address</label>
            <input id="address" type="text" placeholder="Street address, town, ZIP" value={address} onChange={e => setAddress(e.target.value)} autoComplete="off" />
            <button type="submit" className="primary" disabled={searchLocked || !!loading || !address.trim()}>Search</button>
          </form>
          <p className="muted small">{PRIVACY}</p>
          {loading && <p className="loading" role="status">{loading}</p>}
          {error && (
            <div className="error-box" role="alert">
              <p>{error}</p>
              <div className="button-row">
                <button onClick={search} disabled={searchLocked || !address.trim()}>Try again</button>
                <button onClick={loadSample}>Use the sample street</button>
                <button onClick={() => setManualOpen(true)}>Enter a street by hand</button>
              </div>
            </div>
          )}
          <div className="button-row alt-row">
            <button onClick={loadSample}>Try the sample street</button>
            <button onClick={() => setManualOpen(o => !o)}>Enter a street by hand</button>
          </div>
          {manualOpen && (
            <div className="manual-box">
              <label>Houses on the street
                <input type="number" min={3} max={60} value={manualHomes} onChange={e => setManualHomes(Number(e.target.value))} />
              </label>
              <label>Street length (meters)
                <input type="number" min={50} max={1500} step={10} value={manualLength} onChange={e => setManualLength(Number(e.target.value))} />
              </label>
              <div className="button-row">
                {[['Short', 150], ['Medium', 300], ['Long', 600]].map(([label, m]) => (
                  <button key={label} onClick={() => setManualLength(m as number)}>{label} ({m} m)</button>
                ))}
                <button className="primary" onClick={() => load(manualStreetModel(manualHomes || 15, manualLength || 300))}>Use this street</button>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 'check' && model && (
        <section className="panel">
          <h2>Check the map</h2>
          <p>Found <strong>{model.houses.length}</strong> houses on <strong>{model.streetName}</strong>. ⚡ marks where power comes into the street.</p>
          {model.warnings.length > 0 && <ul className="warnings">{model.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
          <div className="segmented" role="group" aria-label="What tapping a house does">
            <button className={editMode === 'home' ? 'on' : ''} onClick={() => setEditMode('home')}>Tap: this is the home</button>
            <button className={editMode === 'remove' ? 'on' : ''} onClick={() => setEditMode('remove')}>Tap: not a house</button>
          </div>
          <StreetMap model={model} feedEnd={feedEnd} onHouseClick={editHouse} />
          <div className="button-row">
            <span className="muted">Power comes in from:</span>
            <div className="segmented" role="group" aria-label="Where power comes in">
              <button className={feedEnd === 'A' ? 'on' : ''} onClick={() => setFeedEnd('A')}>End A</button>
              <button className={feedEnd === 'B' ? 'on' : ''} onClick={() => setFeedEnd('B')}>End B</button>
            </div>
            <span className="muted small">Usually the end that meets a bigger road.</span>
          </div>
          <div className="button-row nav-row">
            <button onClick={() => setStep('find')}>Back</button>
            <button className="primary" onClick={() => setStep('utility')}>Looks right → Next</button>
          </div>
        </section>
      )}

      {step === 'utility' && model && (
        <section className="panel">
          <h2>The utility's solar map</h2>
          <p>Which electric company serves this street?</p>
          <div className="segmented" role="group" aria-label="Electric company">
            <button className={company === 'pseg' ? 'on' : ''} onClick={() => { setCompany('pseg'); chooseUtility({ kind: 'unknown' }); }}>PSE&amp;G</button>
            <button className={company === 'jcpl' ? 'on' : ''} onClick={() => { setCompany('jcpl'); chooseUtility({ kind: 'unknown' }); }}>JCP&amp;L</button>
            <button className={company === 'other' ? 'on' : ''} onClick={() => { setCompany('other'); chooseUtility({ kind: 'unknown' }); }}>Other / not sure</button>
          </div>

          {company === 'pseg' && (
            <div className="utility-box">
              <p>Open <a href={PSEG_MAP_URL} target="_blank" rel="noreferrer">PSE&amp;G's Solar Power Suitability Map</a>, search the address, and pick the color shown:</p>
              <div className="segmented" role="group" aria-label="Map color">
                {(['red', 'yellow', 'green'] as const).map(color => (
                  <button key={color} className={`swatch ${color} ${utility.kind === 'pseg' && utility.color === color ? 'on' : ''}`} onClick={() => chooseUtility({ kind: 'pseg', color })}>
                    {color[0].toUpperCase() + color.slice(1)}
                  </button>
                ))}
                <button className={utility.kind === 'unknown' ? 'on' : ''} onClick={() => chooseUtility({ kind: 'unknown' })}>Not sure</button>
              </div>
            </div>
          )}

          {company === 'jcpl' && (
            <div className="utility-box">
              <p>Open <a href={JCPL_MAP_URL} target="_blank" rel="noreferrer">JCP&amp;L's Solar Accommodation Map</a>, find the dot nearest the home, and enter the number it shows in kW (if it shows MW, multiply by 1000):</p>
              <input type="number" min={0} placeholder="kW" value={jcplKw} onChange={e => {
                setJcplKw(e.target.value);
                const kw = Number(e.target.value);
                chooseUtility(e.target.value && kw > 0 ? { kind: 'jcpl', kw } : { kind: 'unknown' });
              }} />
            </div>
          )}

          <details className="explain">
            <summary>What do these maps mean?</summary>
            <p>{MAPS_EXPLAINED}</p>
          </details>
          <div className="button-row nav-row">
            <button onClick={() => setStep('check')}>Back</button>
            <button className="primary" onClick={() => setStep('results')}>Show the street →</button>
          </div>
        </section>
      )}

      {step === 'results' && model && (
        <>
          <section className="panel">
            <h2>Voltage at sunny spring noon</h2>
            <p className="muted">Tap a house to mark that it already has solar panels.</p>
            <StreetMap
              model={model}
              feedEnd={feedEnd}
              voltages={analysis?.voltages}
              solar={solar}
              showValues={showValues}
              onHouseClick={i => setSolar(s => s.map((on, j) => (j === i ? !on : on)))}
            />
            <div className="controls-grid">
              <label className="slider">
                Neighbors with solar: <strong>{neighborCount}</strong>
                <input type="range" min={0} max={Math.max(0, model.houses.length - (homeIdx >= 0 ? 1 : 0))} value={neighborCount}
                  onChange={e => setSolar(s => spreadNeighbors(model, Number(e.target.value), s))} />
              </label>
              {homeIdx >= 0 && (
                <label className="toggle"><input type="checkbox" checked={!!solar[homeIdx]} onChange={e => setSolar(s => s.map((on, j) => (j === homeIdx ? e.target.checked : on)))} /> Solar on the home</label>
              )}
              <label className="toggle"><input type="checkbox" checked={smart} onChange={e => setSmart(e.target.checked)} /> Smart inverters</label>
              <label className="toggle"><input type="checkbox" checked={showValues} onChange={e => setShowValues(e.target.checked)} /> Engineer view</label>
            </div>
            <p className="status-line"><strong>
              {!analysis ? 'Could not model this street.'
                : high === 0 && low === 0 ? 'All houses in the safe range ✓'
                  : `${high ? `${high} house(s) too high ▲` : ''}${high && low ? ' · ' : ''}${low ? `${low} house(s) too low ▼` : ''}`}
            </strong></p>
            {showValues && analysis && (
              <>
                <VoltageChart voltages={analysis.out.voltages} />
                <p className="data">Min {analysis.out.minV.toFixed(4)} pu · Max {analysis.out.maxV.toFixed(4)} pu · Losses {analysis.out.lossesKw.toFixed(2)} kW · Circuit room used: {analysis.roomKwUsed} kW</p>
              </>
            )}
          </section>

          {analysis && (
            <div className="card-grid">
              <section className="panel">
                <h2>Room for solar on this street</h2>
                {analysis.capacityByColor ? (
                  <>
                    <p>Depends on how full the circuit is. Homes that could add solar, out of {model.houses.length}:</p>
                    <table className="cap-table">
                      <thead><tr><th>Utility map</th><th>Best case</th><th>Worst case</th><th>With smart inverters</th></tr></thead>
                      <tbody>
                        {(['red', 'yellow', 'green'] as const).map(c => {
                          const cap = analysis.capacityByColor![c];
                          return <tr key={c}><td><span className={`dot ${c}`} /> {c[0].toUpperCase() + c.slice(1)}</td><td>{cap.best}</td><td>{cap.worst}</td><td>{cap.worstSmart}–{cap.bestSmart}</td></tr>;
                        })}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p>
                    About <strong>{analysis.capacity.best}</strong> of {model.houses.length} homes could add solar if the homes nearest the power entry go first,
                    and about <strong>{analysis.capacity.worst}</strong> if the far end goes first. With smart inverters: <strong>{analysis.capacity.bestSmart}</strong> / <strong>{analysis.capacity.worstSmart}</strong>.
                  </p>
                )}
              </section>

              <section className="panel">
                <h2>The home</h2>
                {analysis.yourHome ? (
                  <>
                    <p>House #{analysis.yourHome.positionFromFeed} from where power comes in (about {analysis.yourHome.distanceFromFeedM} m).</p>
                    <p>
                      {analysis.yourHome.withYours.ok
                        ? '✓ With the neighbors marked, solar on this home keeps every house in the safe range.'
                        : `▲ Solar on this home would push the street to ${analysis.yourHome.withYours.maxV.toFixed(3)} pu.`}
                    </p>
                    <p>
                      With smart inverters: {analysis.yourHome.withYoursSmart.ok ? '✓ fits' : `▲ still ${analysis.yourHome.withYoursSmart.maxV.toFixed(3)} pu`}
                    </p>
                  </>
                ) : (
                  <p>{MEANING.noHome}</p>
                )}
                <p className="muted">{meaning}</p>
              </section>
            </div>
          )}

          <section className="panel">
            <h2>Keep in mind</h2>
            <ul className="limits">{LIMITATIONS.map(l => <li key={l}>{l}</li>)}</ul>
            {(model.source === 'osm' || model.source === 'sample') && (
              <p className="muted small">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors.</p>
            )}
            <div className="button-row nav-row">
              <button onClick={() => setStep('utility')}>Back</button>
              <button onClick={() => { setModel(null); setStep('find'); }}>Start over</button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
