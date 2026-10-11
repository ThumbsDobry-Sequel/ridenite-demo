import { areaLabel } from '../lib/tab';
import { useState } from 'react';
import { T, venue, type Address } from '../venue.config';
import { navigate, type Route } from '../router';
import { useDemoState, useStore } from '../store';
import { suggest } from '../lib/address';
import { Banner, Button, Fict, ListRow } from '../components/primitives';
import { Screen, Top } from '../components/layout';

/** P2 Where to? Voice (P2v) is removed for v1 by product decision. */
export function P2() {
  const store = useStore();
  const s = useDemoState();
  const pick = (a: Address) => { store.setDestination(a); navigate('/g/p3'); };
  return (
    <Screen id="P2">
      <Top back="/g/home" ctx={s.linkedTab?.guest || venue.guest.name} />
      {s.handoff && <p className="foot">Link from {venue.name} staff</p>}
      <h1 className="h2">Where to?</h1>
      {s.savedHome && (
        <ListRow icon="home" title="Home" subtitle={areaLabel(s.savedHome)} selected testId="dest-home" onClick={() => pick(s.savedHome!)} />
      )}
      <ListRow icon="kbd" title="Type it" subtitle="Big keyboard, we'll fix typos" testId="dest-type" onClick={() => navigate('/g/p2t')} />
      <ListRow icon="pin" title="Use my location" subtitle="Sample location (simulated)" testId="dest-location" onClick={() => navigate('/g/p2t?loc=1')} />
      <ListRow icon="venue" title={`Ask the ${T.staff}`} subtitle="Staff will set it for you" onClick={() => { store.requestStaff(venue.seat); navigate('/g/p3w'); }} />
      <div className="spacer" />
      <Fict>Addresses are fictional sample data.</Fict>
    </Screen>
  );
}

/** P2t: suggestions from the first keystroke (forgiving match, UI 9b); never submits free text. */
export function P2t({ route }: { route: Route }) {
  const store = useStore();
  const fromLoc = route.query.get('loc') === '1';
  const sample = venue.sampleLocation;
  const [q, setQ] = useState(fromLoc ? `${sample.line}` : '');
  const [simulated, setSimulated] = useState(fromLoc);
  const results = suggest(q, venue.addresses, 3);
  const useLocation = () => { setQ(sample.line); setSimulated(true); };
  return (
    <Screen id="P2t">
      <Top back="/g/p2" ctx="Type it" />
      <div className="field">
        <label htmlFor="addr">Address or place</label>
        <input className="input" id="addr" value={q} onChange={(e) => { setQ(e.target.value); setSimulated(false); }}
          autoComplete="street-address" enterKeyHint="search" data-testid="addr-input" />
      </div>
      <Button variant="secondary" icon="pin" testId="use-location" onClick={useLocation}>Use my location</Button>
      {simulated && <Banner tone="info" icon="pin"><span data-testid="sim-location">Sample location (simulated). Your real location is not used.</span></Banner>}
      {q.trim() && (
        <>
          <p className="foot" aria-live="polite">{results.length ? 'Did you mean' : `No match yet. Try the street name, or ask the ${T.staff}.`}</p>
          <div className="stack">
            {results.map((a, i) => (
              <ListRow key={a.line + a.area} icon="pin" compact title={a.line}
                subtitle={simulated && a.line === sample.line ? `${a.area}. Sample location (simulated)` : a.area}
                selected={i === 0} testId={`suggest-${i}`} onClick={() => { store.setDestination(a); navigate('/g/p3'); }} />
            ))}
          </div>
        </>
      )}
      <div className="spacer" />
      <Fict>Suggestions are fictional sample data.</Fict>
    </Screen>
  );
}
