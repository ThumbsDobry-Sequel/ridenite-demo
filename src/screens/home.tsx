import { nightShort } from '../lib/night';
import { bookedLine, isAccepted } from '../components/RideStatus';
import { useState } from 'react';
import { venue } from '../venue.config';
import { navigate } from '../router';
import { useDemoState, useStore } from '../store';
import { useNow } from '../hooks';
import { STAGE_LABEL, STAGE_ROUTE, type Stage } from '../lib/rideState';
import { morningFor } from '../lib/morning';
import { fmt } from '../lib/money';
import { Button, Chip, Sheet, type Tone } from '../components/primitives';
import { Icon, type IconName } from '../components/Icon';
import { Screen, VenueChip } from '../components/layout';
import { Belongings } from './trip';

export const STAGE_TONE: Record<Stage, Tone> = {
  pending: 'warning', requested: 'info', en_route: 'info', near: 'info', arrived: 'success', picked_up: 'info',
  complete: 'neutral', canceled_by_driver: 'bad', no_cars: 'warning', canceled_by_guest: 'neutral',
};

const HEADLINE: Partial<Record<Stage, string>> = {
  pending: 'Booking your ride.',
  requested: 'Ride requested.',
  en_route: 'Your car is on the way.',
  near: 'Your car is 2 min away.',
  arrived: 'Your car is here.',
  picked_up: 'On your way home.',
};

export function MoreRow({ icon, title, sub, onClick, testId }: { icon: IconName; title: string; sub: string; onClick: () => void; testId?: string }) {
  return (
    <button type="button" className="row-link" onClick={onClick} data-testid={testId}>
      <span className="tile"><Icon name={icon} /></span>
      <span className="stack-0"><span className="row-link__t">{title}</span><span className="row-link__d">{sub}</span></span>
      <span className="chev" aria-hidden="true">›</span>
    </button>
  );
}

/** HOME (default entry, Riley mockup p1-home / p1-active). Ride home is the only amber control. */
export function Home() {
  const store = useStore();
  const s = useDemoState();
  useNow(1000);
  const active = store.hasActiveRide();
  const ride = s.ride;
  const stage = ride ? store.stageOf(ride) : null;
  const home = s.savedHome;
  const m = morningFor(s);
  const linked = !!s.linkedTab && !s.tabClosed;

  const [scan, setScan] = useState(false);
  const rideHome = () => {
    if (!linked) { store.requestStaff(venue.seat); navigate('/g/p3w'); return; }
    if (home) { store.setDestination(home); navigate('/g/p3'); }
    else navigate('/g/p2');
  };

  return (
    <Screen id="home">
      <div className="topbar"><VenueChip /></div>
      {active && ride && stage ? (
        <>
          <h1 className="large-title" data-testid="active-headline">{HEADLINE[stage] ?? 'Your ride'}</h1>
          <button type="button" className="card card--tap card--active" data-testid="ride-card" onClick={() => navigate(STAGE_ROUTE[stage])}>
            <span className="stack">
              <Chip tone={STAGE_TONE[stage]} icon="car">{STAGE_LABEL[stage]}</Chip>
              {isAccepted(stage) && <span className="callout" data-testid="home-booked">{bookedLine(s.tabClosed)}</span>}
              <span className="callout">to {ride.dest.line}</span>
              {stage !== 'pending' && stage !== 'requested' && (
                <>
                  <span className="callout muted">{venue.driver.car}, {venue.driver.first}</span>
                  <span className="plate plate--inline" aria-label={`Plate ${venue.driver.plateSpoken}`}>{venue.driver.plate}</span>
                </>
              )}
              <span className="foot">Tap to see your ride.</span>
            </span>
          </button>
          {stage !== 'pending' && <Belongings ride={ride} stage={stage} />}
          <MoreRow icon="help" title="View ride and help" sub="Call the bar or cancel" onClick={() => navigate('/g/p8')} />
        </>
      ) : linked ? (
        <>
          <h1 className="large-title">Ride home,<br />on your tab.</h1>
          <p className="callout muted">One tap, then confirm the price.</p>
          <p className="section-title">More</p>
          <MoreRow icon="pin" title="Somewhere else" sub="Type an address" testId="somewhere-else" onClick={() => navigate('/g/p2')} />
          {ride && stage && <MoreRow icon="car" title="Last ride" sub={`${STAGE_LABEL[stage]}, to ${ride.dest.line}`} testId="last-ride-card" onClick={() => navigate(STAGE_ROUTE[stage])} />}
          <MoreRow icon="receipt" title="Last night's receipt" sub={`${nightShort(Date.now())} · ${fmt(m.totalCents)}`} testId="receipt-card" onClick={() => navigate('/g/inbox')} />
          <p className="fict">Fictional sample data</p>
          <p className="fict">No real cars or charges.</p>
          <div className="sticky-actions sticky-actions--hero" data-testid="hero-dock">
            <Button size="hero" icon="car" testId="ride-home" onClick={rideHome}
              sub={home ? `To ${home.line}` : 'Pick where you are going'}>
              Ride home
            </Button>
          </div>
        </>
      ) : (
        <>
          <h1 className="large-title">Ride home,<br />on your tab.</h1>
          <p className="callout muted">Scan the QR code on your table to link your tab.</p>
          <MoreRow icon="grid" title="Scan table QR" sub="Links this phone to your tab" testId="scan-qr" onClick={() => setScan(true)} />
          <div className="card card--quiet" data-testid="not-linked"><p className="foot">Booked from a table QR? Open it in Safari to see your ride.</p></div>
          <MoreRow icon="receipt" title="Last night's receipt" sub={`${nightShort(Date.now())} · ${fmt(m.totalCents)}`} testId="receipt-card" onClick={() => navigate('/g/inbox')} />
          <p className="fict">Fictional sample data</p>
          <p className="fict">No real cars or charges.</p>
          <div className="sticky-actions sticky-actions--hero" data-testid="hero-dock">
            <Button size="hero" icon="hand" testId="ask-staff-home" onClick={() => { store.requestStaff(venue.seat); navigate('/g/p3w'); }}
              sub="They'll add it to your tab">
              Ask staff for a car
            </Button>
          </div>
        </>
      )}
      {scan && (
        <Sheet title="Scan table QR" onClose={() => setScan(false)} testId="scan-sheet">
          <p className="callout">Point your phone's camera at the QR code on your table. It opens RideNite in Safari, linked to your tab.</p>
          <p className="foot">This demo has no camera step. Simulate a scan instead:</p>
          <Button variant="secondary" testId="simulate-scan" onClick={() => { setScan(false); navigate(`/v?tab=${venue.tabNumber}&seat=${encodeURIComponent(venue.seat)}`); }}>Simulate scanning {venue.seat}</Button>
          <button type="button" className="textlink" onClick={() => setScan(false)}>Close</button>
        </Sheet>
      )}
    </Screen>
  );
}
