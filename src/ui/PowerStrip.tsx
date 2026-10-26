import type { SimOutput } from '../engine/contract';

const kw = (v: number) => v.toFixed(1);

// Where the street's power is going right now: made by panels, used by homes,
// and what's left over flowing back to (or drawn from) the transformer.
export function PowerStrip({ out }: { out: SimOutput }) {
  const solar = out.solarKw.reduce((s, v) => s + v, 0);
  const load = out.loadKw.reduce((s, v) => s + v, 0);
  const net = load - solar; // > 0: the street draws from the transformer
  const back = net < 0;

  return (
    <div className="power-strip" aria-label="Power on the street">
      <div className="pnode">
        <span className="plabel">Solar on roofs</span>
        <span className="pvalue num">{kw(solar)}<span className="unit"> kW</span></span>
      </div>
      <div className={`pflow${solar > 0 ? ' live' : ''}`} aria-hidden="true"><span>{solar > 0 ? 'to homes' : 'no sun'}</span></div>
      <div className="pnode">
        <span className="plabel">Used by homes</span>
        <span className="pvalue num">{kw(load)}<span className="unit"> kW</span></span>
      </div>
      <div className={`pflow${Math.abs(net) > 0.05 ? ' live' : ''}${back ? ' back' : ''}`} aria-hidden="true">
        <span>{back ? `sent back ${kw(-net)} kW` : `drawn ${kw(net)} kW`}</span>
      </div>
      <div className="pnode">
        <span className="plabel">Transformer</span>
        <span className="pvalue num">{back ? 'receiving' : 'supplying'}</span>
      </div>
      <div className="pnode pnode-end">
        <span className="plabel">Highest voltage</span>
        <span className={`pvalue num${out.maxV > 1.05 ? ' over' : ''}`}>{out.maxV.toFixed(3)}<span className="unit"> pu</span></span>
      </div>
    </div>
  );
}
