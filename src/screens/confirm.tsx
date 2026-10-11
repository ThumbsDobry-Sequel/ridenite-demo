import { areaLabel } from '../lib/tab';
import { QUOTE_VALID_MS } from '../lib/rideState';
import { useState } from 'react';
import { T, venue } from '../venue.config';
import { navigate, parseHash } from '../router';
import { useDemoState, useStore } from '../store';
import { capFor, maxChargeCents } from '../lib/fare';
import { fmt } from '../lib/money';
import { STAGE_ROUTE } from '../lib/rideState';
import { Banner, Button, Card } from '../components/primitives';
import { Icon } from '../components/Icon';
import { SlideToConfirm } from '../components/SlideToConfirm';
import type { ConfirmMethod } from '../store/types';
import { Screen, Top } from '../components/layout';

export const fareNote = (q: number) =>
  `${fmt(q)} on your ${T.bill} at ${venue.name}. Final fare may differ by up to ${fmt(capFor(q))}. ${maxLine(q)}`;

/** Money-promises memo (Harper): the most the guest is charged, from the live quote and cap. Never hardcoded. */
export const maxLine = (q: number) => `You pay the final fare, never more than ${fmt(maxChargeCents(q))} unless you approve a change.`;

/** Quote valid for 5 minutes (demo constant, SCOPE "Ride status and charge timing"). */
export const QUOTE_TTL_MS = QUOTE_VALID_MS;
/** Taps on Undo are ignored this long after the screen appears (a fast double action never undoes). */
export const TAP_GUARD_MS = 600;

/** P3 CONFIRM (Riley mockup p3-confirm): one card with destination, quote and cap line,
 *  slider and 56pt Cancel. Re-quotes if the quote is more than 5 minutes old. */
export function P3() {
  const store = useStore();
  const s = useDemoState();
  const [openedAt, setOpenedAt] = useState(() => store.now());
  const [updated, setUpdated] = useState(false);
  const [slideKey, setSlideKey] = useState(0);
  const stale = parseHash(location.hash).query.get('stale') === '1';
  const dest = s.dest ?? s.savedHome ?? venue.guest.home;
  const q = s.quoteCents;
  const cap = capFor(q);
  const perk = s.bar.settings.priceMode === 'venue_perk';
  const isHome = !!s.savedHome && s.savedHome.line === dest.line;

  if (store.hasActiveRide() && s.ride) {
    const ride = s.ride;
    return (
      <Screen id="P3">
        <Top back="/g/home" ctx={venue.guest.name} />
        <h1 className="h2">You already have a ride</h1>
        <p className="body">Only one ride at a time. Your ride to {areaLabel(ride.dest)} is still going.</p>
        <div className="spacer" />
        <Button variant="secondary" icon="car" onClick={() => navigate(STAGE_ROUTE[store.stageOf(ride)])}>See your ride</Button>
      </Screen>
    );
  }

  const confirm = (method: ConfirmMethod) => {
    // Stale quote: refresh first and never book silently on a changed price.
    if (store.getState().forceStaleQuote || store.now() - openedAt > QUOTE_TTL_MS) {
      store.setForceStaleQuote(false);
      const changed = store.refreshQuote();
      setOpenedAt(store.now());
      if (changed) { setUpdated(true); setSlideKey((k) => k + 1); return; }
    }
    store.setDestination(dest);
    const res = store.createRide(fareNote(store.getState().quoteCents), { method, by: 'guest', shownQuoteCents: store.getState().quoteCents });
    if (res.refused === 'no_tab') { store.requestStaff(venue.seat); navigate('/g/p3w?cold=1'); return; }
    navigate('/g/p4');
  };

  return (
    <Screen id="P3" tight>
      {/* No Back here (founder decision): Cancel under the slider is the one way out, nothing booked. */}
      <div className="navbar navbar--center">
        <span className="navbar__title">Confirm ride</span>
      </div>
      {updated && <Banner tone="info">The price was updated. Check the new quote, then confirm again.</Banner>}
      {stale && !updated && <Banner tone="info"><span data-testid="stale-banner">No driver yet, and the price changed. Check the new quote, then slide again. Nothing was added to your {T.bill}.</span></Banner>}
      <Card testId="quote-card">
        <div className="row row--top">
          <div className="grow">
            <p className="kv__k">Going to</p>
            <p className="h3" data-testid="confirm-dest">{isHome ? 'Home, ' : ''}{areaLabel(dest)}</p>
          </div>
          <button type="button" className="textlink textlink--inline change-link" data-testid="change-dest" onClick={() => navigate('/g/p2')}>Change</button>
        </div>
        <div className="seg seg--2" role="group" aria-label="Who's riding?" data-testid="riders">
          <button type="button" aria-pressed={s.riders === 1} onClick={() => store.setRiders(1)}>Just me</button>
          <button type="button" aria-pressed={s.riders === 2} onClick={() => store.setRiders(2)}>Me + 1 to 3</button>
        </div>
        <p className="price price--xl" data-testid="quote">{fmt(q)}</p>
        {/* Design rev 04 / 04.1 (locked): one full-strength paragraph, then the over-cap line. */}
        <p className="callout quote-para"><span data-testid="tab-line">{fmt(q)} goes on your tab when you're picked up.</span>{' '}<span data-testid="cap-line">Final fare may differ by up to {fmt(cap)}.</span></p>
        <p className="foot cap-more" data-testid="max-line">More than that and we'll ask you first. {maxLine(q)}</p>
        {perk && <p className="callout" data-testid="perk-line">Venue perk: {venue.name} takes the first {fmt(venue.perkCents)} off. You pay {fmt(Math.max(0, q - venue.perkCents))} on your {T.bill}.</p>}
      </Card>
      <Card testId="pickup-card" className="pickup-card">
        <div className="kvrow"><span className="kvrow__icon"><Icon name="pin" /></span><div><p className="kv__k">Pickup</p><p className="h3" data-testid="pickup-line">{venue.pickupShort.replace(/\.$/, '')}</p></div></div>
        <div className="kvrow"><span className="kvrow__icon"><Icon name="car" /></span><div><p className="kv__k">Car</p><p className="h3">Partner car, about {venue.etaMinutes} min</p></div></div>
      </Card>
      <div className="sticky-actions sticky-actions--slide">
        <SlideToConfirm key={slideKey} label="Slide to confirm" a11yLabel={`Confirm ride, ${fmt(q)} on your ${T.bill}`} onComplete={confirm} hint={false} />
        <Button variant="secondary" testId="cancel" className="cancel-bottom" onClick={() => navigate('/g/home?canceled=1')}>Cancel</Button>
        <p className="slide__hint foot" data-testid="slide-hint">Slide to confirm. You can undo for 10 seconds.</p>
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
      <Banner tone="info">The price changed before your car was booked. Nothing was added to your {T.bill}.</Banner>
      <Card>
        <div className="row"><span className="body muted">Was</span><s className="body muted num">{fmt(prev)}</s></div>
        <div className="row"><span className="body">New quote</span><span className="price">{fmt(q)}</span></div>
        <p className="callout cap-line"><Icon name="clock" /> Your new quote once you tap Yes. Final fare may differ by up to {fmt(capFor(q))}.</p>
      </Card>
      <div className="spacer" />
      <SlideToConfirm testId="e2-yes" label={`Slide: ${fmt(q)} is OK`} a11yLabel={`Yes, ${fmt(q)} is OK`} onComplete={(method) => {
        store.acceptNewQuote();
        const res = store.createRide(fareNote(q), { method, by: 'guest', shownQuoteCents: q });
        navigate(res.refused === 'no_tab' ? '/g/p3w?cold=1' : '/g/p4');
      }} />
      <Button variant="secondary" onClick={() => { store.applyFault('E1'); navigate('/g/e1'); }}>No, look for another car</Button>
    </Screen>
  );
}
