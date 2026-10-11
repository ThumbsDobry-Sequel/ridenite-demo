import { useEffect, type ReactNode } from 'react';
import { navigate, type Route } from '../../router';
import { useDemoState } from '../../store';
import { BarHeader, BarTabBar, BookRideBar, useWide } from './common';
import { B0, B1 } from './tonight';
import { B2, B3, B3h, Booked } from './sheets';
import { B4, B5 } from './live';
import { B10, B6, B8, B9, More } from './tab';

/* Bartender phone shell: header, one-column content, sticky Book ride (Tonight, Live), bottom tab bar.
   At 768 px and up: left nav, card grid, and sheets as a 520 px drawer over Tonight (UI spec 7). */

const PAGES: Record<string, (r: Route) => ReactNode> = {
  '/b/tonight': () => <B1 />, '/b/live': () => <B4 />, '/b/history': () => <B5 />, '/b/more': () => <More />,
  '/b/settings': (r) => <B8 route={r} />, '/b/tab': (r) => <B6 route={r} />,
};
const SHEETS: Record<string, (r: Route) => ReactNode> = {
  '/b/book': () => <B2 />, '/b/sheet': (r) => <B3 route={r} />, '/b/sheet/help': () => <B3h />, '/b/booked': (r) => <Booked route={r} />,
  '/b/plate': (r) => <B9 route={r} />, '/b/quiet': () => <B10 />,
};
const WITH_BOOK = ['/b/tonight', '/b/live'];
export const BAR_PATHS = ['/b', ...Object.keys(PAGES), ...Object.keys(SHEETS)];

function Frame({ path, children }: { path: string; children: ReactNode }) {
  const wide = useWide();
  return (
    <div className={`bshell${WITH_BOOK.includes(path) && !wide ? ' bshell--book' : ''}`} data-testid="bar-shell">
      <BarTabBar path={path} />
      <div className="bshell__main">
        <BarHeader />
        {children}
      </div>
      {WITH_BOOK.includes(path) && !wide && <BookRideBar />}
    </div>
  );
}

export function BarApp({ route }: { route: Route }) {
  const s = useDemoState();
  const wide = useWide();
  const path = route.path;
  useEffect(() => {
    if (path === '/b' && s.bar.welcomed) navigate('/b/tonight', { replace: true });
  }, [path, s.bar.welcomed]);
  if (path === '/b') return s.bar.welcomed ? null : <B0 />;
  const page = PAGES[path];
  if (page) return <Frame path={path}>{page(route)}</Frame>;
  const sheet = SHEETS[path];
  if (!sheet) return null;
  if (wide) {
    return (
      <>
        <Frame path="/b/tonight"><B1 /></Frame>
        <div className="bdrawer-layer">
          <div className="scrim" aria-hidden="true" onClick={() => navigate('/b/tonight')} />
          <div className="bdrawer" role="dialog" aria-modal="true" aria-label="Booking">{sheet(route)}</div>
        </div>
      </>
    );
  }
  return sheet(route);
}
