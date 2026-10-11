import { useEffect } from 'react';
import { venue } from '../venue.config';
import { navigate, type Route } from '../router';
import { useDemoState, useStore } from '../store';
import { parseHandoff } from '../lib/handoff';
import { readUrlLink } from '../lib/urlLink';
import { Home } from './home';
import { morningFor } from '../lib/morning';
import { fmt } from '../lib/money';
import { Banner, Button, Card } from '../components/primitives';
import { Screen, Top } from '../components/layout';
import type { Fault, FareScenario } from '../store/types';
import { staffLinkHash } from './entry';

export const FAULTS: { id: Fault; label: string; route: string }[] = [
  { id: 'E1', label: 'E1 No car available', route: '/g/e1' },
  { id: 'E2', label: 'E2 Price changed before booking', route: '/g/e2' },
  { id: 'E3', label: 'E3 Car is waiting', route: '/g/e3' },
  { id: 'E4', label: 'E4 Tab already closed', route: '/g/e4' },
  { id: 'E5', label: 'E5 No signal', route: '/g/e5' },
  { id: 'E6', label: 'E6 Driver cancelled', route: '/g/e6' },
  { id: 'E7', label: 'E7 Over the cap: your OK', route: '/g/e7' },
];

export const ALL_GUEST_ROUTES = [
  '/g/home', '/g/p1', '/g/p1h', '/g/p3w', '/g/p12', '/g/p12s', '/g/p2', '/g/p2t', '/g/p3',
  '/g/p4', '/g/p5', '/g/p5w', '/g/e3', '/g/p6', '/g/p7', '/g/p8', '/g/p13', '/g/p13f',
  '/g/e1', '/g/e2', '/g/e4', '/g/e5', '/g/e6', '/g/e7', '/g/inbox', '/g/m1', '/g/m2', '/g/p9', '/g/p10', '/g/p11', '/g/demo', '/o', '/o/summary', '/o/limits', '/o/bar',
];

/** Demo panel: faults (each starts from a fresh ride state), fare scenarios, tab link, reset. */
export function DemoPanel() {
  const store = useStore();
  const s = useDemoState();
  const m = morningFor(s);
  const scen: { id: FareScenario; label: string }[] = [
    { id: 'higher', label: 'Higher' }, { id: 'lower', label: 'Lower' }, { id: 'equal', label: 'Same' }, { id: 'over', label: 'Over cap' },
  ];
  const secondPhone = s.ride && !s.ride.pending
    ? `#/h?d=${btoa(JSON.stringify({ v: 1, venue: venue.slug, tab: s.ride.tab, seat: s.ride.seat, guest: s.ride.guest, ep: s.ride.entryPoint, q: s.ride.quoteCents, at: s.ride.bookedAt, dest: s.ride.dest.line })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
    : null;
  return (
    <Screen id="demo">
      <Top back="/g/home" ctx="Demo controls" />
      <h1 className="h2">Demo controls</h1>
      <p className="foot">Simulated. Each fault starts from a fresh ride, so faults never stack.</p>
      <p className="section-title">Edge cases</p>
      <div className="stack">
        {FAULTS.map((f) => (
          <Button key={f.id} variant="secondary" testId={`fault-${f.id}`} onClick={() => { store.applyFault(f.id); navigate(f.route); }}>{f.label}</Button>
        ))}
      </div>
      <p className="section-title">Driver search</p>
      <div className="stack">
        <Button variant="secondary" testId="force-no-driver" onClick={() => {
          store.setForceNoDriver(!s.forceNoDriver);
          const r = store.getState().ride;
          if (r && store.stageOf(r) === 'no_cars') navigate('/g/e1');
        }}>
          {s.forceNoDriver ? 'No driver found: on for the next request' : 'Force "No driver found"'}
        </Button>
        <Button variant="secondary" testId="force-stale" onClick={() => store.setForceStaleQuote(!s.forceStaleQuote)}>
          {s.forceStaleQuote ? 'Stale quote: on (new price, new slide)' : 'Force "stale quote" (older than 5 min)'}
        </Button>
      </div>
      <p className="section-title">Tab link</p>
      <Card>
        <p className="callout" data-testid="link-status">{s.linkedTab ? `Linked to ${s.linkedTab.seat}, tab #${s.linkedTab.tab}` : 'Not linked to a tab'}</p>
        <div className="gap-s3" />
        {s.linkedTab
          ? <Button variant="secondary" testId="unlink" onClick={() => store.unlinkTab()}>Unlink this phone</Button>
          : <Button variant="secondary" testId="relink" onClick={() => store.linkTab({ tab: venue.tabNumber, seat: venue.seat, guest: venue.guest.name, via: 'table_qr' })}>Link to {venue.seat}</Button>}
      </Card>
      <p className="section-title">Saved home</p>
      {s.savedHome
        ? <Button variant="secondary" testId="forget-home" onClick={() => store.clearSavedHome()}>Forget saved home (first-time guest)</Button>
        : <Button variant="secondary" testId="restore-home" onClick={() => store.saveHome(venue.guest.home)}>Restore saved home</Button>}
      <p className="section-title">Final fare (morning receipt {fmt(m.totalCents)})</p>
      <div className="seg" role="group" aria-label="Final fare scenario">
        {scen.map((x) => <button key={x.id} type="button" aria-pressed={(s.ride?.scenario ?? s.fareScenario) === x.id} data-testid={`scen-${x.id}`} onClick={() => store.setFareScenario(x.id)}>{x.label}</button>)}
      </div>
      <Button variant="secondary" testId="price-moves" onClick={() => store.setPriceMovesOnRefresh(!s.priceMovesOnRefresh)}>
        {s.priceMovesOnRefresh ? 'Next re-quote: price goes up (on)' : 'Next re-quote: same price (off)'}
      </Button>
      <p className="section-title">Ride</p>
      <Button variant="secondary" testId="panel-next" onClick={() => store.advanceRide()}>Next ride status</Button>
      <Button variant="secondary" href={staffLinkHash()}>Open the staff link (P2)</Button>
      {secondPhone && <Card><p className="foot">Second phone link (same ride state):</p><a className="textlink" href={secondPhone} data-testid="second-phone-link">Open on another phone</a></Card>}
      <p className="section-title">All guest screens</p>
      <div className="grid-2">
        {ALL_GUEST_ROUTES.map((r) => <a key={r} className="btn btn--secondary" href={`#${r}?preview=1`}>{r.replace('/g/', '').toUpperCase()}</a>)}
      </div>
      <Button variant="bad" testId="panel-reset" onClick={() => { store.resetDemoData(readUrlLink(location, venue.seat)); navigate('/g/home'); }}>Reset demo data</Button>
    </Screen>
  );
}

/** Staff link: #/h?d=... (tab, entry point, quote, optional bookedAt). */
export function HandoffRoute({ route }: { route: Route }) {
  const store = useStore();
  const res = parseHandoff(route.query.get('d'), venue.slug);
  useEffect(() => {
    if (!res.ok) return;
    store.openHandoff(res.handoff);
    const st = store.getState();
    if (st.ride) navigate('/g/p4', { replace: true });
    else if (st.savedHome) navigate('/g/home', { replace: true });
    else navigate('/g/p2', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (res.ok) return <Screen id="handoff"><p className="body" role="status">Opening your link...</p></Screen>;
  return (
    <Screen id="handoff-error">
      <Top />
      <Banner tone="warning" alert>This link doesn't work. Please ask a staff member. Nothing was booked.</Banner>
      <Button variant="secondary" onClick={() => navigate('/g/home')}>Go home</Button>
    </Screen>
  );
}

/** Table QR web entry: #/v?tab=4468&seat=Table%207 (or ?tab= in the query string).
 *  Links the tab and shows the same two-tap home; the URL keeps its params so a refresh stays linked. */
export function TableQrRoute({ route }: { route: Route }) {
  const store = useStore();
  const tab = route.query.get('tab');
  const seat = (route.query.get('seat') ?? venue.seat).slice(0, 24);
  useEffect(() => {
    const cur = store.getState().linkedTab;
    if (tab && /^[\w-]{1,12}$/.test(tab) && (cur?.tab !== tab || cur?.seat !== seat)) store.linkTab({ tab, seat, guest: venue.guest.name, via: 'table_qr' });
  }, [tab, seat, store]);
  return <Home />;
}
