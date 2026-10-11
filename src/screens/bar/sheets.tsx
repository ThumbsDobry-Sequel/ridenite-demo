import { useEffect, useRef, useState } from 'react';
import { navigate, type Route } from '../../router';
import { useDemoState, useStore } from '../../store';
import { useNow } from '../../hooks';
import { venue } from '../../venue.config';
import { fmt } from '../../lib/money';
import { capFor } from '../../lib/fare';
import { handoffUrl, type EntryPoint, type Handoff } from '../../lib/handoff';
import { barConfirmLine } from '../../lib/confirmRecord';
import { Icon } from '../../components/Icon';
import { Chip } from '../../components/primitives';
import type { DropMode } from '../../store/types';
import { barRideHeadline, barStatus, EP_LABEL, QrCode, seatTitle, SheetHead, StatusLine, tabCents } from './common';
import { startBooking } from './tonight';

/* B2 Book ride, B3 booking sheet (tap 2), booked view, B3h help. No free-text input anywhere. */

const base = () => `${location.origin}${location.pathname.replace(/\/$/, '')}`;

export function B2() {
  const store = useStore();
  const s = useDemoState();
  const [ep, setEp] = useState<EntryPoint | null>(null);
  const open = s.bar.tabs.filter((t) => t.close === 'open' && !store.barActiveRide(t.tab));
  return (
    <main className="bsheet" data-screen="b2" id="main">
      <div className="bsheet__head">
        <h1 className="bsheet__title">Book a car</h1>
        <button type="button" className="bback" data-testid="b2-cancel" onClick={() => navigate('/b/tonight')}>Cancel</button>
      </div>
      <div className="bpair" role="group" aria-label="Entry point">
        <button type="button" className="btn btn--secondary bbtn-56 bseg" aria-pressed={ep === 'guest_request'} data-testid="b2-ask" onClick={() => setEp('guest_request')}>Guest asked</button>
        <button type="button" className="btn btn--secondary bbtn-56 bseg" aria-pressed={ep === 'staff_offer'} data-testid="b2-offer" onClick={() => setEp('staff_offer')}>I offered</button>
      </div>
      <p className="foot">We record only which one. No reason, notes or drink counts.</p>
      <div className="bpanel">
        <p className="callout"><b>Can I get you a car home? It goes on your tab.</b></p>
        <p className="foot">A car never replaces stopping service.</p>
      </div>
      <h2 className="bsection" id="whose">Whose tab?</h2>
      {!ep && <p className="foot" data-testid="b2-need-ep">Pick Guest asked or I offered first.</p>}
      <div className="blist" role="list" aria-labelledby="whose">
        {open.map((t) => (
          <button key={t.tab} type="button" role="listitem" className="brow" data-testid={`b2-tab-${t.tab}`} disabled={!ep}
            aria-disabled={!ep} onClick={() => ep && startBooking(store, t.tab, ep)}>
            <span className="grow">{t.seat} · {t.guest}</span><span className="num">{fmt(tabCents(t))}</span>
          </button>
        ))}
        <button type="button" role="listitem" className="brow" data-testid="b2-new" disabled={!ep} aria-disabled={!ep}
          onClick={() => { if (!ep) return; const tab = store.barNewGuest(); startBooking(store, tab, ep); }}>
          <span className="grow">+ New guest: sample guest, opens a tab</span><Icon name="person" />
        </button>
      </div>
    </main>
  );
}

const MODES: { id: DropMode; label: string }[] = [
  { id: 'link', label: 'Text guest a link' },
  { id: 'qr', label: 'Show a QR' },
  { id: 'staff', label: "I'll enter the drop-off" },
];

export function B3({ route }: { route: Route }) {
  const store = useStore();
  const s = useDemoState();
  const d = s.bar.draft;
  const booking = useRef(false);
  const tabParam = route.query.get('tab');
  useEffect(() => {
    // Every load is a fresh demo: no draft means nothing to show (go back to Tonight).
    if (!store.getState().bar.draft) navigate('/b/tonight', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!d || (tabParam && d.tab !== tabParam)) return <main className="bsheet" data-screen="b3" id="main" />;
  const t = s.bar.tabs.find((x) => x.tab === d.tab)!;
  const first = t.guest.split(' ')[0];
  const q = d.quoteCents;
  const ready = q != null && d.sawPrice;
  const helper = q == null ? 'Waiting for a price.' : !d.sawPrice ? 'Check "Guest saw the price" first.' : '';
  const perk = s.bar.settings.priceMode === 'venue_perk';
  const pickup = d.sideDoor ? venue.bar.sideDoor : 'front door';
  const h: Handoff = { v: 1, venue: venue.slug, tab: t.tab, seat: t.seat, guest: t.guest, ep: d.ep, q: q ?? venue.quoteCents };
  const link = handoffUrl(h, base());
  const book = () => {
    if (!ready || booking.current) return;
    booking.current = true;
    const r = store.barBook();
    if (r.ok) navigate(`/b/booked?ride=${encodeURIComponent(r.ride.id)}`, { replace: true });
    else booking.current = false;
  };
  const back = () => { store.barCancelDraft(); navigate('/b/tonight'); };
  return (
    <main className="bsheet bsheet--b3" data-screen="b3" id="main">
      <SheetHead title={<>{seatTitle(t.seat)} · tab #{t.tab}</>} onBack={back}
        right={<Chip tone="neutral" testId="b3-ep">{EP_LABEL[d.ep]}</Chip>} />
      <p className="foot" data-testid="b3-guest">{t.guest} ...{t.phoneLast4} · pickup: {pickup}</p>
      <h2 className="bsection" id="dropoff">Drop-off</h2>
      <div className="bmodes" role="radiogroup" aria-labelledby="dropoff" data-testid="b3-modes">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={d.mode === m.id} className={`bmode bmode--${m.id}`}
            data-testid={`b3-mode-${m.id}`} onClick={() => store.barSetMode(m.id)}>
            <span className="bradio" aria-hidden="true" />{m.label}
          </button>
        ))}
      </div>
      {d.mode !== 'staff' && d.sawBy !== 'guest' && (
        <div className="bpanel" data-testid="b3-waiting">
          {d.mode === 'link'
            ? <p className="callout">Link sent to ...{t.phoneLast4}. Waiting for {first} to pick a drop-off.</p>
            : (
              <>
                <QrCode text={link} label={`QR code for ${first}'s ride link`} testId="b3-qr" />
                <p className="callout">Ask the guest to scan this.</p>
                <a className="textlink" href={link} data-testid="b3-qr-link">Open the guest link on this phone</a>
              </>
            )}
          <button type="button" className="btn btn--secondary bbtn-44" data-testid="b3-sim-reply" onClick={() => store.barSimulateGuestReply(t.tab)}>
            Demo: {first} picks a drop-off and says yes
          </button>
        </div>
      )}
      {d.mode === 'staff' && (
        <div className="blist" role="radiogroup" aria-label="Drop-off the guest tells you" data-testid="b3-dests">
          <p className="foot">Pick the drop-off the guest tells you, then show them the price. Sample list, no typing.</p>
          {venue.addresses.slice(3, 7).map((a) => (
            <button key={a.line} type="button" role="radio" aria-checked={d.dest?.line === a.line} className="brow brow--44"
              data-testid={`b3-dest-${a.line.replace(/\W+/g, '-').toLowerCase()}`} onClick={() => store.barPickDest(a)}>
              <span className="bradio" aria-hidden="true" /><span className="grow">{a.line}<span className="foot"> {a.area.split(',')[0]}</span></span>
            </button>
          ))}
        </div>
      )}
      {q != null && d.dest && (
        <section className="bquote" data-testid="b3-quote-block" aria-live="polite">
          <p className="foot">Drop-off: {d.dest.area.split(',')[0]} ({d.sawBy === 'guest' ? `${first} entered` : 'you entered'})</p>
          <p className="foot">Local partner, {venue.etaMinutes} min</p>
          {d.prevQuoteCents != null && (
            <p className="bnote" role="status" data-testid="b3-price-changed"><Icon name="alert" />Price changed from {fmt(d.prevQuoteCents)}. Show the guest again.</p>
          )}
          <p className="bquote__price num" data-testid="b3-quote">{fmt(q)}</p>
          <p className="callout">Quote, goes on tab #{t.tab}.</p>
          <p className="callout" data-testid="b3-cap">Final fare may differ by up to {fmt(capFor(q))}.</p>
          {perk && <p className="callout" data-testid="b3-perk">Venue perk: {venue.name} covers the first {fmt(venue.perkCents)}. Guest pays {fmt(Math.max(0, q - venue.perkCents))}.</p>}
        </section>
      )}
      <button type="button" role="checkbox" aria-checked={d.sawPrice} aria-disabled={q == null} className="bcheck" data-testid="b3-saw"
        onClick={() => store.barToggleSawPrice()}>
        <span className="bcheck__box" aria-hidden="true">{d.sawPrice && <Icon name="check" />}</span>
        <span className="grow">Guest saw the price{d.sawBy === 'guest' && <span className="foot"> {first} said yes on their phone.</span>}</span>
      </button>
      <button type="button" className="textlink bbtn-44" data-testid="b3-help" onClick={() => navigate('/b/sheet/help')}>Guest says they feel unsafe?</button>
      <div className="bsticky">
        <button type="button" className="btn btn--primary bbtn-64" data-testid="b3-book" disabled={!ready} aria-describedby="b3-helper" onClick={book}>
          <Icon name="car" /><span>Book</span>
        </button>
        <p className="foot bhelper" id="b3-helper" data-testid="b3-helper" aria-live="polite">{helper}</p>
      </div>
      {q != null && (
        <div className="bdemo">
          <button type="button" className="textlink bbtn-44" data-testid="b3-demo-e2" onClick={() => store.barPriceChanged()}>Demo: price changes before booking</button>
        </div>
      )}
    </main>
  );
}

/** After tap 2: booked. QR and link carry tab, entry point, quote and booking time for the guest's phone. */
export function Booked({ route }: { route: Route }) {
  const store = useStore();
  const s = useDemoState();
  useNow(500);
  const ride = store.barRides().find((r) => r.id === route.query.get('ride'));
  // A fast second tap on Book must not land on a control of this screen (double-tap guard, 600 ms).
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!ride) navigate('/b/tonight', { replace: true });
    const t = setTimeout(() => setArmed(true), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!ride) return <main className="bsheet" data-screen="booked" id="main" />;
  const stage = store.stageOf(ride);
  const st = barStatus(stage, ride);
  const rec = barConfirmLine(s, ride);
  const closed = s.bar.tabs.find((x) => x.tab === ride.tab)?.close !== 'open';
  const headline = barRideHeadline(stage, ride.tab, closed);
  const h: Handoff = { v: 1, venue: venue.slug, tab: ride.tab, seat: ride.seat, guest: ride.guest, ep: ride.entryPoint, q: ride.quoteCents, at: ride.bookedAt, dest: ride.dest.line };
  const link = handoffUrl(h, base());
  const first = ride.guest.split(' ')[0];
  return (
    <main className="bsheet" data-screen="booked" id="main" style={armed ? undefined : { pointerEvents: 'none' }}>
      <SheetHead title={stage === 'requested' ? 'Ride requested' : 'Ride booked'} onBack={() => navigate('/b/tonight')} backLabel="Tonight" testId="booked-title" />
      {headline && <p className="body" role="status" data-testid="booked-headline"><b>{headline}</b></p>}
      <StatusLine tone={st.tone} icon={st.icon} testId="booked-status">{st.label}</StatusLine>
      <section className="bcard">
        <h2 className="bcard__title">{ride.seat} · {ride.guest}</h2>
        <p className="callout">Quoted fare {fmt(ride.quoteCents)}. Posts to tab #{ride.tab} at pickup.</p>
        <p className="foot">Entry point: {EP_LABEL[ride.entryPoint]}</p>
        {rec && <p className="foot" data-testid="booked-record">{rec.text}</p>}
      </section>
      <QrCode text={link} label={`QR code to follow ${first}'s ride`} testId="booked-qr" />
      <p className="callout">{first} can scan this to follow the ride on their phone.</p>
      <a className="textlink bbtn-44" href={link} data-testid="booked-link">Open the guest link</a>
      <div className="bsticky">
        <button type="button" className="btn btn--primary bbtn-56" data-testid="booked-live" onClick={() => navigate('/b/live')}>Go to Live rides</button>
      </div>
    </main>
  );
}

export function B3h() {
  return (
    <main className="bsheet" data-screen="b3h" id="main">
      <SheetHead title="Guest says they feel unsafe?" onBack={() => navigate('/b/sheet')} />
      <p className="body">Follow your venue's procedure first: manager, security, or 911 if needed. A car is one option. If the guest wants one, book it and keep pickup details on their phone only.</p>
      <section className="bpanel" data-testid="b3h-procedure">
        <h2 className="bsection">{venue.name} procedure</h2>
        <ol className="bsteps">{venue.bar.procedure.map((p) => <li key={p}>{p}</li>)}</ol>
      </section>
      <div className="bsticky">
        <button type="button" className="btn btn--secondary bbtn-56" data-testid="b3h-back" onClick={() => navigate('/b/sheet')}>Back to booking</button>
      </div>
    </main>
  );
}
