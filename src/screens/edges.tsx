import { useState } from 'react';
import { venue } from '../venue.config';
import { navigate } from '../router';
import { useStore } from '../store';
import { Banner, Button } from '../components/primitives';
import { Screen, Top } from '../components/layout';

export function E1() {
  const store = useStore();
  const [trying, setTrying] = useState(false);
  return (
    <Screen id="E1">
      <Top ctx={venue.name} />
      <Banner tone="warning" alert>No cars nearby right now. Nothing was added to your tab.</Banner>
      <h1 className="h2">What next?</h1>
      {trying
        ? <p className="body" role="status">Still looking. We'll text you as soon as a car accepts (simulated).</p>
        : <Button icon="clock" testId="keep-trying" onClick={() => setTrying(true)}>Keep trying for 5 min</Button>}
      <Button variant="secondary" icon="glass" onClick={() => { store.clearFault(); store.requestStaff(venue.seat); navigate('/g/p3w'); }}>Ask the bartender</Button>
      <div className="spacer" />
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
