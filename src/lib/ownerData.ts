/**
 * Data for the owner preview (SCOPE 23:01, 23:05). No UI yet: it waits on Riley's mock.
 * - Evidence pack: ride lines only (rideLinesOnly), each with its ride ID, plus the guest record facts.
 * - Monthly statement: split into Bar sales and RideNite rides, every figure labeled Sample data.
 *   No payout-return or reimbursement money line: the type has no field for one. Each ride carries only a
 *   status text from its return window ("Return window open until Fri, Oct 16", then "Payout final").
 */
import { checkLines, rideLinesOnly, splitSubtotals, type CheckLine } from './checkLines';
import { morningFor } from './morning';
import { confirmLine } from './confirmRecord';
import type { DemoState } from '../store/types';
import { returnWindowEnds, returnWindowStatus, ymdIso } from './payouts';
import { venue } from '../venue.config';
import { rideRef } from './checkLines';

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

export interface SampleOwnerRide { rideId: string; pickupMs: number; rideCents: number; returnWindowEnds: string; status: string; tone: typeof STATUS_TONE; label: typeof SAMPLE_LABEL }

const DAY = 86_400_000;
/**
 * Sample owner-statement rides seeded relative to now (SCOPE 23:07): some older than the 90-day window
 * ("Payout final") and some recent ("Return window open until Jan 8"). Fictional amounts reuse spec fares.
 */
export function sampleOwnerRides(now: number): SampleOwnerRide[] {
  const seeds: [number, number][] = [[120, 2100], [95, 2460], [40, 1890], [2, 2740]]; // [days ago, ride cents]
  return seeds.map(([ago, cents], i) => {
    const pickupMs = now - ago * DAY;
    const end = returnWindowEnds(pickupMs);
    return { rideId: rideRef(`sample-owner-${i}-${venue.slug}`), pickupMs, rideCents: cents, returnWindowEnds: ymdIso(end), status: returnWindowStatus(end, now), tone: STATUS_TONE, label: SAMPLE_LABEL };
  });
}
