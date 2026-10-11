import { useEffect, useState } from 'react';
import { venue } from '../venue.config';
import { navigate } from '../router';
import { useDemoState, useStore } from '../store';
import { useLiveRide, useNow, useOnline } from '../hooks';
import { fmt } from '../lib/money';
import { capFor } from '../lib/fare';
import { STAGE_ROUTE, type LiveStage, type Stage } from '../lib/rideState';
import { Banner, Button, Card, Chip, Fict, ListRow, Plate, Sheet, Spinner, TextLink } from '../components/primitives';
import { Icon } from '../components/Icon';
import { Screen, Top, VenueChip } from '../components/layout';
import type { Ride } from '../store/types';

const d = venue.driver;

function DemoNext() {
  const store = useStore();
  const s = useDemoState();
  if (!s.ride || s.ride.terminal || s.ride.pending) return null;
  return <TextLink testId="demo-next" onClick={() => store.advanceRide()}>Demo: next status</TextLink>;
}

function DriverRow({ partner = true }: { partner?: boolean }) {
  return (
    <Card className="driver">
      <div className="avatar" aria-hidden="true">{d.first[0]}</div>
      <div>
        <b className="h3">{d.name}</b>
        <div className="callout muted">{d.car}</div>
        {partner && <div className="foot">{d.partner} (local partner)</div>}
      </div>
    </Card>
  );
}

function TabCard({ ride }: { ride: Ride | null }) {
  const q = ride?.quoteCents ?? venue.quoteCents;
  return (
    <Card>
      <div className="row"><span className="callout">On your tab at {venue.name}</span><b className="body num">{fmt(q)}</b></div>
      <p className="foot">Final fare may differ by up to {fmt(capFor(q))}.</p>
    </Card>
  );
}

/** Belongings reminder: in-app only, never blocks the ride, no checkboxes. Follows the derived stage. */
export function Belongings({ ride, stage }: { ride: Ride | null; stage: Stage | null }) {
  const store = useStore();
  const s = useDemoState();
  const st = stage ?? 'requested';
  const where = st === 'near' ? 'near' : st === 'arrived' ? 'here' : st === 'requested' || st === 'en_route' ? 'trip' : null;
  if (!where) return null;
  const key = `${ride?.id ?? 'sample'}:${where}`;
  if (s.dismissedNudges.includes(key)) return null;
  const body = "Card, keys, phone, jacket, bag. Check with staff if they're holding your card.";
  if (where === 'near') {
    return (
      <div className="banner banner--warning" role="status" data-testid="belongings-nudge">
        <Icon name="alert" />
        <div className="stack">
          <b>Do you have everything?</b>
          <span>{body}</span>
          <Button variant="secondary" testId="belongings-ok" onClick={() => store.dismissNudge(key)}>Got it</Button>
        </div>
      </div>
    );
  }
  return (
    <Card testId="belongings-card" className="card--remind">
      {where === 'here' && <Chip tone="success" icon="pin">Your car is here</Chip>}
      <h2 className="h3">Do you have everything?</h2>
      <p className="callout">{body}</p>
      <div className="gap-s3" />
      <Button variant="secondary" testId="belongings-ok" onClick={() => store.dismissNudge(key)}>Got it</Button>
    </Card>
  );
}

/** P4: inside the undo window shows Undo; then "Your car is requested" with the belongings card. */
export function P4() {
  const store = useStore();
  const { ride, stage } = useLiveRide('/g/p4');
  const now = useNow(250);
  // Ignore taps on Undo right after Confirm, so a double tap on Confirm never undoes.
  const [armedAt] = useState(() => store.now() + 600);
  if (ride && stage === 'pending') {
    const left = Math.max(0, Math.ceil((ride.bookedAt - now) / 1000));
    return (
      <Screen id="P4-undo">
        <div className="topbar"><VenueChip /></div>
        <h1 className="large-title">Booking your ride...</h1>
        <p className="callout muted">{ride.dest.line}. {fmt(ride.quoteCents)} on your tab.</p>
        <Card className="center">
          <p className="countdown num" data-testid="undo-countdown" aria-live="polite" aria-atomic="true">{left}</p>
          <p className="callout muted">seconds to undo. Nothing is booked yet.</p>
        </Card>
        <div className="sticky-actions">
          <Button variant="outline" size="xl" testId="undo" onClick={() => { if (store.now() < armedAt) return; store.undoRide(); navigate('/g/home?undone=1'); }}>Undo</Button>
          <p className="fict">Your ride books when the timer ends.</p>
        </div>
      </Screen>
    );
  }
  const q = ride?.quoteCents ?? venue.quoteCents;
  return (
    <Screen id="P4">
      <Top ctx={venue.name} />
      <Spinner label="Finding a car" />
      <h1 className="h2 center">Your car is requested</h1>
      <p className="callout muted center" aria-live="polite">Checking local car services and ride apps for the best match.</p>
      <Belongings ride={ride} stage={stage} />
      <Card><div className="row"><span className="callout">Quote {fmt(q)} on your tab.</span></div><p className="foot">May differ by up to {fmt(capFor(q))}.</p></Card>
      <div className="spacer" />
      <DemoNext />
      <TextLink onClick={() => { store.cancelRide(); navigate('/g/home'); }}>Cancel ride</TextLink>
      <p className="foot center">Cancel now and nothing is added to your tab.</p>
    </Screen>
  );
}

function useWakeLock() {
  useEffect(() => {
    let lock: any;
    (navigator as any).wakeLock?.request?.('screen').then((l: any) => (lock = l)).catch(() => {});
    return () => { lock?.release?.().catch?.(() => {}); };
  }, []);
}

export function P5() {
  const { ride, stage } = useLiveRide('/g/p5');
  useWakeLock();
  return (
    <Screen id="P5" tight>
      <Top left={<Chip tone="info" icon="car">Driver on the way</Chip>} ctx={venue.name} />
      <div className="row"><span className="eta">{venue.etaMinutes} min</span><span className="callout muted">pickup at {venue.pickupSpot}</span></div>
      <p className="callout">Before you get in, check the plate. Your driver will say your first name.</p>
      <Plate plate={d.plate} spoken={d.plateSpoken} />
      <div className="btn-row">
        <Button variant="secondary" icon="share" onClick={() => navigate('/g/p13')}>Share</Button>
        <Button variant="secondary" icon="help" onClick={() => navigate('/g/p8')}>Help</Button>
      </div>
      <Belongings ride={ride} stage={stage ?? 'en_route'} />
      <DriverRow />
      <TabCard ride={ride} />
      <DemoNext />
      <Fict>Driver, car and plate are fictional.</Fict>
    </Screen>
  );
}

export function P5w() {
  const { ride, stage } = useLiveRide('/g/p5w');
  useWakeLock();
  return (
    <Screen id="P5w" tight>
      <Top left={<Chip tone="info" icon="clock">2 min away</Chip>} ctx={venue.name} />
      <h1 className="h2" role="status">Driver is 2 minutes away.</h1>
      <p className="body">You can wait inside. We'll text you when it's at the door.</p>
      <Belongings ride={ride} stage={stage ?? 'near'} />
      <Plate plate={d.plate} spoken={d.plateSpoken} />
      <DriverRow partner={false} />
      <TabCard ride={ride} />
      <div className="btn-row">
        <Button variant="secondary" icon="share" onClick={() => navigate('/g/p13')}>Share</Button>
        <Button variant="secondary" icon="help" onClick={() => navigate('/g/p8')}>Help</Button>
      </div>
      <DemoNext />
    </Screen>
  );
}

export function E3() {
  const store = useStore();
  const { ride, stage } = useLiveRide('/g/e3');
  return (
    <Screen id="E3">
      <Top left={<Chip tone="warning" icon="clock">Car is outside</Chip>} />
      <h1 className="large-title">Your car is here</h1>
      <Plate plate={d.plate} spoken={d.plateSpoken} />
      <p className="body">{venue.pickupShort} {d.carShort[0].toUpperCase() + d.carShort.slice(1)}.</p>
      <Belongings ride={ride} stage={stage ?? 'arrived'} />
      <Card><p className="body">The driver waits about <b>3 more min</b>. After that the ride may be canceled and nothing goes on your tab.</p></Card>
      <div className="spacer" />
      <Button size="xl" variant="success" icon="check" testId="coming" onClick={() => { store.releaseHold('picked_up'); navigate('/g/p6'); }}>I'm coming</Button>
      <Button variant="secondary" icon="phone" href={`tel:${d.phoneTel}`}>Call the driver</Button>
    </Screen>
  );
}

function MapCard({ label }: { label: string }) {
  return (
    <div className="map" role="img" aria-label={label}>
      <div className="map__road" style={{ left: 0, right: 0, top: '60%', height: 8 }} />
      <div className="map__road" style={{ left: '40%', width: 8, top: 0, bottom: 0 }} />
      <div className="map__route" style={{ left: '16%', top: '30%', width: '60%', transform: 'rotate(15deg)' }} />
      <div className="map__pin map__pin--from" style={{ left: '13%', top: '24%' }} />
      <div className="map__pin map__pin--to" style={{ left: '72%', top: '52%' }} />
      <div className="map__lbl" style={{ left: '4%', top: '6%' }}>Pickup</div>
      <div className="map__lbl" style={{ left: '66%', top: '72%' }}>Home</div>
    </div>
  );
}

export function P6() {
  const s = useDemoState();
  const { ride } = useLiveRide('/g/p6');
  const dest = ride?.dest.line ?? venue.guest.home.line;
  return (
    <Screen id="P6" tight>
      <Top left={<Chip tone="info" icon="home">Picked up</Chip>} ctx={venue.night.pickedUp} />
      <MapCard label={`Illustrative map: about 11 minutes to ${dest}`} />
      <div className="row"><span className="eta">11 min</span><span className="callout muted">arrive about 11:43 PM</span></div>
      <ul className="steps" aria-label="Trip progress">
        <li><span className="dot dot--done" />Picked up {venue.night.pickedUp}</li>
        <li><span className="dot dot--now" />On the way</li>
        <li><span className="dot" />Arrive near {dest}</li>
      </ul>
      <div className="spacer" />
      <div className="btn-row">
        <Button variant="secondary" icon="share" onClick={() => navigate('/g/p13')}>Share</Button>
        <Button variant="secondary" icon="help" onClick={() => navigate('/g/p8')}>Help</Button>
      </div>
      {s.dismissedNudges.includes('shared') && <p className="foot center">Trip shared with {venue.friend.name} until drop-off (simulated, nothing sent).</p>}
      <DemoNext />
      <Fict>Map is illustrative. No map tiles are loaded.</Fict>
    </Screen>
  );
}

export function P7() {
  useLiveRide('/g/p7');
  return (
    <Screen id="P7">
      <Top left={<span className="brand">RideNite</span>} ctx={venue.night.complete} />
      <Chip tone="success" icon="check">Ride complete</Chip>
      <h1 className="large-title">You've arrived.</h1>
      <p className="body muted">Your ride from {venue.name} is on your tab.</p>
      <div className="spacer" />
      <Button size="xl" variant="success" icon="chat" href="sms:?&body=I'm%20home" testId="text-friend">Text a friend I'm home</Button>
      <p className="foot center">Opens your own messages app. Optional.</p>
      <Button variant="secondary" icon="help" onClick={() => navigate('/g/p8')}>Help</Button>
      <Button variant="secondary" onClick={() => navigate('/g/home')}>Done</Button>
    </Screen>
  );
}

/** P8 Help sheet. 911 is simulated in this demo so nothing is ever dialed by accident. */
export function P8() {
  const store = useStore();
  const s = useDemoState();
  const [note, setNote] = useState('');
  const closeTo = s.ride ? STAGE_ROUTE[store.stageOf(s.ride)] : '/g/home';
  return (
    <Screen id="P8">
      <Top ctx={venue.guest.name} />
      <Sheet title="Help" onClose={() => navigate(closeTo)} testId="help-sheet">
        <Button variant="bad" icon="phone" onClick={() => setNote('Demo: in the live app this opens your phone app to call 911. Nothing was dialed.')}>Call 911</Button>
        <Button variant="secondary" icon="phone" href={`tel:${d.phoneTel}`}>Call the driver</Button>
        <Button variant="secondary" icon="glass" href={`tel:${venue.phoneTel}`}>Call the bar</Button>
        <Button variant="secondary" icon="car" onClick={() => { store.cancelRide(); navigate('/g/p2'); }}>Cancel or change ride</Button>
        <p className="foot" aria-live="polite">{note}</p>
        <TextLink onClick={() => navigate(closeTo)}>Close</TextLink>
        <p className="foot">RideNite books rides. It is not an emergency service.</p>
      </Sheet>
    </Screen>
  );
}

/** P13 share (simulated: nothing is sent; number not stored). */
export function P13() {
  const store = useStore();
  const [num, setNum] = useState<string>(venue.friend.phone);
  const [sent, setSent] = useState(false);
  const contacts = typeof navigator !== 'undefined' && 'contacts' in navigator;
  return (
    <Screen id="P13">
      <Top back="/g/p5" ctx="Share my trip" />
      <h1 className="h2">Share my trip with a friend</h1>
      <p className="body muted">We text them the ride service's trip link: car, plate and progress until drop-off.</p>
      <div className="field">
        <label htmlFor="fr">Friend's mobile number</label>
        <input className="input" id="fr" value={num} onChange={(e) => setNum(e.target.value)} inputMode="tel" autoComplete="tel" />
      </div>
      {contacts && <ListRow icon="person" title="Pick from contacts" subtitle="Uses your phone's contact picker" />}
      {sent && <Banner tone="info" icon="check">Demo: trip link not really sent. Nothing left this phone.</Banner>}
      <div className="spacer" />
      {sent ? (
        <Button variant="secondary" onClick={() => navigate('/g/p13f')}>See what {venue.friend.name} sees (demo)</Button>
      ) : (
        <Button size="xl" icon="share" testId="send-share" onClick={() => { store.dismissNudge('shared'); setSent(true); }}>Send trip link</Button>
      )}
      <Fict>Number is fictional.</Fict>
    </Screen>
  );
}

export function P13f() {
  return (
    <Screen id="P13f" tight>
      <Top left={<span className="brand">RideNite</span>} ctx="Shared trip" />
      <h1 className="h2">{venue.guest.first} is heading home</h1>
      <MapCard label="Illustrative map: about 11 minutes to the arrival area" />
      <div className="row"><span className="eta">11 min</span><span className="callout muted">to arrival area</span></div>
      <Plate plate={d.plate} spoken={d.plateSpoken} />
      <p className="body muted">{d.car}, driver {d.name}</p>
      <p className="foot">Exact home address is not shown. Link expires at drop-off.</p>
      <div className="spacer" />
      <Fict>Fictional sample trip. Simulated friend view.</Fict>
    </Screen>
  );
}

/** E5 offline: last-known ride stays visible (UI 5 E5, 2i). */
export function E5() {
  const store = useStore();
  const s = useDemoState();
  const online = useOnline();
  const [msg, setMsg] = useState('');
  return (
    <Screen id="E5">
      <Top left={<Chip tone="warning" icon="wifi-off">No signal</Chip>} />
      <h1 className="h2">Your ride is still booked</h1>
      <p className="body muted">Last update {venue.night.booked}. This page refreshes when you're back online.</p>
      <Plate plate={d.plate} spoken={d.plateSpoken} />
      <p className="body">{d.car}, {d.name}</p>
      <div className="spacer" />
      <Button variant="secondary" icon="bolt" testId="try-again" onClick={() => {
        if (online && s.ride) { store.releaseHold(store.stageOf(s.ride) as LiveStage); navigate(STAGE_ROUTE[store.stageOf(store.getState().ride!)]); }
        else if (online) { store.clearFault(); navigate('/g/home'); }
        else setMsg('Still no signal. Your ride details stay on this screen.');
      }}>Try again</Button>
      <p className="foot" aria-live="polite">{msg}</p>
      <p className="foot">Phone dying? Staff can see your ride and show you the plate.</p>
    </Screen>
  );
}
