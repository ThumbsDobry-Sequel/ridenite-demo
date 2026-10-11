import { nightShort, nightWeekday } from '../lib/night';
import { holdText } from '../lib/hold';
import type { DemoState } from '../store/types';
import { useState } from 'react';
import { T, venue } from '../venue.config';
import { navigate } from '../router';
import { useDemoState, useStore } from '../store';
import { morningFor, nightTimes } from '../lib/morning';
import { neighborhood } from '../lib/tab';
import { nightTagline } from '../lib/brand';
import { noDriverLine, confirmLine, fmtET } from '../lib/confirmRecord';
import { useNow } from '../hooks';
import { fmt, fmtSigned } from '../lib/money';
import { Banner, Button, Card, Chip, Fict, ListRow } from '../components/primitives';
import { Icon } from '../components/Icon';
import { BackButton, Screen, Top, VenueChip } from '../components/layout';

const ETT = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: '2-digit' });
const ETD = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
/** Night times formatted in ET, derived from the clock (never hardcoded). */
function useN(s: DemoState) {
  const t = nightTimes(s);
  return { tabOpened: fmtET(t.tabOpened), booked: fmtET(t.booked), pickedUp: fmtET(t.pickedUp), complete: fmtET(t.complete) };
}
const nowClock = () => ETT.format(new Date()).replace(',', '');
const nowStamp = () => ETD.format(new Date()).replace(/, (\d{1,2}:)/, ', $1');

/** Money-promises memo (Harper's safer copy), exact; venue name from config. Drink questions still go to the bar. */
export const rideQuestionCopy = () =>
  `Ride charge look wrong? Tap here. We'll check it with ${venue.name} today. If it's wrong, ${venue.name} refunds it to your card, and we'll text you when that's done. Your bank may take a few business days to show it.`;
/** Itemized ride line (Vera rev 04.2): "RideNite car home, Clarendon area to Westover area, picked up 10:04 PM, $27.40". Areas only. */
export function rideItemLine(s: DemoState, pickedUp: string, rideCents: number): string {
  const from = neighborhood(venue.neighborhood);
  const to = neighborhood((s.ride?.dest ?? venue.guest.home).area);
  return `RideNite car home, ${from} area to ${to} area, picked up ${pickedUp}, ${fmt(rideCents)}`;
}

function RideQuestion() {
  return <button type="button" className="textlink ride-question" data-testid="ride-question" onClick={() => navigate('/g/p10')}>{rideQuestionCopy()}</button>;
}

/** Morning receipt wording follows the venue setting (B8): Neutral (recommended) or Detailed. */
export function receiptSubject(s: DemoState): string {
  return s.bar.settings.receipt === 'detailed'
    ? `Your receipt from ${venue.name}: ${T.bill} and ${s.bar.settings.tabLineName} ride`
    : `Your receipt from ${venue.name}`;
}

/** Morning inbox: simulated Messages and Email (neutral default subject, UI 0a item 7). */
export function Inbox() {
  const s = useDemoState();
  const m = morningFor(s);
  return (
    <Screen id="inbox">
      <Top back="/g/home" ctx="Sat 9:00 AM" />
      <h1 className="h2">Morning inbox</h1>
      <p className="foot">Simulated messages on this phone. Nothing was really sent.</p>
      <ListRow icon="chat" title="Messages: RideNite" subtitle={`${receiptSubject(s)} is ready`} testId="open-m2" onClick={() => navigate('/g/m2')} />
      <ListRow icon="mail" title={`Email: ${receiptSubject(s)}`} subtitle={`Last night's ${T.bill}, ready to review. ${fmt(m.totalCents)}`} testId="open-m1" onClick={() => navigate('/g/m1')} />
      <Fict>Sample messages. Names, numbers and links are fictional.</Fict>
    </Screen>
  );
}

/** M2 / M2d SMS thread with the neutral morning text (default). */
export function M2() {
  const s = useDemoState();
  const N = useN(s);
  return (
    <Screen id="M2">
      <Top back="/g/inbox" ctx={`RideNite ${venue.smsFrom}`} />
      <h1 className="h2">Messages</h1>
      <div className="thread">
        <p className="stamp">{nightWeekday(Date.now())} {N.booked}</p>
        <p className="bubble">RideNite: Your car is requested. {venue.driver.first}, {venue.driver.carShort}, plate {venue.driver.plate}, about {venue.etaMinutes} min. It goes on your {T.bill} at {venue.name} ({fmt(venue.quoteCents)}). Before you get in, check the plate.</p>
        <p className="bubble">RideNite: Your car is about 2 min away. You can wait inside. We'll text you when it's at the door.</p>
        <p className="stamp">{N.complete}</p>
        <p className="bubble">RideNite: You've arrived. Your ride from {venue.name} is on your {T.bill}.</p>
        <p className="stamp">{nowClock()}</p>
        <p className="bubble">RideNite: {receiptSubject(s)} is ready: <a href="#/g/p9" data-testid="sms-link">rdnt.example/m/abc123</a> Reply STOP to opt out, HELP for help.</p>
      </div>
      <Fict>SAMPLE: no real charge. Messages are simulated.</Fict>
    </Screen>
  );
}

/** M1 email (neutral subject by default). */
export function M1() {
  const s = useDemoState();
  const m = morningFor(s);
  const N = useN(s);
  const tag = nightTagline(m.hasRide);
  return (
    <Screen id="M1">
      <Top back="/g/inbox" ctx="Email" />
      <Card>
        <div className="mail-hdr">
          <div><b>RideNite for {venue.name}</b></div>
          <div>To: {venue.guest.email}</div>
          <div>Subject: <b data-testid="m1-subject">{receiptSubject(s)}</b></div>
          <div className="muted">{nowStamp()}</div>
        </div>
      </Card>
      <h1 className="h3">Good morning, {venue.guest.first}.</h1>
      <p className="callout">Here's last night's tab from {venue.name}, including your ride home: {N.pickedUp}, {fmt(m.rideCents)}, on your {T.bill}.</p>
      <table className="inv">
        <tbody>
          <tr><th scope="row">Drinks and food</th><td className="amt">{fmt(m.tipBaseCents)}</td></tr>
          <tr><th scope="row">{venue.taxLabel}</th><td className="amt">{fmt(m.taxCents)}</td></tr>
          {tag && <tr data-testid="night-tagline-row"><td colSpan={2} className="night-tagline" data-testid="night-tagline">{tag}</td></tr>}
          {m.hasRide && <tr data-testid="ride-item"><th scope="row">{rideItemLine(s, N.pickedUp, m.rideCents)}<span className="note">{s.bar.settings.tabLineName}, {venue.driver.partner}, {venue.driver.plate}</span></th><td className="amt">{fmt(m.rideCents)}</td></tr>}
          <tr><th scope="row">Staff tip ({s.tipPct}%)</th><td className="amt">{fmt(m.tipCents)}</td></tr>
          <tr className="total"><th scope="row">Total</th><td className="amt">{fmt(m.totalCents)}</td></tr>
        </tbody>
      </table>
      <Button onClick={() => navigate('/g/p9')}>Review and pay</Button>
      <RideQuestion />
      <p className="foot" data-testid="hold-line">Your card ending {venue.card.last4} is on hold. If you do nothing, it's {holdText(s.tabOpenedAt, s.seededAt)}. Question about a charge? Open Review and tap "Something's wrong."</p>
      <p className="fict">{venue.addressLine}. {venue.disclaimer} SAMPLE: no real charge.</p>
    </Screen>
  );
}

/** P9 review and pay (UI 6 P9, POS 3a/3b). Tip on drinks and food only. */
export function P9() {
  const store = useStore();
  const s = useDemoState();
  useNow(1000);
  const m = morningFor(s);
  const cl = confirmLine(s);
  const nd = noDriverLine(s);
  const r = m.recon ?? { postedAdjCents: 0, heldCents: 0, declinedCents: 0, finalCents: 0, quoteCents: 0, capCents: 0, diffCents: 0, outcome: 'none' as const };
  const adjName = r.postedAdjCents < 0 ? 'Ride fare credit' : 'Ride fare adjustment';
  const N = useN(s);
  const tag = nightTagline(m.hasRide);
  return (
    <Screen id="P9" tight>
      <Top left={<VenueChip />} ctx={nowClock()} />
      <h1 className="h2">Last night, {nightShort(Date.now())}</h1>
      <span className="status-pill" data-testid="ready-total">{s.paid ? 'Paid' : 'Ready to review'}: <span className="num">{fmt(m.totalCents)}</span></span>
      <Card>
        <h2 className="h3">Your night</h2>
        <ul className="tl">
          <li><b className="num">{N.tabOpened}</b><span>{T.Bill} opened at {venue.name}</span></li>
          {m.hasRide && <>
          <li><b className="num">{N.booked}</b><span>Ride home booked (you confirmed)</span></li>
          <li><b className="num">{N.pickedUp}</b><span>Picked up. {venue.driver.name}, {venue.driver.carShort}, {venue.driver.plate}</span></li>
          <li><b className="num">{N.complete}</b><span>Dropped off near {s.ride?.dest.line ?? venue.guest.home.line}. Final fare {fmt(m.finalCents)}</span></li>
          </>}
        </ul>
      </Card>
      <table className="inv" aria-label="Itemized bill" data-testid="invoice">
        <tbody>
          <tr className="sec"><th colSpan={2} scope="colgroup">Drinks</th></tr>
          {venue.menu.filter((i) => i.kind === 'drink').map((i) => <tr key={i.name}><th scope="row">{i.name}</th><td className="amt">{fmt(i.cents)}</td></tr>)}
          <tr className="sec"><th colSpan={2} scope="colgroup">Food</th></tr>
          {venue.menu.filter((i) => i.kind === 'food').map((i) => <tr key={i.name}><th scope="row">{i.name}</th><td className="amt">{fmt(i.cents)}</td></tr>)}
          <tr><th scope="row">{venue.taxLabel}<span className="note">{venue.taxNote}</span></th><td className="amt" data-testid="tax">{fmt(m.taxCents)}</td></tr>
          <tr className="sec"><th colSpan={2} scope="colgroup">Ride</th></tr>
          {tag && <tr data-testid="night-tagline-row"><td colSpan={2} className="night-tagline" data-testid="night-tagline">{tag}</td></tr>}
          {m.hasRide && <tr data-testid="ride-item" className="ride-item"><th scope="row" colSpan={2}>{rideItemLine(s, N.pickedUp, m.rideCents)}<span className="note">Made up of the lines below.</span></th></tr>}
          {m.hasRide ? (
            <tr data-testid="ride-line"><th scope="row">{s.bar.settings.tabLineName}, quoted fare<span className="note">{venue.driver.partner}</span>
              {cl && <><span className="note confirm-record" data-testid="confirm-record">{cl.text}{cl.sample ? ' (sample data)' : ''}</span><span className="note" data-testid="confirm-record-amounts">{cl.amounts}</span></>}</th><td className="amt">{fmt(m.quoteCents)}</td></tr>
          ) : (
            <tr data-testid="no-ride-line"><th scope="row">No ride on this {T.bill}<span className="note">Nothing was added for a ride.</span>
              {nd && <span className="note" data-testid="no-driver-record">{nd}</span>}</th><td className="amt">{fmt(0)}</td></tr>
          )}
          {r.postedAdjCents !== 0 && (
            <tr data-testid="adj-line"><th scope="row">{adjName} (final fare {fmt(r.finalCents)}, quoted {fmt(r.quoteCents)})<span className="note">{r.postedAdjCents > 0 ? `Within the ${fmt(r.capCents)} you saw before booking.` : 'The fare came in lower than the quote, so this credit lowers your total.'}</span></th><td className="amt">{fmtSigned(r.postedAdjCents)}</td></tr>
          )}
          {r.heldCents > 0 && (
            <tr data-testid="held-line" className="needs-ok-row"><th scope="row"><span className="needs-ok__l"><Icon name="help" /><b>Needs your OK</b></span><span className="note">{fmt(r.heldCents)} over the {fmt(r.capCents)} cap. {venue.overCapReason}. Not charged unless you OK it.</span>
              <button type="button" className="textlink textlink--inline" onClick={() => navigate('/g/e7')}>Review</button></th><td className="amt">{fmt(0)}</td></tr>
          )}
          {r.declinedCents > 0 && <tr><th scope="row">Not charged<span className="note">You said no to the extra {fmt(r.declinedCents)}</span></th><td className="amt">{fmt(0)}</td></tr>}
          <tr className="sec"><th colSpan={2} scope="colgroup">Tip for bar staff</th></tr>
          <tr><td colSpan={2}>
            <div className="seg" role="group" aria-label="Staff tip on drinks and food">
              {venue.tipOptions.map((p) => (
                <button key={p} type="button" aria-pressed={s.tipPct === p} data-testid={`tip-${p}`} onClick={() => store.setTip(p)}>{p ? `${p}%` : 'None'}</button>
              ))}
            </div>
            <span className="note">Tip is on drinks and food ({fmt(m.tipBaseCents)}), not the ride.</span>
          </td></tr>
          <tr><th scope="row">Staff tip ({s.tipPct}%)</th><td className="amt" data-testid="tip-amt">{fmt(m.tipCents)}</td></tr>
          <tr className="total"><th scope="row">Total</th><td className="amt" data-testid="total" aria-live="polite">{fmt(m.totalCents)}</td></tr>
        </tbody>
      </table>
      {!s.paid && <Button testId="pay" onClick={() => { store.pay(); navigate('/g/p11'); }}>Approve and pay {fmt(m.totalCents)}</Button>}
      <Button variant="secondary" onClick={() => navigate('/g/p10')}>Something's wrong</Button>
      <RideQuestion />
      <p className="foot">Questions about drinks or food go to {venue.name}.</p>
      <p className="foot" data-testid="hold-line">Card ending {venue.card.last4} is on hold. If you do nothing, it's {holdText(s.tabOpenedAt, s.seededAt)}.</p>
      <Fict>Fictional sample bill. SAMPLE: no real charge.</Fict>
    </Screen>
  );
}

/** E7 over the cap: the guest's OK (POS 2 E7). */
export function E7() {
  const store = useStore();
  const s = useDemoState();
  const m = morningFor({ ...s, ride: s.ride ? { ...s.ride, scenario: 'over' } : null, fareScenario: 'over', overCapAnswer: null });
  const r = m.recon!;
  const over = r.diffCents - Math.min(r.diffCents, r.capCents);
  return (
    <Screen id="E7">
      <Top left={<VenueChip />} ctx={nowClock()} />
      <h1 className="h2">Your ride came to {fmt(r.finalCents)}.</h1>
      <Card>
        <div className="row callout"><span>Quote you OK'd</span><span className="num">{fmt(r.quoteCents)}</span></div>
        <div className="row callout"><span>Added, as shown before booking (up to {fmt(r.capCents)})</span><span className="num" data-testid="e7-added">{fmtSigned(Math.min(r.diffCents, r.capCents))}</span></div>
        <div className="row body needs-ok" data-testid="needs-ok"><span className="needs-ok__l"><Icon name="help" /><b>Needs your OK</b></span><b className="num" data-testid="e7-over">{fmt(over)}</b></div>
      </Card>
      <p className="body">{venue.overCapReason}, so the trip came in higher than quoted. The extra {fmt(over)} is not charged unless you say yes.</p>
      <div className="spacer" />
      <Button testId="e7-yes" onClick={() => { store.setOverCapAnswer('yes'); navigate('/g/p9'); }}>Yes, add {fmt(over)}</Button>
      <Button variant="secondary" testId="e7-no" onClick={() => { store.setOverCapAnswer('no'); navigate('/g/p9'); }}>No, don't add it</Button>
      <p className="foot">If you say no, it is not charged. RideNite settles the rest with the car service; {venue.name} pays nothing extra.</p>
      <Fict>Fictional sample amounts.</Fict>
    </Screen>
  );
}

const REASONS = ["I don't recognize a charge", 'An amount is wrong', "The ride didn't happen", 'Something else'];

/** P10 dispute. A note about charges is the only free text allowed (UI 10). */
export function P10() {
  const store = useStore();
  const s = useDemoState();
  const cl = confirmLine(s);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  return (
    <Screen id="P10">
      <Top left={<BackButton to="/g/p9" />} ctx={venue.name} />
      <h1 className="h2">What's wrong?</h1>
      {cl && <Card testId="dispute-record"><p className="kv__k">Ride on your {T.bill}</p><p className="callout" data-testid="confirm-record">{cl.text}{cl.sample ? ' (sample data)' : ''}</p><p className="foot" data-testid="confirm-record-amounts">{cl.amounts}</p></Card>}
      {REASONS.map((r) => <ListRow key={r} compact title={r} selected={reason === r} pressed={reason === r} onClick={() => setReason(r)} />)}
      <div className="field">
        <label htmlFor="note">Note about the charge (optional)</label>
        <input className="input" id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} autoComplete="off" />
      </div>
      {!reason && <p className="foot">Pick what's wrong to send it.</p>}
      <div className="spacer" />
      <Button testId="send-dispute" onClick={() => { if (!reason) return; store.sendDispute(reason); navigate('/g/p11'); }}>Send to {venue.name}</Button>
      <p className="foot">Questions about drinks or food go to {venue.name}.</p>
    </Screen>
  );
}

export function P11() {
  const store = useStore();
  const s = useDemoState();
  const m = morningFor(s);
  const [note, setNote] = useState('');
  return (
    <Screen id="P11">
      <Top left={<VenueChip />} ctx="Sat 9:06 AM" />
      <div className="success-badge"><Icon name="check" /></div>
      <Chip tone="success" icon="check">{s.dispute ? 'Sent' : 'Paid'}</Chip>
      <h1 className="h2">All set</h1>
      {s.dispute
        ? <p className="body">Sent to {venue.name}: "{s.dispute}".</p>
        : <p className="body">{fmt(m.totalCents)} paid with card ending {venue.card.last4}.</p>}
      <p className="body muted">Receipt sent to {venue.guest.email}</p>
      {note && <Banner tone="info" icon="check">{note}</Banner>}
      <div className="spacer" />
      <Button variant="secondary" icon="receipt" onClick={() => setNote('Demo: a PDF receipt would download here.')}>Download receipt (PDF)</Button>
      <Button variant="secondary" icon="home" onClick={() => { store.saveHome(s.ride?.dest ?? venue.guest.home); setNote('Home address saved on this phone.'); }}>Save my home address for next time</Button>
      <Button variant="secondary" onClick={() => navigate('/g/home')}>Done</Button>
      <Fict>SAMPLE: no real charge.</Fict>
    </Screen>
  );
}
