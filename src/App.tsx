import { useEffect, useRef, useState, type ReactNode } from 'react';
import { navigate, parseHash, useRoute, type Route } from './router';
import { useDemoState, useStore } from './store';
import { TRIP_ROUTES, useOnline } from './hooks';
import { readUrlLink } from './lib/urlLink';
import { T, venue } from './venue.config';
import { APP_VERSION, BUILD_TIME_ET } from './build-info';
import { STAGE_ROUTE } from './lib/rideState';
import { Button, Sheet } from './components/primitives';
import { Icon } from './components/Icon';
import { Screen, Top } from './components/layout';
import { Home } from './screens/home';
import { P1, P1h, P3w, P12, P12s } from './screens/entry';
import { P2, P2t } from './screens/where';
import { E2, P3 } from './screens/confirm';
import { E7, E3, E5, P13, P13f, P4, P5, P5w, P6, P7, P8 } from './screens/trip';
import { E1, E4, E6 } from './screens/edges';
import { E8, Inbox, M1, M2, P10, P11, P9, SampleTrafficReceipt } from './screens/morning';
import { DemoPanel, HandoffRoute, TableQrRoute } from './screens/demo';
import { OwnerBar, OwnerStatement, OwnerIndex, OwnerLimits, OwnerSummary } from './screens/owner';
import { BarApp, BAR_PATHS } from './screens/bar/BarApp';

const ROUTES: Record<string, (r: Route) => ReactNode> = {
  '/': () => <Home />, '/g': () => <Home />, '/g/home': () => <Home />,
  '/g/p1': () => <P1 />, '/g/p1h': () => <P1h />, '/g/p3w': () => <P3w />, '/g/p12': () => <P12 />, '/g/p12s': () => <P12s />,
  '/g/p2': () => <P2 />, '/g/p2t': (r) => <P2t route={r} />, '/g/p3': () => <P3 />, '/g/e2': () => <E2 />,
  '/g/p4': () => <P4 />, '/g/p5': () => <P5 />, '/g/p5w': () => <P5w />, '/g/e3': () => <E3 />, '/g/p6': () => <P6 />,
  '/g/p7': () => <P7 />, '/g/p8': () => <P8 />, '/g/p13': () => <P13 />, '/g/p13f': () => <P13f />, '/g/e5': () => <E5 />,
  '/g/e1': () => <E1 />, '/g/e4': () => <E4 />, '/g/e6': () => <E6 />,
  '/g/inbox': () => <Inbox />, '/g/m1': () => <M1 />, '/g/m2': () => <M2 />, '/g/p9': () => <P9 />, '/g/p10': () => <P10 />,
  '/g/p11': () => <P11 />, '/g/e7': () => <E7 />, '/g/e8': () => <E8 />, '/g/sample-traffic': () => <SampleTrafficReceipt />, '/g/demo': () => <DemoPanel />,
  '/h': (r) => <HandoffRoute route={r} />, '/v': (r) => <TableQrRoute route={r} />,
  '/o': () => <OwnerIndex />, '/o/summary': () => <OwnerSummary />, '/o/limits': () => <OwnerLimits />, '/o/bar': () => <OwnerBar />, '/o/statement': () => <OwnerStatement />,
};
const DAY = ['/g/inbox', '/g/m1', '/g/m2', '/g/p9', '/g/p10', '/g/p11', '/g/e8', '/g/sample-traffic'];

function NotFound() {
  return (
    <Screen id="not-found">
      <Top />
      <h1 className="h2">We couldn't find this page.</h1>
      <Button variant="secondary" onClick={() => navigate('/g/home')}>Go home</Button>
    </Screen>
  );
}

/** SIMULATED DEMO capsule: always visible, sticky, clears the notch. Long press opens Reset. */
function SimBar({ onMenu, onLongPress }: { onMenu: () => void; onLongPress: () => void }) {
  const t = useRef<number | undefined>(undefined);
  const start = () => { t.current = window.setTimeout(onLongPress, 650); };
  const stop = () => window.clearTimeout(t.current);
  return (
    <header className="simbar" data-testid="sim-banner">
      <span className="simbar__label" data-testid="sim-label"
        onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}>
        SIMULATED DEMO
      </span>
      <span className="simbar__note">Sample data. No real rides or charges.</span>
      <button type="button" className="menu-btn" onClick={onMenu} data-testid="menu-btn" aria-haspopup="dialog">
        <Icon name="menu" /> Menu
      </button>
    </header>
  );
}

function Menu({ onClose, onReset, bar }: { onClose: () => void; onReset: () => void; bar: boolean }) {
  const store = useStore();
  const s = useDemoState();
  const go = (to: string) => { onClose(); navigate(to); };
  const ride = s.ride;
  if (bar) {
    return (
      <Sheet title="Menu" onClose={onClose} testId="menu-sheet" detent="large">
        <Button variant="secondary" icon="venue" onClick={() => go('/b/tonight')}>Tonight</Button>
        <Button variant="secondary" icon="car" onClick={() => go('/b/live')}>Live rides</Button>
        <Button variant="secondary" icon="gear" onClick={() => go('/b/settings')}>Settings</Button>
        <Button variant="secondary" icon="person" onClick={() => go('/g/home')} testId="menu-guest">Switch to guest view</Button>
        <Button variant="bad" testId="menu-reset" onClick={onReset}>Reset demo data</Button>
        <button type="button" className="textlink" onClick={onClose}>Close</button>
        <p className="build-stamp" data-testid="build-stamp">Version {APP_VERSION} · built {BUILD_TIME_ET}</p>
      </Sheet>
    );
  }
  return (
    <Sheet title="Menu" onClose={onClose} testId="menu-sheet" detent="large">
      {ride && <Button variant="secondary" icon="car" onClick={() => go(STAGE_ROUTE[store.stageOf(ride)])}>Ride status</Button>}
      <Button variant="secondary" icon="home" onClick={() => go('/g/home')}>Home</Button>
      <Button variant="secondary" icon="receipt" onClick={() => go('/g/inbox')}>Receipts</Button>
      <Button variant="secondary" icon="venue" onClick={() => go('/g/p1')}>Table QR page</Button>
      <Button variant="secondary" icon="help" onClick={() => go('/g/p1h')}>How it works</Button>
      <Button variant="secondary" icon="hand" onClick={() => go('/g/p12')}>Ask staff quietly</Button>
      <Button variant="secondary" icon="gear" onClick={() => go('/g/demo')} testId="menu-demo">Demo controls</Button>
      <Button variant="secondary" icon="list" onClick={() => go('/o')} testId="menu-owner">Owner preview</Button>
      <Button variant="secondary" icon="venue" onClick={() => go('/b')} testId="menu-bar">Switch to {T.staff} view</Button>
      <Button variant="bad" testId="menu-reset" onClick={onReset}>Reset demo data</Button>
      <button type="button" className="textlink" onClick={onClose}>Close</button>
      <p className="build-stamp" data-testid="build-stamp">Version {APP_VERSION} · built {BUILD_TIME_ET}</p>
    </Sheet>
  );
}

export function App() {
  const store = useStore();
  const s = useDemoState();
  const route = useRoute();
  const online = useOnline();
  const [menu, setMenu] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [toast, setToast] = useState('');

  // Resolve a pending ride whose undo window passed (also after backgrounding or reload).
  useEffect(() => {
    store.tick();
    const id = setInterval(() => store.tick(), 500);
    const vis = () => store.tick();
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [store]);

  // Every load is a fresh demo: a reload on a trip screen has no ride, so go home
  // (add ?preview=1 to view a trip screen with sample data, used by QA links).
  useEffect(() => {
    const r = parseHash(location.hash);
    const trip = [...TRIP_ROUTES, '/g/p8', '/g/e5'];
    if (trip.includes(r.path) && !store.getState().ride && r.query.get('preview') !== '1') navigate('/g/home', { replace: true });
  }, [store]);

  // Real offline with an active ride: show E5 with the last-known ride.
  useEffect(() => {
    if (!online && store.hasActiveRide() && route.path !== '/g/e5') navigate('/g/e5');
  }, [online, route.path, store, s.ride]);

  useEffect(() => {
    if (route.query.get('undone') === '1') setToast(`Undone. Nothing was booked or added to your ${T.bill}.`);
    if (route.query.get('canceled') === '1') setToast('Cancelled. Nothing was booked.');
  }, [route]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 5000); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { window.scrollTo(0, 0); }, [route.path]);

  const isBar = route.path === '/b' || route.path.startsWith('/b/');
  const doReset = (to?: string) => {
    store.resetDemoData(readUrlLink(location, venue.seat));
    setMenu(false); setConfirmReset(false);
    setToast('Demo data reset.');
    navigate(to ?? (isBar ? '/b' : '/g/home'));
  };
  useEffect(() => {
    const on = (e: Event) => doReset((e as CustomEvent<{ to?: string }>).detail?.to);
    window.addEventListener('ridenite:reset', on);
    return () => window.removeEventListener('ridenite:reset', on);
  });
  // Role switcher: the same phone plays guest or bartender, chosen by the route.
  useEffect(() => {
    const role = isBar ? 'bartender' : 'guest';
    if (store.getState().role !== role) store.setRole(role);
  }, [isBar, store]);

  const render = isBar ? (BAR_PATHS.includes(route.path) ? (r: Route) => <BarApp route={r} /> : undefined) : ROUTES[route.path];
  return (
    <div className={`app${isBar ? ' app--bar' : ''}`} data-theme={DAY.includes(route.path) ? 'day' : 'night'} data-role={isBar ? 'bartender' : 'guest'}>
      <SimBar onMenu={() => setMenu(true)} onLongPress={() => setConfirmReset(true)} />
      <div className="sr-only" aria-live="polite" role="status">{toast}</div>
      {toast && <div className="toast" data-testid="toast">{toast}</div>}
      {render ? render(route) : <NotFound />}
      {menu && <Menu onClose={() => setMenu(false)} onReset={() => doReset()} bar={isBar} />}
      {confirmReset && (
        <Sheet title="Reset demo data?" onClose={() => setConfirmReset(false)} testId="reset-sheet">
          <p className="callout">Clears rides, receipts and settings on this phone and starts the demo fresh.</p>
          <Button variant="bad" testId="reset-confirm" onClick={() => doReset()}>Reset</Button>
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
        </Sheet>
      )}
      <p className="fict app-foot">SIMULATED DEMO. Fictional data only.</p>
    </div>
  );
}
