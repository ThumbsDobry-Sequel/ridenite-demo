import { useEffect, useState } from 'react';
import { T, venue } from '../venue.config';
import { navigate } from '../router';
import { useStore } from '../store';
import { encodeHandoff } from '../lib/handoff';
import { Button, Card, Fict, ListRow, Spinner, TextLink } from '../components/primitives';
import { Icon } from '../components/Icon';
import { Screen, Top } from '../components/layout';

/** P1 Table QR page (UI 5 P1). Neutral founder line (no safety words, Quinn/Nico Oct 11). */
export function P1() {
  const store = useStore();
  return (
    <Screen id="P1" tight>
      <Top ctx={venue.seat} />
      <h1 className="large-title">Your ride home, on your {T.bill}.</h1>
      <p className="body">Need to head out? Ask your {T.staff}, or tap below and staff will come over. You'll see the price before anything is booked.</p>
      <p className="foot">Need to get home? Ask staff for a car. It goes on your bar {T.bill}. No app, no phone, no separate payment.</p>
      <div className="spacer" />
      <Button size="xl" icon="hand" testId="ask-staff" onClick={() => { store.requestStaff(venue.seat); navigate('/g/p3w'); }}>
        Ask staff for a car
      </Button>
      <p className="callout center">Ride goes on your {T.bill} at {venue.name}. No app needed. You'll see the price first.</p>
      <Button variant="secondary" icon="help" onClick={() => navigate('/g/p1h')}>How it works</Button>
      <TextLink onClick={() => navigate('/g/p12')}>Ask quietly instead</TextLink>
      <p className="foot center">Rides are provided by licensed drivers. {venue.name} is shown as an illustrative example, not a live RideNite partner.</p>
      <Fict>Sample venue and data are fictional.</Fict>
    </Screen>
  );
}

export function P1h() {
  const store = useStore();
  return (
    <Screen id="P1h">
      <Top back="/g/p1" ctx={venue.name} />
      <h1 className="h2">How it works</h1>
      <ListRow static lead={<span className="choice-num">1</span>} title="Tell us where you're going." />
      <ListRow static lead={<span className="choice-num">2</span>} title="See the price before we book." />
      <ListRow static lead={<span className="choice-num">3</span>} title="It goes on your check." />
      <div className="spacer" />
      <Button icon="hand" onClick={() => { store.requestStaff(venue.seat); navigate('/g/p3w'); }}>Ask staff for a car</Button>
    </Screen>
  );
}

export const staffLinkHash = (q = venue.quoteCents) =>
  `#/h?d=${encodeHandoff({ v: 1, venue: venue.slug, tab: venue.tabNumber, seat: venue.seat, guest: venue.guest.name, ep: 'guest_request', q })}`;

/** P3w: staff are coming over. The staff text arrives as a simulated message. */
export function P3w() {
  const store = useStore();
  const [text, setText] = useState(false);
  useEffect(() => { const t = setTimeout(() => setText(true), 1500); return () => clearTimeout(t); }, []);
  return (
    <Screen id="P3w">
      <Top ctx={venue.guest.name} />
      <Spinner label="Waiting for staff" />
      <h1 className="h2 center">Got it. Someone from {venue.name} is coming over.</h1>
      <p className="body muted center" aria-live="polite">You'll get a text to pick where you're going and see the price.</p>
      {text && (
        <Card testId="sim-text">
          <p className="foot"><Icon name="chat" /> Text from RideNite (simulated)</p>
          <p className="callout">RideNite: {venue.name} staff sent you a link to pick where you're going. You'll see the price before anything is booked.</p>
          <a className="textlink" href={staffLinkHash()} data-testid="open-staff-link">Open the link</a>
        </Card>
      )}
      <div className="spacer" />
      <Button variant="secondary" onClick={() => { store.cancelStaffRequest(); navigate('/g/home'); }}>Cancel request</Button>
    </Screen>
  );
}

/** P12 quiet request (UI 5 P12). No name, no reason. */
export function P12() {
  const store = useStore();
  const [seat, setSeat] = useState<string>(venue.seat);
  return (
    <Screen id="P12">
      <Top back="/g/p1" ctx={venue.name} />
      <h1 className="h2">Ask staff for a car</h1>
      <p className="body muted">Send it quietly, or show this screen to any staff member.</p>
      <div className="card show-card"><p className="show-card__text">I'd like the house car.</p></div>
      <div className="field">
        <label htmlFor="seat">Where are you sitting? (optional)</label>
        <input className="input" id="seat" value={seat} onChange={(e) => setSeat(e.target.value)} autoComplete="off" maxLength={40} />
      </div>
      <div className="spacer" />
      <Button size="xl" icon="hand" testId="send-quietly" onClick={() => { store.sendQuietRequest(seat); navigate('/g/p12s'); }}>Send quietly</Button>
    </Screen>
  );
}

export function P12s() {
  const store = useStore();
  return (
    <Screen id="P12s">
      <Top ctx={venue.seat} />
      <div className="success-badge"><Icon name="check" /></div>
      <h1 className="h2 center">Thanks. A staff member will find you.</h1>
      <p className="body muted center">No need to explain.</p>
      <div className="spacer" />
      <Button variant="secondary" onClick={() => { store.cancelStaffRequest(); navigate('/g/home'); }}>Cancel request</Button>
    </Screen>
  );
}
