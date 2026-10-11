/**
 * Bar vs RideNite split (SCOPE 23:01). Every line on the guest's check carries a kind:
 * 'bar' (drinks, food, tax, tip for bar staff) or 'ride' (quote, adjustment, approved stop, credit).
 * Ride lines carry a fictional ride ID (RN-xxxxxx). Subtotals are sums of the lines, so they always add up
 * to the check exactly. The owner evidence pack (later) filters ride lines with rideLinesOnly().
 */
import { venue } from '../venue.config';
import type { DemoState } from '../store/types';
import { nightTimes, type morningFor } from './morning';
import { returnWindowEnds, ymdIso } from './payouts';

export type LineKind = 'bar' | 'ride';
export type CheckLineType = 'item' | 'tax' | 'tip' | 'ride_quote' | 'ride_adjustment' | 'ride_stop' | 'ride_credit';
export interface CheckLine {
  kind: LineKind; type: CheckLineType; name: string; cents: number;
  /** Ride lines only. */
  rideId?: string;
  /** Ride lines only, owner data (never shown to guests): pickup date (ET) + venue.payoutReturnWindowDays calendar days, "YYYY-MM-DD". */
  returnWindowEnds?: string;
}

const ALPHA = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // no I, L, O, U
/** Fictional ride ID from the demo ride id: "RN-" + 6 characters, stable for the same ride. */
export function rideRef(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  let out = '';
  for (let i = 0; i < 6; i++) { out += ALPHA[h % 32]; h = Math.floor(h / 32) ^ (i * 2654435761 >>> 0); h >>>= 0; }
  return `RN-${out}`;
}

/** Ride ID for the morning receipt: the ride on this phone, else the seeded sample ride. */
export function receiptRideId(s: DemoState): string {
  const r = s.ride && !s.ride.pending ? s.ride : null;
  return r ? rideRef(r.id) : venue.sampleRideId;
}

/** Lines on the guest's morning check, each tagged bar or ride. */
export function checkLines(s: DemoState, m: ReturnType<typeof morningFor>): CheckLine[] {
  const lines: CheckLine[] = venue.menu.map((i) => ({ kind: 'bar' as const, type: 'item' as const, name: i.name, cents: i.cents }));
  lines.push({ kind: 'bar', type: 'tax', name: venue.taxLabel, cents: m.taxCents });
  lines.push({ kind: 'bar', type: 'tip', name: `Staff tip (${s.tipPct}%)`, cents: m.tipCents });
  if (m.hasRide) {
    const rideId = receiptRideId(s);
    const win = ymdIso(returnWindowEnds(nightTimes(s).pickedUp));
    const r = m.recon;
    lines.push({ kind: 'ride', type: 'ride_quote', name: `${s.bar.settings.tabLineName}, quoted fare`, cents: m.quoteCents, rideId, returnWindowEnds: win });
    if (r && r.postedAdjCents > 0) {
      const within = Math.min(r.postedAdjCents, r.capCents);
      lines.push({ kind: 'ride', type: 'ride_adjustment', name: 'Ride fare adjustment', cents: within, rideId, returnWindowEnds: win });
      if (r.postedAdjCents > within) lines.push({ kind: 'ride', type: 'ride_stop', name: 'Approved by you over the cap', cents: r.postedAdjCents - within, rideId, returnWindowEnds: win });
    }
    if (r && r.postedAdjCents < 0) lines.push({ kind: 'ride', type: 'ride_credit', name: 'Ride fare credit', cents: r.postedAdjCents, rideId, returnWindowEnds: win });
  }
  return lines;
}

export const rideLinesOnly = (lines: readonly CheckLine[]): CheckLine[] => lines.filter((l) => l.kind === 'ride');
export const barLinesOnly = (lines: readonly CheckLine[]): CheckLine[] => lines.filter((l) => l.kind === 'bar');
const sum = (ls: readonly CheckLine[]) => ls.reduce((a, l) => a + l.cents, 0);
export function splitSubtotals(lines: readonly CheckLine[]) {
  const barCents = sum(barLinesOnly(lines)), rideCents = sum(rideLinesOnly(lines));
  return { barCents, rideCents, totalCents: barCents + rideCents };
}
