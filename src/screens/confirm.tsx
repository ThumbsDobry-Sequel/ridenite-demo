import { useState } from 'react';
import { venue } from '../venue.config';
import { navigate } from '../router';
import { useDemoState, useStore } from '../store';
import { capFor } from '../lib/fare';
import { fmt } from '../lib/money';
import { STAGE_ROUTE } from '../lib/rideState';
import { Banner, Button, Card } from '../components/primitives';
import { Icon } from '../components/Icon';
import { BackButton, Screen, Top } from '../components/layout';

export const fareNote = (q: number) =>
  `${fmt(q)} on your tab at ${venue.name}. Final fare may differ by up to ${fmt(capFor(q))}. More than that and we'll ask you first. If it comes in lower, you get the difference back.`;

export const QUOTE_TTL_MS = 120_000;
/** Taps on Confirm and Undo are ignored this long after the screen appears. */
export const TAP_GUARD_MS = 600;

/** P3 CONFIRM (Riley mockup p3-confirm): one card with destination, quote and cap line,
 *  sticky 88pt Confirm and 56pt Cancel. Re-quotes if open more than 2 minutes. */
export function P3() {
  const store = useStore();
  const s = useDemoState();
  const [openedAt, setOpenedAt] = useState(() => store.now());
  const [updated, setUpdated] = useState(false);
  // Ignore taps for 0.6 s after this screen appears, so a fast double tap on Ride home never books.
  const [armedAt] = useState(() => store.now() + TAP_GUARD_MS);
  const dest = s.dest ?? s.savedHome ?? venue.guest.home;
  const q = s.quoteCents;
  const cap = capFor(q);
  const isHome = !!s.savedHome && s.savedHome.line === dest.line;

  if (store.hasActiveRide() && s.ride) {
    const ride = s.ride;
    return (
      <Screen id="P3">
        <Top back="/g/home" ctx={venue.guest.name} />
        <h1 className="h2">You already have a ride</h1>
        <p className="body">Only one ride at a time. Your ride to {ride.dest.line} is still going.</p>
        <div className="spacer" />
        <Button variant="secondary" icon="car" onClick={() => navigate(STAGE_ROUTE[store.stageOf(ride)])}>See your ride</Button>
      </Screen>
    );
  }

  const confirm = () => {
    if (store.now() < armedAt) return;
    // Stale quote: refresh first and never book silently on a changed price.
    if (store.now() - openedAt > QUOTE_TTL_MS) {
      const changed = store.refreshQuote();
      setOpenedAt(store.now());
      if (changed) { setUpdated(true); return; }
    }
    store.setDestination(dest);
    const res = store.createRide(fareNote(store.getState().quoteCents));
    if (res.refused === 'no_tab') { store.requestStaff(venue.seat); navigate('/g/p3w?cold=1'); return; }
    navigate('/g/p4');
  };

  return (
    <Screen id="P3" tight>
      <div className="navbar">
        <span className="back-wrap"><BackButton to="/g/home" /></span>
        <span className="navbar__title">Confirm ride</span>
        <span className="navbar__end"><button type="button" className="back-btn cancel-top" data-testid="cancel" onClick={() => navigate('/g/home')}>Cancel</button></span>
      </div>
      {updated && <Banner tone="info">The price was updated. Check the new quote, then confirm again.</Banner>}
      <Card testId="quote-card">
        <div className="row row--top">
          <div className="grow">
            <p className="kv__k">Going to</p>
            <p className="h3" data-testid="confirm-dest">{isHome ? 'Home, ' : ''}{dest.line}</p>
          </div>
          <button type="button" className="textlink textlink--inline change-link" data-testid="change-dest" onClick={() => navigate('/g/p2')}>Change</button>
        </div>
        <div className="seg seg--2" role="group" aria-label="Who's riding?" data-testid="riders">
          <button type="button" aria-pressed={s.riders === 1} onClick={() => store.setRiders(1)}>Just me</button>
          <button type="button" aria-pressed={s.riders === 2} onClick={() => store.setRiders(2)}>Me + 1 to 3</button>
        </div>
        <p className="price price--xl" data-testid="quote">{fmt(q)}</p>
        <p className="callout" data-testid="tab-line">On your {venue.name} tab.</p>
        <p className="callout muted cap-note" data-testid="cap-line"><Icon name="clock" />Final fare may differ by up to {fmt(cap)}.</p>
        <p className="foot">More than that and we'll ask you first. If it comes in lower, you get the difference back.</p>
        <p className="foot muted" data-testid="pickup-line">Pickup: {venue.pickupShort}<span className="eta-note"> Car in about {venue.etaMinutes} min.</span></p>
      </Card>
      <div className="sticky-actions">
        <Button size="xl" testId="confirm" onClick={confirm}>Confirm ride</Button>
        <Button variant="secondary" testId="cancel" className="cancel-bottom" onClick={() => navigate('/g/home')}>Cancel</Button>
        <p className="fict undo-note">You can undo for 10 seconds. Fictional sample fare.</p>
      </div>
    </Screen>
  );
}

/** E2 price changed before booking (UI 5 E2). Cap recomputed for the new quote. */
export function E2() {
  const store = useStore();
  const s = useDemoState();
  const prev = s.prevQuoteCents ?? venue.quoteCents;
  const q = s.prevQuoteCents ? s.quoteCents : venue.e2NewQuoteCents;
  return (
    <Screen id="E2">
      <Top ctx={venue.guest.name} />
      <Banner tone="info">The price changed before your car was booked. Nothing was added to your tab.</Banner>
      <Card>
        <div className="row"><span className="body muted">Was</span><s className="body muted num">{fmt(prev)}</s></div>
        <div className="row"><span className="body">New quote</span><span className="price">{fmt(q)}</span></div>
        <p className="callout cap-line"><Icon name="clock" /> Your new quote once you tap Yes. Final fare may differ by up to {fmt(capFor(q))}.</p>
      </Card>
      <div className="spacer" />
      <Button size="xl" icon="check" testId="e2-yes" onClick={() => {
        store.acceptNewQuote();
        const res = store.createRide(fareNote(q));
        navigate(res.refused === 'no_tab' ? '/g/p3w?cold=1' : '/g/p4');
      }}>Yes, {fmt(q)} is OK</Button>
      <Button variant="secondary" onClick={() => { store.applyFault('E1'); navigate('/g/e1'); }}>No, look for another car</Button>
    </Screen>
  );
}
