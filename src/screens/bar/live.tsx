import { useState } from 'react';
import { navigate } from '../../router';
import { useDemoState, useStore } from '../../store';
import { useNow } from '../../hooks';
import { venue } from '../../venue.config';
import { fmt } from '../../lib/money';
import { fmtET } from '../../lib/confirmRecord';
import { DEMO_TIMELINE, type Stage } from '../../lib/rideState';
import { Icon } from '../../components/Icon';
import { Chip } from '../../components/primitives';
import type { BarRide } from '../../store/types';
import { barStatus, EP_HISTORY } from './common';

/* B4 Live rides (with B4n near-pickup chip and decline banner), B5 history (stretch). */

const DROP_AFTER_MS = 10 * 60_000; // completed rides leave the board 10 minutes after completion

function Tile({ label, value, sample, testId }: { label: string; value: string; sample?: boolean; testId?: string }) {
  return (
    <div className="btile" data-testid={testId}>
      <p className="btile__v num">{value}</p>
      <p className="btile__k">{label}{sample && <span className="sample-tag">Sample</span>}</p>
    </div>
  );
}

export function finalFor(ride: BarRide, stage: Stage): number | null {
  return stage === 'complete' ? venue.finalFareCents[ride.scenario] : null;
}

export function B4() {
  const store = useStore();
  const s = useDemoState();
  const now = useNow(500);
  const all = store.barRides().filter((r) => store.stageOf(r) !== 'pending');
  const withStage = all.map((r) => ({ r, st: store.stageOf(r) }));
  const board = withStage.filter(({ r, st }) => !(st === 'complete' && now - (r.bookedAt + DEMO_TIMELINE.complete) > DROP_AFTER_MS) && st !== 'canceled_by_guest');
  const declined = board.filter(({ st }) => st === 'canceled_by_driver');
  const near = board.filter(({ st }) => st === 'near');
  const active = board.filter(({ st }) => !['complete', 'canceled_by_driver', 'canceled_by_guest', 'no_cars'].includes(st)).length;
  const completed = s.bar.earlierRides + withStage.filter(({ st }) => st === 'complete').length;
  return (
    <main className="bpage" data-screen="b4" id="main">
      {declined.map(({ r }) => (
        <div key={r.id} className="bbanner bbanner--bad" role="alert" data-testid="decline-banner">
          <div className="bbanner__row"><Icon name="alert" /><span className="grow"><b>Driver declined. Rebook?</b> {r.seat} · {r.guest}</span></div>
          <div className="bbanner__actions">
            <button type="button" className="btn btn--secondary bbtn-56" data-testid={`b4-rebook-${r.tab}`} onClick={() => store.barRebook(r.id)}>
              <Icon name="car" /><span>Rebook</span>
            </button>
            <button type="button" className="btn btn--secondary bbtn-44" data-testid={`b4-other-${r.tab}`} onClick={() => store.barRebook(r.id, 'other')}>Another partner</button>
          </div>
        </div>
      ))}
      {near.map(({ r }) => (
        <p key={r.id} className="chip chip--info bnear" data-testid="b4n-chip"><Icon name="car" />Car 2 min away, {r.seat}</p>
      ))}
      <div className="btiles" data-testid="b4-kpis">
        <Tile label="Active now" value={String(active)} testId="kpi-active" />
        <Tile label="Avg pickup wait tonight" value={`${venue.etaMinutes} min`} sample />
        <Tile label="Completed tonight" value={String(completed)} testId="kpi-completed" />
        <Tile label="Needs attention" value={String(declined.length)} testId="kpi-attn" />
      </div>
      <h1 className="bsection">Live rides</h1>
      {board.length === 0 && <p className="body">No rides right now.</p>}
      <div className="bgrid">
        {board.map(({ r, st }) => {
          const chip = barStatus(st, r);
          const fin = finalFor(r, st);
          const plateable = ['en_route', 'near', 'arrived'].includes(st);
          return (
            <section key={r.id} className="bcard" data-testid={`ride-card-${r.tab}`}>
              <div className="bcard__head">
                <div className="grow">
                  <h2 className="bcard__title">{r.seat} · {r.guest}</h2>
                  <p className="bcard__sub">tab #{r.tab} · {EP_HISTORY[r.entryPoint]} · booked {fmtET(r.bookedAt)}</p>
                </div>
              </div>
              <Chip tone={chip.tone} icon={chip.icon} testId={`chip-${r.tab}`}>{chip.label}</Chip>
              {st === 'near' && <Chip tone="info" testId={`near-${r.tab}`}>2 min away</Chip>}
              <p className="callout">{r.carInfo.car} · <span className="num">{r.carInfo.plate}</span></p>
              <p className="foot">{r.carInfo.partner}</p>
              <p className="foot num" data-testid={`fare-${r.tab}`}>Quote {fmt(r.quoteCents)}{fin != null ? ` · Final fare ${fmt(fin)}` : ''}</p>
              <div className="bpair">
                <button type="button" className="btn btn--secondary bbtn-44" data-testid={`b4-tab-${r.tab}`} onClick={() => navigate(`/b/tab?tab=${r.tab}`)}>Open tab</button>
                {plateable && <button type="button" className="btn btn--secondary bbtn-44" data-testid={`b4-plate-${r.tab}`} onClick={() => navigate(`/b/plate?tab=${r.tab}`)}>Show plate card</button>}
              </div>
            </section>
          );
        })}
      </div>
      <p className="fict">Nothing here asks staff to confirm arrival. No sound.</p>
    </main>
  );
}

const FILTERS = ['All entry points', 'Guest request', 'Staff offer'] as const;

export function B5() {
  const store = useStore();
  useNow(1000);
  const [f, setF] = useState<(typeof FILTERS)[number]>('All entry points');
  const rows = store.barRides().filter((r) => store.stageOf(r) !== 'pending')
    .filter((r) => f === 'All entry points' || EP_HISTORY[r.entryPoint] === f)
    .sort((a, b) => b.bookedAt - a.bookedAt);
  return (
    <main className="bpage" data-screen="b5" id="main">
      <h1 className="bsection">Ride history, tonight</h1>
      <div className="bchips" role="group" aria-label="Filter">
        {FILTERS.map((x) => (
          <button key={x} type="button" className="bchip" aria-pressed={f === x} onClick={() => setF(x)} data-testid={`hist-${x.split(' ')[0].toLowerCase()}`}>{x}</button>
        ))}
      </div>
      <div className="blist">
        {rows.map((r) => {
          const st = store.stageOf(r);
          const fin = finalFor(r, st);
          return (
            <div key={r.id} className="brow brow--static" data-testid="hist-row">
              <span className="grow"><b>{fmtET(r.bookedAt)} · tab #{r.tab}</b><span className="foot"> {EP_HISTORY[r.entryPoint]} · {r.carInfo.partner}</span></span>
              <span className="num">{fmt(fin ?? r.quoteCents)}</span>
              <span className="foot">{barStatus(st, r).label}</span>
            </div>
          );
        })}
      </div>
      <p className="fict">Counts and rows only. No reasons, notes or drink counts. Earlier rides tonight are not in this demo.</p>
    </main>
  );
}
