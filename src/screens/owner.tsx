import { T, venue } from '../venue.config';
import { navigate } from '../router';
import { Card, Chip } from '../components/primitives';
import { Screen, Top } from '../components/layout';
import { MoreRow } from './home';

/* Owner preview: static placeholder screens, no logic. Every number carries a visible
   "Sample data" label and is never presented as real (founder rule: no invented stats). */

function DemoLabel() { return <p className="demo-screen-label" data-testid="owner-label">Demo screen, sample data</p>; }

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
      <MoreRow icon="gear" title={`Ride limit per ${T.bill}`} sub="Setting preview, display only" testId="owner-limits" onClick={() => navigate('/o/limits')} />
      <MoreRow icon="glass" title="Bar view" sub="What staff see" testId="owner-bar" onClick={() => navigate('/o/bar')} />
    </Screen>
  );
}

export function OwnerSummary() {
  return (
    <Screen id="owner-summary">
      <DemoLabel />
      <Top back="/o" ctx="Owner preview" />
      <h1 className="h2">Morning summary</h1>
      <p className="foot">{venue.name}, Fri night. Placeholder layout.</p>
      <Card>
        <Stat label={`Rides on guest ${T.bills}`} value="7" />
        <Stat label="Guest asked" value="5" />
        <Stat label="I offered" value="2" />
      </Card>
      <Card>
        <Stat label="Fare adjustments posted" value="3, total +$8.40" />
        <Stat label="Fare credits posted" value="1, total -$2.10" />
        <Stat label="Held for guest OK" value="1, $2.20" />
      </Card>
      <p className="foot">Counts only. No guest names, reasons or notes are shown.</p>
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
