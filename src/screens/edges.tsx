import { venue } from '../venue.config';
import { navigate } from '../router';
import { useDemoState, useStore } from '../store';
import { useNow } from '../hooks';
import { fmt } from '../lib/money';
import { Banner, Button } from '../components/primitives';
import { Screen, Top } from '../components/layout';

/** No driver found (SCOPE "Ride status and charge timing"): nothing charged; ask staff, or keep looking. */
export function E1() {
  const store = useStore();
  const s = useDemoState();
  useNow(1000);
  const keep = () => {
    const r = store.keepLooking();
    if (r === 'stale') navigate('/g/p3?stale=1');
    else if (r === 'looking') navigate('/g/p4');
    else navigate('/g/home');
  };
  return (
    <Screen id="E1">
      <Top ctx={venue.name} />
      <h1 className="h2" role="status" data-testid="no-driver-title">No driver found yet.</h1>
      <p className="body" data-testid="no-driver-note">Nothing was added to your tab.</p>
      {s.ride && <p className="foot">Your quote was {fmt(s.ride.quoteCents)}. If it is more than 5 minutes old, you'll see the new price before we look again.</p>}
      <div className="spacer" />
      <Button icon="glass" testId="ask-staff-car" onClick={() => { store.cancelRide(); store.requestStaff(venue.seat); navigate('/g/p3w'); }}>Ask staff for a car</Button>
      <Button variant="secondary" icon="clock" testId="keep-looking" onClick={keep}>Keep looking</Button>
      <p className="foot">Staff can see this too.</p>
    </Screen>
  );
}

export function E4() {
  const store = useStore();
  return (
    <Screen id="E4">
      <Top ctx={venue.name} />
      <Banner tone="info" icon="receipt">Your tab here is already closed. Nothing was added to it.</Banner>
      <h1 className="h2">You can still get a car</h1>
      <Button icon="glass" onClick={() => { store.clearFault(); store.requestStaff(venue.seat); navigate('/g/p3w'); }}>Ask staff to add it</Button>
      <div className="spacer" />
      <p className="foot">Staff can open a ride-only check for you.</p>
    </Screen>
  );
}

export function E6() {
  const store = useStore();
  return (
    <Screen id="E6">
      <Top ctx={venue.name} />
      <Banner tone="bad" alert>Your driver cancelled. Nothing was added to your tab.</Banner>
      <h1 className="h2">Please see the bar staff to rebook</h1>
      <p className="body muted">Staff were told on their screen and can rebook in one tap, with another service if needed.</p>
      <div className="spacer" />
      <Button size="xl" icon="hand" onClick={() => { store.cancelRide(); store.requestStaff(venue.seat); navigate('/g/p3w'); }}>Ask staff to rebook</Button>
      <Button variant="secondary" icon="help" onClick={() => navigate('/g/p8')}>Help</Button>
    </Screen>
  );
}
