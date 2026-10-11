/**
 * Data for the owner preview (SCOPE 23:01 to 23:12). No UI yet: it waits on Riley's mock.
 * - Evidence pack: ride lines only (rideLinesOnly), each with its ride ID, plus the guest record facts.
 * - Monthly statement: split into Bar sales and RideNite rides, every figure labeled Sample data. Each ride
 *   carries a muted status chip ("Credit window open until Jan 8", then "Payout final").
 * - Fee credits: RideNite's own per-ride fee only, as an invoice credit per ride (Harper 23:11). Never fare-sized.
 */
import { checkLines, rideLinesOnly, splitSubtotals, type CheckLine } from './checkLines';
import { morningFor } from './morning';
import { confirmLine } from './confirmRecord';
import type { DemoState } from '../store/types';
import { payoutReturnCents, payoutReturnLine, quoteAdjustmentCredits, quoteCreditLine, returnWindowEnds, returnWindowStatus, statementFootnote, ymdIso, FORWARDING_COPY, EVIDENCE_COPY, QUOTE_CREDIT_FOOTNOTE, type QuoteCreditResult } from './payouts';
import { capFor, reconcile, type Reconciliation } from './fare';
import { tabItems } from './tab';
import type { MenuItem } from '../venue.config';
import { venue } from '../venue.config';
import { rideRef } from './checkLines';
import { etYmdh } from './night';
import { etWallToUtc } from './hold';

const ymd = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return { y, m, d }; };

export const SAMPLE_LABEL = 'Sample data' as const;

export interface EvidenceItem { rideId: string; lines: CheckLine[]; rideCents: number; record: string | null; returnWindowEnds: string; status: string; label: typeof SAMPLE_LABEL }

/** One evidence item per ride on the check: only lines with kind 'ride'. Bar lines never appear. */
export function evidencePack(s: DemoState, now: number = Date.now()): EvidenceItem[] {
  const m = morningFor(s, now);
  const ride = rideLinesOnly(checkLines(s, m));
  const byId = new Map<string, CheckLine[]>();
  for (const l of ride) byId.set(l.rideId!, [...(byId.get(l.rideId!) ?? []), l]);
  const rec = confirmLine(s);
  return [...byId].map(([rideId, lines]) => ({ rideId, lines, rideCents: lines.reduce((a, l) => a + l.cents, 0), record: rec?.text ?? null, returnWindowEnds: lines[0].returnWindowEnds!, status: returnWindowStatus(ymd(lines[0].returnWindowEnds!), now), label: SAMPLE_LABEL }));
}

export interface StatementNight { night: string; lines: readonly CheckLine[] }
export interface MonthlyStatement {
  month: string;
  label: typeof SAMPLE_LABEL;
  rows: { night: string; barCents: number; rideCents: number; totalCents: number; rides: { rideId: string; cents: number; returnWindowEnds: string; status: string }[] }[];
  barSalesCents: number;
  rideNiteRidesCents: number;
  totalCents: number;
}

/** Monthly statement from tagged lines. Totals are sums of the rows, so Bar sales + RideNite rides = total exactly. */
export function monthlyStatement(month: string, nights: readonly StatementNight[], now: number = Date.now()): MonthlyStatement {
  const rows = nights.map((n) => {
    const sp = splitSubtotals(n.lines);
    return { night: n.night, barCents: sp.barCents, rideCents: sp.rideCents, totalCents: sp.totalCents, rides: ridesOf(n.lines, now) };
  });
  const barSalesCents = rows.reduce((a, r) => a + r.barCents, 0);
  const rideNiteRidesCents = rows.reduce((a, r) => a + r.rideCents, 0);
  return { month, label: SAMPLE_LABEL, rows, barSalesCents, rideNiteRidesCents, totalCents: barSalesCents + rideNiteRidesCents };
}

function ridesOf(lines: readonly CheckLine[], now: number) {
  const by = new Map<string, { rideId: string; cents: number; returnWindowEnds: string; status: string }>();
  for (const l of rideLinesOnly(lines)) {
    const cur = by.get(l.rideId!) ?? { rideId: l.rideId!, cents: 0, returnWindowEnds: l.returnWindowEnds!, status: returnWindowStatus(ymd(l.returnWindowEnds!), now) };
    cur.cents += l.cents; by.set(l.rideId!, cur);
  }
  return [...by.values()];
}

/** Status chip style for the owner statement: always muted text, never amber. */
export const STATUS_TONE = 'muted' as const;

export interface SampleOwnerRide { rideId: string; rideNo: string; pickupMs: number; feeChargedCents: number; rideCents: number; returnWindowEnds: string; status: string; tone: typeof STATUS_TONE; label: typeof SAMPLE_LABEL }

const DAY = 86_400_000;
/**
 * Sample owner-statement rides seeded relative to now (SCOPE 23:07): some older than the 90-day window
 * ("Payout final") and some recent ("Credit window open until Jan 8"). Fictional amounts reuse spec fares.
 */
/** Seeds count back from 11 PM ET on the latest demo night (the ET date 18 h ago, so Saturday night and Sunday
 *  morning both anchor on Sat), so "1 day ago" is always the night before (Fri, Oct 9 for the Sat, Oct 10 night). */
export function sampleAnchor(now: number): number {
  const n = etYmdh(now - 18 * 3_600_000);
  return etWallToUtc(n.y, n.m, n.d, 23, 0);
}

export function sampleOwnerRides(now: number): SampleOwnerRide[] {
  // [days ago, ride cents]. Ride 4823 (index 5): final fare $28.30 over the $25.20 approved cap, guest declined; charged $25.20.
  const seeds: [number, number][] = [[120, 2100], [95, 2460], [40, 1890], [1, 2460], [2, 2740], [1, 2520]];
  return seeds.map(([ago, cents], i) => {
    const pickupMs = sampleAnchor(now) - ago * DAY;
    const end = returnWindowEnds(pickupMs);
    return { rideId: rideRef(`sample-owner-${i}-${venue.slug}`), rideNo: String(4818 + i), pickupMs, feeChargedCents: venue.perRideFeeCents, rideCents: cents, returnWindowEnds: ymdIso(end), status: returnWindowStatus(end, now), tone: STATUS_TONE, label: SAMPLE_LABEL };
  });
}

export interface FeeReturn { rideNo: string; rideId: string; outcome: 'dispute_lost' | 'refunded_under_rule'; cents: number; line: string; label: typeof SAMPLE_LABEL }

/**
 * Sample fee credits for the statement, seeded relative to now: ride 4821 (yesterday, guest won the dispute)
 * and ride 4820 (refunded by the bar under the refund rule). Each is -$1.00, RideNite's own fee.
 */
export function sampleFeeReturns(now: number): FeeReturn[] {
  const rides = sampleOwnerRides(now);
  const pick = (no: string) => rides.find((r) => r.rideNo === no)!;
  return ([['4821', 'dispute_lost'], ['4820', 'refunded_under_rule']] as const).map(([no, outcome]) => {
    const r = pick(no);
    // Statement lines use the RideNite ride ID (RN-xxxxxx), the same format as guest receipts.
    return { rideNo: no, rideId: r.rideId, outcome, cents: payoutReturnCents(r.feeChargedCents), line: payoutReturnLine(r.rideId, r.pickupMs, outcome, r.feeChargedCents), label: SAMPLE_LABEL };
  });
}

export interface QuoteCredit extends QuoteCreditResult { line: string | null; label: typeof SAMPLE_LABEL }

/**
 * Separate sample ride (team decision Oct 11): its own tab (#4479), its own total, Sample data. The fare ran over the
 * cap because of traffic on the driver's route (no guest change) and the guest declined the difference on their own
 * phone. Quote $21.00, approved maximum $25.20, final fare $28.30, declined $3.10 (credit to the bar, <= $10).
 * Same ride ID (RN-xxxxxx) on the guest receipt and the owner statement.
 */
export interface SampleTrafficRide {
  tab: string; seat: string; guest: string; rideId: string; pickupMs: number;
  items: MenuItem[]; itemsCents: number; taxCents: number; tipCents: number; barCents: number;
  quoteCents: number; capCents: number; finalCents: number; recon: Reconciliation; rideCents: number; totalCents: number;
  label: typeof SAMPLE_LABEL;
}
export function sampleTrafficRide(now: number): SampleTrafficRide {
  const r = sampleOwnerRides(now).find((x) => x.rideNo === '4823')!;
  const q = venue.quoteCents;
  const finalCents = 2830;
  const recon = reconcile(q, finalCents, 'no');
  const items = tabItems([['Table snacks', 1], ['Madeleines', 1]]);
  const itemsCents = items.reduce((a, i) => a + i.cents, 0);
  const taxCents = Math.round(itemsCents * venue.taxRate);
  const tipCents = Math.round((itemsCents * venue.defaultTipPct) / 100);
  const barCents = itemsCents + taxCents + tipCents;
  const rideCents = q + recon.postedAdjCents;
  return { tab: '4479', seat: 'Bar 6', guest: 'Chris P.', rideId: r.rideId, pickupMs: r.pickupMs, items, itemsCents, taxCents, tipCents, barCents,
    quoteCents: q, capCents: capFor(q), finalCents, recon, rideCents, totalCents: barCents + rideCents, label: SAMPLE_LABEL };
}

/** The statement's quote adjustment credit for the sample traffic ride (declined overage, capped $10 per ride). */
export function sampleQuoteCredits(now: number): QuoteCredit[] {
  const t = sampleTrafficRide(now);
  return quoteAdjustmentCredits([{ rideId: t.rideId, pickupMs: t.pickupMs, quoteCents: t.quoteCents, capCents: t.capCents, finalCents: t.finalCents, bookedAtRideNiteQuote: true, declinedOnGuestPhone: true, guestCausedOverage: false }])
    .map((c) => ({ ...c, line: c.creditedCents > 0 ? quoteCreditLine(c.rideId, c.pickupMs, c.creditedCents) : null, label: SAMPLE_LABEL }));
}

export interface OwnerStatementSample {
  label: typeof SAMPLE_LABEL;
  rides: SampleOwnerRide[];
  feeReturns: FeeReturn[];
  feeReturnsCents: number;
  quoteCredits: QuoteCredit[];
  quoteCreditsCents: number;
  quoteCreditFootnote: string;
  footnote: string;
  forwarding: string;
  evidence: string;
}
/** Everything the owner statement preview needs, Sample data only. */
export function sampleOwnerStatement(now: number): OwnerStatementSample {
  const feeReturns = sampleFeeReturns(now);
  const quoteCredits = sampleQuoteCredits(now);
  return {
    label: SAMPLE_LABEL, rides: sampleOwnerRides(now), feeReturns,
    feeReturnsCents: feeReturns.reduce((a, f) => a + f.cents, 0),
    quoteCredits, quoteCreditsCents: -quoteCredits.reduce((a, c) => a + c.creditedCents, 0), quoteCreditFootnote: QUOTE_CREDIT_FOOTNOTE,
    footnote: statementFootnote(), forwarding: FORWARDING_COPY, evidence: EVIDENCE_COPY,
  };
}
