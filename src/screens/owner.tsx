import { T, venue } from '../venue.config';
import { navigate } from '../router';
import { Card, Chip } from '../components/primitives';
import { Screen, Top } from '../components/layout';
import { MoreRow } from './home';
import { sampleAnchor, sampleOwnerStatement } from '../lib/ownerData';
import { fmt, fmtSigned } from '../lib/money';
import { etYmdh } from '../lib/night';
import { displayDateFmt } from '../lib/dateFmt';

const MDW = displayDateFmt({ timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' });

/* Owner preview: static placeholder screens, no logic. Every number carries a visible
   "Sample data" label and is never presented as real (founder rule: no invented stats). */

function DemoLabel() { return <p className="demo-screen-label" data-testid="owner-label">Demo screen, sample data</p>; }

/** Statement line with its amount kept on one line (no break between '-' and '$'). */
/** Ride IDs ("RN-7Q4K2M") never break at the hyphen: only the ID itself is nowrap, the rest of the line wraps (Riley, Oct 11). */
function Ids({ text }: { text: string }) { return <>{text.split(/(RN-[A-Z0-9]+)/).map((p, i) => (i % 2 ? <span key={i} className="ride-id">{p}</span> : p))}</>; }
function Amt({ line }: { line: string }) { const i = line.lastIndexOf(': '); return <><Ids text={line.slice(0, i + 2)} /><span className="nowrap">{line.slice(i + 2)}</span></>; }

function Sample() { return <span className="sample-tag">Sample data</span>; }
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="kv">
      <div className="grow"><p className="kv__k">{label}</p><p className="kv__v num">{value} <Sample /></p></div>
    </div>
  );
}

export function OwnerIndex() {
  return (
    <Screen id="owner">
      <DemoLabel />
      <Top back="/g/home" ctx="Owner preview" />
      <h1 className="h2">Owner preview</h1>
      <p className="foot">Static screens for review. Every number here is sample data, not real results.</p>
      <MoreRow icon="receipt" title="Morning summary" sub={`Rides on ${T.bills}, adjustments and credits`} testId="owner-summary" onClick={() => navigate('/o/summary')} />
      <MoreRow icon="list" title="Monthly statement" sub="RideNite fee credits, sample lines" testId="owner-statement" onClick={() => navigate('/o/statement')} />
      <MoreRow icon="gear" title={`Ride limit per ${T.bill}`} sub="Setting preview, display only" testId="owner-limits" onClick={() => navigate('/o/limits')} />
      <MoreRow icon="venue" title="Bar view" sub="What staff see" testId="owner-bar" onClick={() => navigate('/o/bar')} />
    </Screen>
  );
}

export function OwnerSummary() {
  // Same seeded rides as the monthly statement: the night before the demo night (Fri, Oct 9).
  const now = Date.now();
  const st = sampleOwnerStatement(now);
  const fri = sampleAnchor(now) - 86_400_000;
  const day = (t: number) => { const x = etYmdh(t); return `${x.y}-${x.m}-${x.d}`; };
  const friRides = st.rides.filter((r) => day(r.pickupMs) === day(fri));
  const adj = friRides.map((r) => r.rideCents - venue.quoteCents).filter((c) => c > 0);
  const credits = st.quoteCredits.filter((c) => c.creditedCents > 0 && day(c.pickupMs) === day(fri));
  const declined = credits.reduce((a, c) => a + c.creditedCents, 0);
  return (
    <Screen id="owner-summary">
      <DemoLabel />
      <Top back="/o" ctx="Owner preview" />
      <h1 className="h2">Morning summary</h1>
      <p className="foot" data-testid="summary-night">{venue.name}, night of {MDW.format(new Date(fri))}. Placeholder layout.</p>
      <Card>
        <Stat label={`Rides on guest ${T.bills}`} value="7" />
        <Stat label="Guest asked" value="5" />
        <Stat label="I offered" value="2" />
      </Card>
      <Card>
        <Stat label="Fare adjustments posted" value={`${adj.length}, total ${fmtSigned(adj.reduce((a, c) => a + c, 0))}`} />
        <Stat label="Over the cap, guest declined" value={`${credits.length}, ${fmt(declined)} not charged`} />
        {credits.map((c) => (
          <div className="kv" key={c.rideId} data-testid="summary-quote-credit">
            <div className="grow"><p className="kv__k">Quote adjustment credit, ride <span className="ride-id">{c.rideId}</span></p><p className="kv__v num">{fmtSigned(-c.creditedCents)} <Sample /></p></div>
          </div>
        ))}
      </Card>
      <p className="foot">The credit is on the monthly statement for the same ride. Counts only. No guest names, reasons or notes are shown.</p>
    </Screen>
  );
}

export function OwnerLimits() {
  return (
    <Screen id="owner-limits">
      <DemoLabel />
      <Top back="/o" ctx="Owner preview" />
      <h1 className="h2">Ride limit per {T.bill}</h1>
      <p className="foot">Display only. Controls are disabled in this preview.</p>
      <Card>
        <div className="field">
          <label htmlFor="limit">Rides per {T.bill} per night</label>
          <select id="limit" className="input" disabled defaultValue="1"><option value="1">1 (sample)</option></select>
        </div>
        <div className="gap-s3" />
        <p className="callout">Current value: 1 <Sample /></p>
      </Card>
    </Screen>
  );
}

export function OwnerBar() {
  return (
    <Screen id="owner-bar">
      <DemoLabel />
      <Top back="/o" ctx="Owner preview" />
      <h1 className="h2">Bar view</h1>
      <Card>
        <div className="row"><b className="callout">{venue.seat} · {T.bill} #{venue.tabNumber}</b><span className="num callout">$49.00 <Sample /></span></div>
        <Chip tone="info" icon="car">Driver on the way</Chip>
        <p className="callout" data-testid="two-taps">Booked in 2 taps <Sample /></p>
      </Card>
      <p className="foot">Placeholder. Riley will mock the full {T.staff} screens.</p>
    </Screen>
  );
}

/** Owner statement preview: RideNite fee credits only (per-ride fee credits and quote adjustment credits). Sample data. */
export function OwnerStatement() {
  const st = sampleOwnerStatement(Date.now());
  return (
    <Screen id="owner-statement">
      <DemoLabel />
      <Top back="/o" ctx="Owner preview" />
      <h1 className="h2">Monthly statement</h1>
      <p className="foot">Credits on RideNite's invoice to {venue.name}. Placeholder layout.</p>
      <Card>
        <p className="kv__k">Credits against RideNite fees</p>
        {st.feeReturns.map((f) => <p key={f.line} className="callout" data-testid="fee-return-line"><Amt line={f.line} /> <Sample /></p>)}
        {st.quoteCredits.filter((c) => c.line).map((c) => <p key={c.line!} className="callout" data-testid="quote-credit-line"><Amt line={c.line!} /> <Sample /></p>)}
        {st.quoteCredits.filter((c) => c.state === 'manual_review').map((c) => <p key={`mr-${c.rideId}`} className="foot" data-testid="quote-credit-review">Ride <span className="ride-id">{c.rideId}</span>: {fmtSigned(-c.manualReviewCents)} in manual review, not credited yet. <Sample /></p>)}
        <div className="row callout"><span>RideNite fee credits</span><span className="num nowrap" data-testid="fee-returns-subtotal">{fmtSigned(st.feeReturnsCents)}</span></div>
        <div className="row callout"><span>Quote adjustment credits</span><span className="num nowrap" data-testid="quote-credits-subtotal">{fmtSigned(st.quoteCreditsCents)}</span></div>
        <p className="callout num" data-testid="credits-total">Total credits {fmtSigned(st.feeReturnsCents + st.quoteCreditsCents)} <Sample /></p>
      </Card>
      <Card testId="statement-rides">
        <p className="kv__k">Rides in these lines</p>
        {st.rides.filter((r) => st.feeReturns.some((f) => f.rideId === r.rideId) || st.quoteCredits.some((c) => c.rideId === r.rideId)).map((r) => (
          <p key={r.rideId} className="foot" data-testid="statement-ride">Ride <span className="ride-id">{r.rideId}</span>, {MDW.format(new Date(r.pickupMs))}, ride line {fmt(r.rideCents)} <Sample /></p>
        ))}
      </Card>
      <p className="foot" data-testid="statement-footnote">{st.footnote}</p>
      <p className="foot" data-testid="quote-credit-footnote">{st.quoteCreditFootnote}</p>
      <button type="button" className="textlink" data-testid="open-sample-traffic" onClick={() => navigate('/g/sample-traffic')}>See the guest's sample receipt for this ride</button>
    </Screen>
  );
}
