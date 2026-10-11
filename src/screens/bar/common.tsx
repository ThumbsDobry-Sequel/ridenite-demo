import { useEffect, useState, type ReactNode } from 'react';
import qrcode from 'qrcode-generator';
import { navigate } from '../../router';
import { useDemoState, useStore } from '../../store';
import { useNow } from '../../hooks';
import { T, venue } from '../../venue.config';
import { VenueLogo } from '../../components/layout';
import { fmtET } from '../../lib/confirmRecord';
import { Icon, type IconName } from '../../components/Icon';
import type { Tone } from '../../components/primitives';
import type { Stage } from '../../lib/rideState';
import type { BarRide, BarTab } from '../../store/types';
import type { EntryPoint } from '../../lib/handoff';
import { tabItems } from '../../lib/tab';

/* Bartender phone shell (Riley, bartender-phone-layout.md section 1). */

export const EP_LABEL: Record<EntryPoint, string> = { guest_request: 'Guest asked', staff_offer: 'I offered' };
export const EP_HISTORY: Record<EntryPoint, string> = { guest_request: 'Guest request', staff_offer: 'Staff offer' };

/** Bar status words (UI 4e). */
export function barStatus(stage: Stage, ride: BarRide): { label: string; tone: Tone; icon: IconName } {
  switch (stage) {
    case 'pending': return { label: 'Guest confirming on their phone', tone: 'warning', icon: 'phone' };
    case 'requested': return { label: 'Requested', tone: 'info', icon: 'clock' };
    case 'en_route': return { label: `Driver on the way (${ride.carInfo.plate})`, tone: 'info', icon: 'car' };
    case 'near': return { label: '2 min away', tone: 'info', icon: 'car' };
    case 'arrived': return { label: 'Arrived', tone: 'success', icon: 'pin' };
    case 'picked_up': return { label: 'Picked up', tone: 'info', icon: 'home' };
    case 'complete': return { label: 'Completed', tone: 'neutral', icon: 'check' };
    case 'canceled_by_driver': return { label: 'Driver declined. Rebook?', tone: 'bad', icon: 'alert' };
    case 'no_cars': return { label: 'No driver found yet', tone: 'warning', icon: 'clock' };
    case 'canceled_by_guest': return { label: 'Cancelled', tone: 'neutral', icon: 'check' };
  }
}

export function StatusLine({ tone, icon, children, testId }: { tone: Tone; icon: IconName; children: ReactNode; testId?: string }) {
  return <p className={`bstatus bstatus--${tone}`} data-testid={testId}><Icon name={icon} /><span>{children}</span></p>;
}

/** "Bar 3" reads "Bar seat 3" on the booking sheet header (UI 7 B3). */
export const seatTitle = (seat: string) => seat.replace(/^Bar (\d+)$/, 'Bar seat $1');
export const tabCents = (t: BarTab) => tabItems(t.items).reduce((a, i) => a + i.cents, 0);

export function useWide(): boolean {
  const q = '(min-width: 768px)';
  const [wide, setWide] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

export function ridesTonight(earlier: number, rides: BarRide[]): number {
  return earlier + rides.length;
}

export function BarHeader() {
  const store = useStore();
  const s = useDemoState();
  const now = useNow(1000);
  const wide = useWide();
  const pill = <span className="chip chip--success bhead__pill" data-testid="bar-status-pill"><Icon name="check" />{venue.bar.status}</span>;
  return (
    <div className="bhead" data-testid="bar-header">
      <div className="bhead__row">
        <span className="bhead__venue"><VenueLogo /></span>
        {wide && pill}
        <span className="bhead__clock num" data-testid="bar-clock">{fmtET(now)}</span>
        {wide && (
          <button type="button" className="btn btn--primary bhead__book" data-testid="bar-book-top" onClick={() => navigate('/b/book')}>
            <Icon name="car" /><span>Book ride</span>
          </button>
        )}
      </div>
      <div className="bhead__subrow">
        <p className="bhead__sub" data-testid="rides-tonight">Rides tonight: {ridesTonight(s.bar.earlierRides, store.barRides())}</p>
        {!wide && pill}
      </div>
    </div>
  );
}

const TABS: { to: string; label: string; icon: IconName; match: string[] }[] = [
  { to: '/b/tonight', label: 'Tonight', icon: 'glass', match: ['/b/tonight', '/b'] },
  { to: '/b/live', label: 'Live', icon: 'car', match: ['/b/live'] },
  { to: '/b/history', label: 'History', icon: 'list', match: ['/b/history'] },
  { to: '/b/more', label: 'More', icon: 'menu', match: ['/b/more', '/b/settings', '/b/tabs', '/b/tab', '/b/plate'] },
];

export function BarTabBar({ path }: { path: string }) {
  return (
    <nav className="btabbar" aria-label="Bartender" data-testid="bar-tabbar">
      {TABS.map((t) => {
        const on = t.match.includes(path);
        return (
          <button key={t.to} type="button" className={`btabbar__item${on ? ' is-on' : ''}`} aria-current={on ? 'page' : undefined}
            data-testid={`bar-tab-${t.label.toLowerCase()}`} onClick={() => navigate(t.to)}>
            <Icon name={t.icon} /><span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Sticky 64 px full-width Book ride (Tonight and Live only). */
export function BookRideBar() {
  return (
    <div className="bbook">
      <button type="button" className="btn btn--primary bbook__btn" data-testid="bar-book" onClick={() => navigate('/b/book')}>
        <Icon name="car" /><span>Book ride</span>
      </button>
    </div>
  );
}

/** Header-level 44 px "Book" for screens without the sticky button. */
export function HeaderBook() {
  return (
    <button type="button" className="btn btn--secondary bsmall" data-testid="bar-book-small" onClick={() => navigate('/b/book')}>
      <Icon name="car" /><span>Book</span>
    </button>
  );
}

export function SheetHead({ title, onBack, backLabel = 'Back', right, testId }: { title: ReactNode; onBack: () => void; backLabel?: string; right?: ReactNode; testId?: string }) {
  return (
    <div className="bsheet__head" data-testid={testId}>
      <button type="button" className="bback" onClick={onBack} data-testid="sheet-back"><Icon name="back" />{backLabel}</button>
      <h1 className="bsheet__title">{title}</h1>
      {right}
    </div>
  );
}

/** QR drawn from module data with currentColor (tokens only, no hard-coded colors). */
export function QrCode({ text, label, testId }: { text: string; label: string; testId?: string }) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m = 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  return (
    <figure className="bqr" data-testid={testId}>
      <svg viewBox={`0 0 ${n + 2 * m} ${n + 2 * m}`} role="img" aria-label={label} shapeRendering="crispEdges">
        <rect width={n + 2 * m} height={n + 2 * m} className="bqr__bg" />
        <path d={d} className="bqr__fg" />
      </svg>
    </figure>
  );
}

/** Role switch: same phone shows the guest flow. */
export function toGuest() { navigate('/g/home'); }

/** Legal-cleared ride status for the bar (Harper memo): "Ride requested" until the driver accepts, then "Ride booked". */
export function barRideHeadline(stage: Stage, tab: string, closed: boolean): string | null {
  if (stage === 'requested') return 'Ride requested. Finding a driver.';
  if (stage === 'en_route' || stage === 'near' || stage === 'arrived') return `Ride booked. Fare goes on ${T.bill} #${tab} at pickup.`;
  if (stage === 'picked_up') return `Picked up. Fare on ${T.bill} #${tab}.`;
  void closed;
  return null;
}
