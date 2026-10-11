import { useEffect, useState, type ReactNode } from 'react';
import { navigate, type Route } from '../../router';
import { useDemoState, useStore } from '../../store';
import { useNow } from '../../hooks';
import { venue } from '../../venue.config';
import { fmt, fmtSigned } from '../../lib/money';
import { barConfirmLine, fmtET } from '../../lib/confirmRecord';
import { tabItems, tabTotals } from '../../lib/tab';
import { isAcceptedStage } from '../../lib/rideState';
import { Icon } from '../../components/Icon';
import { Chip, Sheet } from '../../components/primitives';
import type { BarSettings, FareScenario } from '../../store/types';
import { barRideHeadline, barStatus, EP_LABEL, HeaderBook, SheetHead, tabCents, toGuest } from './common';
import { startBooking } from './tonight';

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
        <SheetHead title="Tab" onBack={() => navigate('/b/more')} />
        <p className="body">This tab isn't open.</p>
      </main>
    );
  }
  const ride = [...store.barRides()].reverse().find((r) => r.tab === t.tab && store.stageOf(r) !== 'canceled_by_driver' && store.stageOf(r) !== 'pending') ?? null;
  const stage = ride ? store.stageOf(ride) : null;
  const done = stage === 'complete';
  const isGuestRide = ride && s.ride?.id === ride.id;
  // Charge timing: the fare line and record line post to the tab only once a driver accepts.
  const accepted = isAcceptedStage(stage);
  const tot = tabTotals({
    items: tabItems(t.items), taxRate: venue.taxRate, tabLineName: s.bar.settings.tabLineName,
    ride: ride && accepted ? { quoteCents: ride.quoteCents, finalCents: done ? venue.finalFareCents[ride.scenario] : null, overCapAnswer: isGuestRide ? s.overCapAnswer : null } : null,
  });
  const rec = ride ? barConfirmLine(s, ride) : null;
  const st = ride && stage ? barStatus(stage, ride) : null;
  return (
    <main className="bpage" data-screen="b6" id="main">
      <SheetHead title={<>{t.seat} · {t.guest} · tab #{t.tab}</>} onBack={() => navigate('/b/tonight')} right={<HeaderBook />} />
      <table className="btab" data-testid="b6-lines">
        <tbody>
          {tot.lines.map((l, i) => (
            <tr key={i} data-testid={`b6-${l.kind}`} className={`btab__${l.kind}`}>
              <th scope="row">
                {l.kind === 'item' && l.qty! > 1 ? `${l.name} x${l.qty}` : l.name}
                {l.kind === 'ride_quote' && ride && (
                  <span className="foot btab__note">{EP_LABEL[ride.entryPoint]} · posted {fmtET(ride.bookedAt)}</span>
                )}
                {l.kind === 'ride_quote' && rec && <span className="foot btab__note" data-testid="b6-record">{rec.text}. {rec.amounts}</span>}
              </th>
              <td className="num">{l.kind === 'ride_adjustment' || l.kind === 'ride_credit' ? fmtSigned(l.cents) : l.kind === 'ride_held' ? `(${fmt(l.cents)})` : fmt(l.cents)}</td>
            </tr>
          ))}
          <tr className="btab__total" data-testid="b6-total"><th scope="row">Total before tip</th><td className="num">{fmt(tot.totalBeforeTipCents)}</td></tr>
        </tbody>
      </table>
      <p className="foot" data-testid="b6-tip-base">Tip prompt base: {fmt(tot.tipBaseCents)} (drinks and food, not the ride).</p>
      {ride && !accepted && stage !== 'no_cars' && <p className="foot" data-testid="b6-not-yet">The fare goes on this tab when a driver accepts.</p>}
      {ride && stage === 'no_cars' && <p className="foot" data-testid="b6-no-driver">No driver found. Nothing was added to this tab.</p>}
      {ride && accepted && !done && <p className="foot">Any fare adjustment or credit posts as its own line after drop-off.</p>}
      {ride && accepted && <p className="foot" data-testid="b6-fee">Bar only: RideNite fee for this ride {fmt(venue.bar.feeCents)}, billed monthly. <span className="sample-tag">Sample</span></p>}
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
          </div>
        </section>
      )}
      {t.close === 'open' ? (
        <div className="bstack">
          <button type="button" className="btn btn--secondary bbtn-56" data-testid="b6-close" onClick={() => store.barCloseTab(t.tab, 'closed')}>Close tab now</button>
          <button type="button" className="btn btn--secondary bbtn-56" data-testid="b6-hold" onClick={() => store.barCloseTab(t.tab, 'held')}>Hold for morning checkout</button>
        </div>
      ) : (
        <p className="bnote" role="status" data-testid="b6-closed"><Icon name="check" />{t.close === 'closed' ? 'Tab closed.' : 'Held for morning checkout. The guest gets the receipt in the morning.'}</p>
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
    return <main className="bsheet" data-screen="b9" id="main"><SheetHead title="Plate card" onBack={done} /><p className="body">No car for this tab yet.</p></main>;
  }
  const first = ride.guest.split(' ')[0];
  return (
    <main className="bsheet bplatecard" data-screen="b9" id="main">
      <p className="foot">Show this to the guest</p>
      <h1 className="h1">{first}, your car is outside</h1>
      <div className="bplate num" role="img" aria-label={`Plate ${ride.carInfo.plateSpoken}`} data-testid="b9-plate">{ride.carInfo.plate}</div>
      <p className="body">{ride.carInfo.car} · driver {ride.carInfo.driver}</p>
      <p className="body">{venue.pickupShort.replace(/\.$/, '')} · {fmt(ride.quoteCents)} on your tab</p>
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
        {s.bar.tabs.map((t) => <Row key={t.tab} label={`${t.seat} · ${t.guest}`} sub={`tab #${t.tab} · ${fmt(tabCents(t))}`} onClick={() => navigate(`/b/tab?tab=${t.tab}`)} testId={`more-tab-${t.tab}`} />)}
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
          options={[{ id: 'fare_on_tab', label: 'Fare on tab' }, { id: 'venue_perk', label: `Venue perk, first ${fmt(venue.perkCents)}` }]} />
        <p className="foot">Offered to any guest. Never tied to drinks purchased.</p>
        <Seg label="Tab line name" value={st.tabLineName} onChange={set('tabLineName')} testId="set-line"
          options={[{ id: 'Courtesy car', label: 'Courtesy car' }, { id: 'RideNite Ride', label: 'RideNite Ride' }]} />
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
          <p className="callout">Clears rides, tabs and settings on this phone and starts the demo fresh.</p>
          <button type="button" className="btn btn--bad bbtn-56" data-testid="b8-reset-confirm"
            onClick={() => { setConfirm(false); window.dispatchEvent(new CustomEvent('ridenite:reset', { detail: { to: '/b' } })); }}>Reset</button>
          <button type="button" className="btn btn--secondary bbtn-56" onClick={() => setConfirm(false)}>Cancel</button>
        </Sheet>
      )}
    </main>
  );
}

export { startBooking };
