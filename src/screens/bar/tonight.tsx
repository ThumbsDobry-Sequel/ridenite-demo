import { tabCloseState } from '../../lib/tab';
import { navigate } from '../../router';
import { useDemoState, useStore } from '../../store';
import { useNow } from '../../hooks';
import { venue } from '../../venue.config';
import { fmt } from '../../lib/money';
import { fmtET } from '../../lib/confirmRecord';
import { Icon } from '../../components/Icon';
import { Chip } from '../../components/primitives';
import type { BarTab } from '../../store/types';
import type { EntryPoint } from '../../lib/handoff';
import { barStatus, StatusLine, tabCents } from './common';

/* B0 first staff login and B1 Tonight. */

export function B0() {
  const store = useStore();
  const go = () => { store.barWelcome(); navigate('/b/tonight', { replace: true }); };
  return (
    <main className="bpage bpage--center" data-screen="b0" id="main">
      <Icon name="glass" className="icon icon--hero" />
      <h1 className="h1">Welcome, partner.</h1>
      <p className="body">Take the 12-minute RideNite module in the next 14 days. You can book guest requests now.</p>
      <div className="bstack">
        <button type="button" className="btn btn--primary bbtn-56" data-testid="b0-tonight" onClick={go}>Go to Tonight</button>
        <button type="button" className="btn btn--secondary bbtn-56" data-testid="b0-module"
          onClick={() => { store.barWelcome(); navigate('/b/tonight?module=1', { replace: true }); }}>Start the module</button>
      </div>
      <p className="fict">The training module is not part of this demo.</p>
    </main>
  );
}

export function startBooking(store: ReturnType<typeof useStore>, tab: string, ep: EntryPoint) {
  store.barStartDraft(tab, ep);
  navigate(`/b/sheet?tab=${tab}`);
}

function TabCard({ t, rank }: { t: BarTab; rank: number }) {
  const store = useStore();
  const s = useDemoState();
  const ride = [...store.barRides()].reverse().find((r) => r.tab === t.tab) ?? null;
  const stage = ride ? store.stageOf(ride) : null;
  const active = ride && stage && !['complete', 'canceled_by_guest'].includes(stage);
  const reply = s.bar.replies.find((r) => r.tab === t.tab);
  const quiet = s.bar.quiet && s.bar.quiet.tab === t.tab && !s.bar.quiet.booked ? s.bar.quiet : null;
  const isGuestTab = t.tab === (s.linkedTab?.tab ?? venue.tabNumber);
  const asked = isGuestTab && s.staffPings.some((p) => p.kind === 'guest_request');
  const head = (
    <div className="bcard__head">
      <div className="grow">
        <h2 className="bcard__title">{t.seat} · {t.guest}</h2>
        <p className="bcard__sub">tab #{t.tab}</p>
      </div>
      <span className="bcard__amt num" data-testid={`amt-${t.tab}`}>{fmt(tabCents(t))}</span>
    </div>
  );
  let body;
  const close = tabCloseState(t, stage ?? null, Date.now());
  if (close === 'pending') {
    body = <StatusLine tone="info" icon="clock" testId={`pending-${t.tab}`}>Ride pending pickup</StatusLine>;
  } else if (close !== 'open') {
    body = <StatusLine tone="neutral" icon="check">{close === 'closed' ? 'Tab closed' : 'Held for morning checkout'}</StatusLine>;
  } else if (ride && stage === 'canceled_by_driver') {
    body = (
      <>
        <StatusLine tone="bad" icon="alert" testId={`status-${t.tab}`}>Driver declined. Rebook?</StatusLine>
        <button type="button" className="btn btn--secondary bbtn-56" data-testid={`rebook-${t.tab}`} onClick={() => store.barRebook(ride.id)}>
          <Icon name="car" /><span>Rebook</span>
        </button>
      </>
    );
  } else if (ride && stage && active) {
    const st = barStatus(stage, ride);
    body = (
      <>
        <StatusLine tone={st.tone} icon={st.icon} testId={`status-${t.tab}`}>{st.label}</StatusLine>
        {stage !== 'pending' && (
          <button type="button" className="btn btn--secondary bbtn-44" data-testid={`open-tab-${t.tab}`} onClick={() => navigate(`/b/tab?tab=${t.tab}`)}>Open tab</button>
        )}
      </>
    );
  } else {
    body = (
      <>
        {ride && stage === 'complete' && <StatusLine tone="neutral" icon="check" testId={`status-${t.tab}`}>Completed</StatusLine>}
        {quiet && <StatusLine tone="warning" icon="hand" testId={`status-${t.tab}`}>Quiet request · {fmtET(quiet.at)}</StatusLine>}
        {asked && !quiet && <StatusLine tone="warning" icon="hand" testId={`status-${t.tab}`}>Car requested, {t.seat}</StatusLine>}
        {reply && <StatusLine tone="info" icon="phone" testId={`status-${t.tab}`}>{t.guest.split(' ')[0]} saw {fmt(reply.quoteCents)} on their phone</StatusLine>}
        {!reply && !quiet && !asked && t.linkSentAt && !ride && (
          <div className="bcard__line">
            <StatusLine tone="warning" icon="phone" testId={`status-${t.tab}`}>Link sent · waiting for drop-off</StatusLine>
            <button type="button" className="btn btn--secondary bbtn-44 bbtn-inline" data-testid={`resend-${t.tab}`} onClick={() => store.barResendLink(t.tab)}>Resend text</button>
          </div>
        )}
        <div className="bpair">
          <button type="button" className="btn btn--secondary bbtn-56" data-testid={`ask-${t.tab}`} onClick={() => startBooking(store, t.tab, 'guest_request')}>Guest asked</button>
          <button type="button" className="btn btn--secondary bbtn-56" data-testid={`offer-${t.tab}`} onClick={() => startBooking(store, t.tab, 'staff_offer')}>I offered</button>
        </div>
      </>
    );
  }
  return (
    <section className={`bcard${rank === 0 ? ' bcard--attn' : ''}`} data-testid={`tab-card-${t.tab}`} data-rank={rank}>
      {head}
      {body}
    </section>
  );
}

export function B1() {
  const store = useStore();
  const s = useDemoState();
  useNow(500);
  const q = s.bar.quiet && !s.bar.quiet.seen && !s.bar.quiet.booked ? s.bar.quiet : null;
  const rides = store.barRides();
  const rankOf = (t: BarTab) => {
    if (t.close !== 'open' && t.close !== 'pending') return 4;
    const r = [...rides].reverse().find((x) => x.tab === t.tab);
    const st = r ? store.stageOf(r) : null;
    if (st === 'canceled_by_driver' || (q && q.tab === t.tab)) return 0;
    if (!st || st === 'complete' || st === 'canceled_by_guest') return st === 'complete' ? 3 : 1;
    return 2;
  };
  const tabs = s.bar.tabs.map((t) => ({ t, rank: rankOf(t) })).sort((a, b) => a.rank - b.rank);
  return (
    <main className="bpage" data-screen="b1" id="main">
      {q && (
        <div className="bbanner bbanner--quiet" role="status" data-testid="quiet-banner">
          <Icon name="hand" />
          <span className="grow">Quiet request · {q.seat} · {fmtET(q.at)}</span>
          <button type="button" className="btn btn--secondary bbtn-44" data-testid="quiet-open" onClick={() => navigate('/b/quiet')}>Open</button>
        </div>
      )}
      {tabs.length === 0 && (
        <section className="bcard"><p className="body">No open tabs yet.</p></section>
      )}
      <div className="bgrid">
        {tabs.map(({ t, rank }) => <TabCard key={t.tab} t={t} rank={rank} />)}
        <button type="button" className="bcard bcard--new" data-testid="new-guest"
          onClick={() => { store.barNewGuest(); }}>
          <Icon name="person" /><span>+ New guest</span>
        </button>
      </div>
      <p className="fict">Demo: + New guest adds a sample guest. The live app asks for first name and mobile.</p>
      <p className="fict"><Chip tone="neutral">Sample data</Chip> Guests, tabs and cars are fictional.</p>
    </main>
  );
}
