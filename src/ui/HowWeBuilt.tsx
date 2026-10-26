import { SOURCES } from '../content/text';

export function HowWeBuilt() {
  return (
    <main className="page">
      <div className="title-row">
        <div>
          <h1>How we built it</h1>
          <p className="lede">The physics behind the game, how we checked it, and where the street data comes from.</p>
        </div>
      </div>
      <div className="prose-grid">

      <section className="panel">
        <h2>The engine</h2>
        <p>
          GridRoom runs a power-flow solver in the browser. The street is one line coming out of the transformer at 1.02 per-unit.
          Each pass adds up the current from the far end back toward the transformer, then works out the voltage drop house by house,
          and repeats until the voltages change by less than 10⁻⁹.
        </p>
        <p>
          Smart inverters follow the IEEE 1547 volt/VAR curve. If every inverter jumped straight to its target they would overcorrect
          and the voltages would oscillate, so each one moves 30% of the way per step until the street settles.
          Hosting capacity is found by adding solar one house at a time until any house goes above 1.05 per-unit.
        </p>
      </section>

      <section className="panel">
        <h2>Checking the math</h2>
        <p>We built the same 25-house street in pandapower, an open-source power-system tool, and compared three cases. The largest difference was about 6×10⁻¹¹ per-unit.</p>
        <img className="chart-img" src={`${import.meta.env.BASE_URL}validation_chart.png`} alt="GridRoom engine voltages compared with pandapower for three cases; the two match at every house." />
      </section>

      <section className="panel">
        <h2>My Street</h2>
        <p>
          An address is looked up with OpenStreetMap's Nominatim service. The street's pieces and the buildings next to it come from the Overpass API,
          and the houses are placed in order along the street. The utility map's remaining capacity becomes an extra stretch of wire before the street,
          sized so that adding that much solar at the street entrance would raise the voltage from 1.02 to the 1.05 limit.
        </p>
      </section>

      <section className="panel">
        <h2>Team and sources</h2>
        <p>Built by <a href="https://github.com/atharva-000" target="_blank" rel="noreferrer">@atharva-000</a> and <a href="https://github.com/Atharv-Gupta311" target="_blank" rel="noreferrer">@Atharv-Gupta311</a> for the 2026 Congressional App Challenge (NJ-12).</p>
        <ul>{SOURCES.map(s => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
        <p className="muted small">Map data © OpenStreetMap contributors.</p>
      </section>
      </div>
    </main>
  );
}
