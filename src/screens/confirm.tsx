import { useState } from 'react';
import { venue } from '../venue.config';
import { navigate } from '../router';
import { useDemoState, useStore } from '../store';
import { capFor } from '../lib/fare';
import { fmt } from '../lib/money';
import { STAGE_ROUTE } from '../lib/rideState';
import { Banner, Button, Card, TextLink } from '../components/primitives';
import { Icon } from '../components/Icon';
import { BackButton, Screen, Top } from '../components/layout';

export const fareNote = (q: number) =>
  `${fmt(q)} on your tab at ${venue.name}. Final fare may differ by up to ${fmt(capFor(q))}. More than that and we'll ask you first. If it comes in lower, you get the difference back.`;

export const QUOTE_TTL_MS = 120_000;

/** P3 CONFIRM (Riley mockup p3-confirm): one card with destination, quote and cap line,
 *  sticky 88pt Confirm and 56pt Cancel. Re-quotes if open more than 2 minutes. */
export function P3() {
  const store = useStore();
  const s = useDemoState();
  const [openedAt, setOpenedAt] = useState(() => store.now());
  const [updated, setUpdated] = useState(false);
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
        <BackButton to="/g/home" />
        <span className="navbar__title">Confirm ride</span>
        <span className="navbar__end" />
      </div>
      {updated && <Banner tone="info">The price was updated. Check the new quote, then confirm again.</Banner>}
      <Card testId="quote-card">
        <p className="kv__k">Going to</p>
        <p className="h3" data-testid="confirm-dest">{isHome ? 'Home, ' : ''}{dest.line}</p>
        <p className="price price--xl" data-testid="quote">{fmt(q)}</p>
        <p className="callout" data-testid="tab-line">On your {venue.name} tab.</p>
        <p className="callout muted" data-testid="cap-line">Final fare may differ by up to {fmt(cap)}.</p>
        <p className="foot">More than that and we'll ask you first. If it comes in lower, you get the difference back.</p>
      </Card>
      <Card>
        <div className="kv"><span className="tile"><Icon name="pin" /></span><div><p className="kv__k">Pickup</p><p className="kv__v">{venue.pickupShort}</p></div></div>
        <div className="kv"><span className="tile"><Icon name="car" /></span><div><p className="kv__k">Car</p><p className="kv__v">Partner car, about {venue.etaMinutes} min</p></div></div>
        <div className="kv"><span className="tile"><Icon name="person" /></span><div className="grow"><p className="kv__k">Who's riding?</p>
          <div className="seg seg--2" role="group" aria-label="Who's riding?">
            <button type="button" aria-pressed={s.riders === 1} onClick={() => store.setRiders(1)}>Just me</button>
            <button type="button" aria-pressed={s.riders === 2} onClick={() => store.setRiders(2)}>Me + 1 to 3</button>
          </div></div></div>
        <TextLink onClick={() => navigate('/g/p2')}>Change destination</TextLink>
      </Card>
      <div className="sticky-actions">
        <Button size="xl" testId="confirm" onClick={confirm}>Confirm ride</Button>
        <Button variant="secondary" testId="cancel" onClick={() => navigate('/g/home')}>Cancel</Button>
        <p className="fict">You can undo for 10 seconds. Fictional sample fare.</p>
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
