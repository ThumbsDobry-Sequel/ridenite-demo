import { useEffect, useState, type ReactNode } from 'react';
import { navigate, type Route } from '../../router';
import { useDemoState, useStore } from '../../store';
import { useNow } from '../../hooks';
import { T, venue } from '../../venue.config';
import { fmt, fmtSigned } from '../../lib/money';
import { barConfirmLine, fmtET } from '../../lib/confirmRecord';
import { barRideLineName, tabCloseState, tabItems, tabTotals } from '../../lib/tab';
import { fmtDeadline, HOLD_WINDOW_MS } from '../../lib/hold';
import { isAcceptedStage, isChargedStage, pickupAt } from '../../lib/rideState';
import { Icon } from '../../components/Icon';
import { Chip, Sheet } from '../../components/primitives';
import type { BarSettings, FareScenario } from '../../store/types';
import { barRideHeadline, barStatus, EP_LABEL, HeaderBook, SheetHead, tabCents, toGuest } from './common';
import { startBooking } from './tonight';
import { rideRefFor } from '../../lib/checkLines';

/* B6 tab detail, B9 plate card, B10 quiet request, More, B8 settings (trimmed). */

const SCEN: { id: FareScenario; label: string }[] = [
  { id: 'higher', label: 'Higher' }, { id: 'lower', label: 'Lower' }, { id: 'equal', label: 'Same' }, { id: 'over', label: 'Over cap' },
];

export function B6({ route }: { route: Route }) {
  const store = useStore();
  const s = useDemoState();
  useNow(500);
  const t = s.bar.tabs.find((x) => x.tab === route.query.get('tab'));
  if (!t) {
    return (
      <main className="bpage" data-screen="b6" id="main">
        <SheetHead title={`${T.Bill}`} onBack={() => navigate('/b/more')} />
        <p className="body">This {T.bill} isn't open.</p>
      </main>
    );
  }
  const ride = [...store.barRides()].reverse().find((r) => r.tab === t.tab && store.stageOf(r) !== 'canceled_by_driver' && store.stageOf(r) !== 'pending') ?? null;
  const stage = ride ? store.stageOf(ride) : null;
  const done = stage === 'complete';
  const isGuestRide = ride && s.ride?.id === ride.id;
  // Charge timing (SCOPE 22:22): the fare line posts to the tab at pickup, not at driver accept.
  const accepted = isAcceptedStage(stage);
  const charged = isChargedStage(stage);
  const close = tabCloseState(t, stage, store.now());
  const tot = tabTotals({
    items: tabItems(t.items), taxRate: venue.taxRate,
    rideLineName: ride ? barRideLineName(ride.dest, pickupAt(ride), fmtET) : undefined,
    ride: ride && charged ? { quoteCents: ride.quoteCents, finalCents: done ? venue.finalFareCents[ride.scenario] + (ride.stopDeltaCents ?? 0) : null, overCapAnswer: isGuestRide ? s.overCapAnswer : null, rideId: rideRefFor(ride, s), pickupMs: pickupAt(ride), feeChargedCents: ride.feeChargedCents } : null,
  });
  const rec = ride ? barConfirmLine(s, ride) : null;
  const st = ride && stage ? barStatus(stage, ride) : null;
  return (
    <main className="bpage" data-screen="b6" id="main">
      <SheetHead title={<>{t.seat} · {t.guest} · {T.bill} #{t.tab}</>} onBack={() => navigate('/b/tonight')} right={<HeaderBook />} />
      <table className="btab" data-testid="b6-lines">
        <tbody>
          {tot.lines.map((l, i) => (
            <tr key={i} data-testid={`b6-${l.type}`} data-kind={l.kind} data-ride-id={l.rideId} className={`btab__${l.type}`}>
              <th scope="row">
                {l.type === 'item' && l.qty! > 1 ? `${l.name} x${l.qty}` : l.name}
                {l.type === 'ride_quote' && ride && (
                  <span className="foot btab__note">{EP_LABEL[ride.entryPoint]} · quoted fare</span>
                )}
              </th>
              <td className="num">{l.type === 'ride_adjustment' || l.type === 'ride_credit' ? fmtSigned(l.cents) : l.type === 'ride_held' ? `(${fmt(l.cents)})` : fmt(l.cents)}</td>
            </tr>
          ))}
          <tr className="btab__total" data-testid="b6-total"><th scope="row">Total before tip</th><td className="num">{fmt(tot.totalBeforeTipCents)}</td></tr>
        </tbody>
      </table>
      <p className="foot" data-testid="b6-tip-base">Tip prompt base: {fmt(tot.tipBaseCents)} (food and items, not the ride).</p>
      {ride && !charged && stage !== 'no_cars' && <p className="foot" data-testid="b6-not-yet">Ride pending pickup. The fare goes on this {T.bill} at pickup.</p>}
      {ride && stage === 'no_cars' && <p className="foot" data-testid="b6-no-driver">No driver found. Nothing was added to this {T.bill}.</p>}
      {ride && charged && !done && <p className="foot">Any fare adjustment or credit posts as its own line after drop-off.</p>}
      {rec && (
        <div className="bnote bnote--record" data-testid="b6-record-card">
          <p className="foot"><b>RideNite record</b> (on the guest's RideNite receipt, not on the POS line)</p>
          <p className="foot" data-testid="b6-record">{rec.text}. {rec.amounts}</p>
        </div>
      )}
      {ride && charged && <p className="foot" data-testid="b6-fee">Bar only: RideNite fee for this ride {fmt(venue.bar.feeCents)}, billed monthly. <span className="sample-tag">Sample</span></p>}
      {ride && st && (
        <section className="bcard" data-testid="b6-ride">
          <h2 className="bsection">Ride</h2>
          {barRideHeadline(stage!, t.tab, t.close !== 'open') && <p className="body" role="status" data-testid="b6-ride-headline"><b>{barRideHeadline(stage!, t.tab, t.close !== 'open')}</b></p>}
          <Chip tone={st.tone} icon={st.icon}>{st.label}</Chip>
          <p className="callout">{ride.carInfo.car} · <span className="num">{ride.carInfo.plate}</span> · driver {ride.carInfo.driver}</p>
          <button type="button" className="btn btn--secondary bbtn-44" data-testid="b6-plate" onClick={() => navigate(`/b/plate?tab=${t.tab}`)}>Show plate card</button>
          <div className="bdemo">
            <p className="foot">Demo: final fare</p>
            <div className="bchips" role="group" aria-label="Demo final fare">
              {SCEN.map((x) => (
                <button key={x.id} type="button" className="bchip" aria-pressed={ride.scenario === x.id} data-testid={`b6-scen-${x.id}`}
                  onClick={() => store.barSetRideScenario(ride.id, x.id)}>{x.label}</button>
              ))}
            </div>
            {!done && <button type="button" className="textlink bbtn-44" data-testid="b6-finish" onClick={() => store.barFinishRide(ride.id)}>Demo: skip to drop-off</button>}
            {accepted && !charged && <button type="button" className="textlink bbtn-44" data-testid="b6-driver-cancel" onClick={() => store.driverCancel(ride.id)}>Demo: driver cancels before pickup</button>}
          </div>
        </section>
      )}
      {close === 'pending' && (
        <p className="bnote" role="status" data-testid="b6-pending"><Icon name="clock" />Ride pending pickup. The {T.bill} finishes closing when the guest is picked up, or closes with no ride line if the ride is cancelled. Hold ends {fmtDeadline((t.closeAt ?? store.now()) + HOLD_WINDOW_MS)}.</p>
      )}
      {close === 'open' ? (
        <div className="bstack">
          <button type="button" className="btn btn--secondary bbtn-56" data-testid="b6-close" onClick={() => store.barCloseTab(t.tab, 'closed')}>Close {T.bill} now</button>
          <button type="button" className="btn btn--secondary bbtn-56" data-testid="b6-hold" onClick={() => store.barCloseTab(t.tab, 'held')}>Hold for morning checkout</button>
        </div>
      ) : close === 'pending' ? null : (
        <p className="bnote" role="status" data-testid="b6-closed"><Icon name="check" />{close === 'closed' ? `${T.Bill} closed.` : 'Held for morning checkout. The guest gets the receipt in the morning.'}</p>
      )}
    </main>
  );
}

export function B9({ route }: { route: Route }) {
  const store = useStore();
  useDemoState();
  const tab = route.query.get('tab');
  const ride = [...store.barRides()].reverse().find((r) => r.tab === tab) ?? null;
  const done = () => navigate(tab ? `/b/tab?tab=${tab}` : '/b/live');
  if (!ride) {
    return <main className="bsheet" data-screen="b9" id="main"><SheetHead title="Plate card" onBack={done} /><p className="body">No car for this {T.bill} yet.</p></main>;
  }
  const first = ride.guest.split(' ')[0];
  return (
    <main className="bsheet bplatecard" data-screen="b9" id="main">
      <p className="foot">Show this to the guest</p>
      <h1 className="h1">{first}, your car is outside</h1>
      <div className="bplate num" role="img" aria-label={`Plate ${ride.carInfo.plateSpoken}`} data-testid="b9-plate">{ride.carInfo.plate}</div>
      <p className="body">{ride.carInfo.car} · driver {ride.carInfo.driver}</p>
      <p className="body">{venue.pickupShort.replace(/\.$/, '')} · {fmt(ride.quoteCents)} on your {T.bill}</p>
      <p className="callout">The driver can call the bar at <span className="nowrap">{venue.phone}</span> if needed.</p>
      <div className="bsticky">
        <button type="button" className="btn btn--secondary bbtn-56" data-testid="b9-done" onClick={done}>Done</button>
      </div>
    </main>
  );
}

function Toggle({ label, on, onChange, testId }: { label: string; on: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} className="brow brow--44 btoggle" data-testid={testId} onClick={() => onChange(!on)}>
      <span className="grow">{label}</span><span className="btoggle__knob" aria-hidden="true" />
    </button>
  );
}

export function B10() {
  const store = useStore();
  const s = useDemoState();
  const q = s.bar.quiet;
  if (!q) {
    return <main className="bsheet" data-screen="b10" id="main"><SheetHead title="Quiet request" onBack={() => navigate('/b/tonight')} /><p className="body">No quiet requests right now.</p></main>;
  }
  return (
    <main className="bsheet" data-screen="b10" id="main">
      <SheetHead title={`Car for a guest at ${q.seat}`} onBack={() => navigate('/b/tonight')} />
      <Chip tone="warning" icon="hand" testId="b10-pill">Quiet request · {fmtET(q.at)}</Chip>
      <section className="bpanel" data-testid="b10-procedure">
        <h2 className="bsection">{venue.name} procedure</h2>
        <ol className="bsteps">{venue.bar.procedure.map((p) => <li key={p}>{p}</li>)}</ol>
      </section>
      {q.booked
        ? <p className="bnote" role="status"><Icon name="check" />House car booked.</p>
        : <button type="button" className="btn btn--primary bbtn-64" data-testid="b10-book" onClick={() => startBooking(store, q.tab, 'guest_request')}>Book the house car (Guest asked)</button>}
      <Toggle label={`Pickup at side door (${venue.bar.sideDoor.replace(/^side door, /, '')})`} on={q.sideDoor} onChange={(v) => store.barSetQuietOption('sideDoor', v)} testId="b10-side" />
      <Toggle label="Just one rider" on={q.oneRider} onChange={(v) => store.barSetQuietOption('oneRider', v)} testId="b10-one" />
      <button type="button" className="btn btn--secondary bbtn-44" data-testid="b10-seen" disabled={q.seen} onClick={() => { store.barMarkQuietSeen(); navigate('/b/tonight'); }}>
        {q.seen ? 'Seen' : 'Mark seen'}
      </button>
      <p className="foot">Shown as "Guest asked" in ride history. This alert is deleted after 30 days. No reason codes or notes. No sound.</p>
    </main>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <section className="bgroup"><h2 className="bgroup__title">{title}</h2><div className="bgroup__rows">{children}</div></section>;
}

function Row({ label, sub, onClick, testId }: { label: string; sub?: string; onClick: () => void; testId?: string }) {
  return (
    <button type="button" className="brow brow--56" onClick={onClick} data-testid={testId}>
      <span className="grow">{label}{sub && <span className="foot"> {sub}</span>}</span><Icon name="chev" />
    </button>
  );
}

export function More() {
  const s = useDemoState();
  return (
    <main className="bpage" data-screen="bmore" id="main">
      <h1 className="bsection">More</h1>
      <Group title="Tabs">
        {s.bar.tabs.map((t) => <Row key={t.tab} label={`${t.seat} · ${t.guest}`} sub={`${T.bill} #${t.tab} · ${fmt(tabCents(t))}`} onClick={() => navigate(`/b/tab?tab=${t.tab}`)} testId={`more-tab-${t.tab}`} />)}
      </Group>
      <Group title="Venue">
        <Row label="Settings" onClick={() => navigate('/b/settings')} testId="more-settings" />
        <Row label="Quiet request" onClick={() => navigate('/b/quiet')} testId="more-quiet" />
      </Group>
      <Group title="This phone">
        <Row label="Switch to guest view" sub="Same phone, same demo" onClick={toGuest} testId="more-guest" />
      </Group>
      <Group title="Demo">
        <Row label="Reset demo data" onClick={() => navigate('/b/settings?reset=1')} testId="more-reset" />
      </Group>
    </main>
  );
}

function Seg<T extends string>({ label, value, options, onChange, testId }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; testId: string }) {
  return (
    <div className="bsetting" data-testid={testId}>
      <p className="bsetting__label">{label}</p>
      <div className="bchips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className="bchip bchip--56" onClick={() => onChange(o.id)} data-testid={`${testId}-${o.id}`}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

export function B8({ route }: { route: Route }) {
  const store = useStore();
  const s = useDemoState();
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (route.query.get('reset') === '1') setConfirm(true); }, [route]);
  const set = <K extends keyof BarSettings>(k: K) => (v: BarSettings[K]) => store.barSetSetting(k, v);
  const st = s.bar.settings;
  return (
    <main className="bpage" data-screen="b8" id="main">
      <SheetHead title="Settings" onBack={() => navigate('/b/more')} />
      <Group title="Rides and pricing">
        <Seg label="Price display" value={st.priceMode} onChange={set('priceMode')} testId="set-price"
          options={[{ id: 'fare_on_tab', label: `Fare on ${T.bill}` }, { id: 'venue_perk', label: `Venue perk, first ${fmt(venue.perkCents)}` }]} />
        <p className="foot">Offered to any guest. Never tied to what the guest ordered.</p>
      </Group>
      <Group title="Venue">
        <Seg label="Morning receipt" value={st.receipt} onChange={set('receipt')} testId="set-receipt"
          options={[{ id: 'neutral', label: 'Neutral (recommended)' }, { id: 'detailed', label: 'Detailed' }]} />
        <div className="bsetting"><p className="bsetting__label">Car-close notice</p><p className="callout">{st.closeNoticeMin} min</p></div>
        <div className="bsetting"><p className="bsetting__label">Venue procedure (shown first on quiet requests)</p>
          <ol className="bsteps">{venue.bar.procedure.map((p) => <li key={p}>{p}</li>)}</ol></div>
      </Group>
      <Group title="Demo">
        <button type="button" className="btn btn--bad bbtn-56" data-testid="b8-reset" onClick={() => setConfirm(true)}>Reset demo data</button>
      </Group>
      {confirm && (
        <Sheet title="Reset demo data?" onClose={() => setConfirm(false)} testId="b8-reset-sheet">
          <p className="callout">Clears rides, {T.bills} and settings on this phone and starts the demo fresh.</p>
          <button type="button" className="btn btn--bad bbtn-56" data-testid="b8-reset-confirm"
            onClick={() => { setConfirm(false); window.dispatchEvent(new CustomEvent('ridenite:reset', { detail: { to: '/b' } })); }}>Reset</button>
          <button type="button" className="btn btn--secondary bbtn-56" onClick={() => setConfirm(false)}>Cancel</button>
        </Sheet>
      )}
    </main>
  );
}

export { startBooking };
