/**
 * Owner payout data (SCOPE 23:05 to 23:12, Harper payout-return memo section 4). Data only, never shown to guests.
 * - returnWindowEnds = ET calendar date of the ride's pickup + venue.payoutReturnWindowDays (90) calendar days.
 *   Open through the end of that day ET; after that the statement status is "Payout final".
 * - Payout Return = RideNite's own per-ride fee as charged on that ride (stored feeChargedCents, never live config),
 *   as an invoice credit, one ride at a time. Never more than that ride's recorded fee; never any part of the subscription.
 *   Never the fare. Returned when a guest wins a dispute on the ride line (notice dated within the window, evidence
 *   filed in time) or when the bar refunds the ride line under the refund rule.
 * - Forwarding has no fixed deadline ("as soon as you reasonably can"). RideNite sends the Evidence Pack within
 *   1 business day, or the same business day when the processor deadline is 3 business days away or less.
 * Business days: Mon to Fri, ET, no holiday calendar.
 */
import { venue } from '../venue.config';
import { etWallToUtc } from './hold';
import { etYmdh, type YMD } from './night';

const DOW = (d: YMD) => new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay(); // 0 Sun .. 6 Sat
const addDays = (d: YMD, n: number): YMD => { const t = new Date(Date.UTC(d.y, d.m - 1, d.d + n)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };

/** ET pickup date + N calendar days (default venue.payoutReturnWindowDays). */
export function returnWindowEnds(pickupMs: number, days: number = venue.payoutReturnWindowDays): YMD {
  const { y, m, d } = etYmdh(pickupMs);
  return addDays({ y, m, d }, days);
}

/** ET date of t + N business days (Mon to Fri; weekends skipped; no holiday calendar). */
export function addBusinessDays(t: number, businessDays: number): YMD {
  const { y, m, d } = etYmdh(t);
  let cur: YMD = { y, m, d };
  let left = businessDays;
  while (left > 0) { cur = addDays(cur, 1); const w = DOW(cur); if (w !== 0 && w !== 6) left--; }
  return cur;
}

const isBiz = (d: YMD) => { const w = DOW(d); return w !== 0 && w !== 6; };
const ymdN = (d: YMD) => d.y * 10000 + d.m * 100 + d.d;
/** Business days strictly after `from` up to and including `to` (0 if `to` is not after `from`). */
export function businessDaysBetween(from: YMD, to: YMD): number {
  let n = 0, cur = from;
  while (ymdN(cur) < ymdN(to)) { cur = addDays(cur, 1); if (isBiz(cur)) n++; }
  return n;
}
/** The day itself if it is a business day, else the next business day. */
export function sameOrNextBusinessDay(d: YMD): YMD { let cur = d; while (!isBiz(cur)) cur = addDays(cur, 1); return cur; }

/** Owner-facing wording for forwarding and evidence timing (use exactly this in any owner preview copy). */
export const FORWARDING_COPY = 'Forward each dispute notice as soon as you reasonably can.';
export const EVIDENCE_COPY = 'RideNite sends the evidence pack within 1 business day, or the same business day if your processor deadline is 3 business days away or less.';

/**
 * Date RideNite owes the Evidence Pack (ET), counted from when the bar forwarded the notice (or when RideNite
 * saw it through processor access): same business day if the processor deadline is 3 business days away or
 * less, otherwise 1 business day later.
 */
export function evidenceDueBy(noticeMs: number, processorDeadlineMs: number): YMD {
  const { y, m, d } = etYmdh(noticeMs);
  const start = sameOrNextBusinessDay({ y, m, d });
  const dl = etYmdh(processorDeadlineMs);
  const left = businessDaysBetween(start, { y: dl.y, m: dl.m, d: dl.d });
  return left <= 3 ? start : addBusinessDays(etWallToUtc(start.y, start.m, start.d, 12), 1);
}

export const ymdIso = (d: YMD): string => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
const SHORT = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
/** "Jan 8" */
export const fmtWindowDate = (d: YMD): string => SHORT.format(new Date(Date.UTC(d.y, d.m - 1, d.d, 12)));
/** First instant after the window: midnight ET at the start of the next day. */
export const returnWindowClosesAt = (d: YMD): number => { const n = addDays(d, 1); return etWallToUtc(n.y, n.m, n.d, 0); };

/** Owner statement status chip (muted text, never amber): "Credit window open until Jan 8" while open, then "Payout final". */
export function returnWindowStatus(ends: YMD, now: number): string {
  return now < returnWindowClosesAt(ends) ? `Credit window open until ${fmtWindowDate(ends)}` : 'Payout final';
}

/**
 * Payout Return eligibility, keyed on the processor's dispute notice date (not today):
 *  1. notice dated on or before pickup date + payoutReturnWindowDays (90) calendar days, and
 *  2. evidence filed before the processor deadline. The bar's filing condition also counts as met if RideNite
 *     sent the Evidence Pack after it was due, or if the bar forwarded within 2 business days and the deadline
 *     still left no time to file, and
 *  3. the guest won the dispute as to the ride line.
 * Or: the bar refunded the ride line under the refund rule (no window).
 */
export interface PayoutReturnCase {
  pickupMs: number;
  outcome: 'dispute_lost' | 'dispute_won' | 'refunded_under_rule';
  noticeMs?: number;
  forwardedMs?: number | null;
  evidenceSentMs?: number | null;
  evidenceFiledMs?: number | null;
  processorDeadlineMs?: number;
}
export function payoutReturnEligible(c: PayoutReturnCase): boolean {
  if (c.outcome === 'refunded_under_rule') return true;
  if (c.outcome !== 'dispute_lost' || c.noticeMs == null || c.processorDeadlineMs == null) return false;
  const inWindow = ymdN(etYmdh(c.noticeMs)) <= ymdN(returnWindowEnds(c.pickupMs));
  if (!inWindow) return false;
  if (c.evidenceFiledMs != null && c.evidenceFiledMs < c.processorDeadlineMs) return true;
  const fwd = c.forwardedMs ?? null;
  if (fwd != null) {
    const due = evidenceDueBy(fwd, c.processorDeadlineMs);
    const sentLate = c.evidenceSentMs == null || ymdN(etYmdh(c.evidenceSentMs)) > ymdN(due);
    if (sentLate) return true; // RideNite was late
    const n = etYmdh(c.noticeMs), f = etYmdh(fwd), dl = etYmdh(c.processorDeadlineMs);
    const fwdQuick = businessDaysBetween({ y: n.y, m: n.m, d: n.d }, { y: f.y, m: f.m, d: f.d }) <= 2;
    const noTimeLeft = businessDaysBetween({ y: f.y, m: f.m, d: f.d }, { y: dl.y, m: dl.m, d: dl.d }) === 0;
    if (fwdQuick && noTimeLeft) return true;
  }
  return false;
}

export class PayoutReturnError extends Error {}
/**
 * Statement credit for one ride, as negative cents, computed from the fee recorded on that ride at booking.
 * Hard check: the return can never exceed that ride's recorded fee (default: exactly the fee). The monthly
 * subscription is never an input, so no part of it can be returned.
 */
export function payoutReturnCents(feeChargedCents: number, returnCents: number = feeChargedCents): number {
  if (!Number.isInteger(feeChargedCents) || feeChargedCents < 0) throw new PayoutReturnError(`invalid recorded fee ${feeChargedCents}`);
  if (!Number.isInteger(returnCents) || returnCents < 0) throw new PayoutReturnError(`invalid return ${returnCents}`);
  if (returnCents > feeChargedCents) throw new PayoutReturnError(`return ${returnCents} exceeds the fee recorded for this ride (${feeChargedCents})`);
  return returnCents === 0 ? 0 : -returnCents;
}

const MD = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric' });
/** "RideNite fee credited, ride RN-7Q4K2M, Oct 9, dispute lost: -$1.00" (ride ID as on guest receipts) */
export function payoutReturnLine(rideNo: string, pickupMs: number, outcome: 'dispute_lost' | 'refunded_under_rule', feeChargedCents: number): string {
  const why = outcome === 'dispute_lost' ? 'dispute lost' : 'refunded under the refund rule';
  const c = -payoutReturnCents(feeChargedCents);
  return `RideNite fee credited, ride ${rideNo}, ${MD.format(new Date(pickupMs))}, ${why}: -$${(c / 100).toFixed(2)}`;
}
/** Once per statement. */
export const statementFootnote = (): string =>
  `When a guest wins a dispute on a RideNite ride line (notice dated within ${venue.payoutReturnWindowDays} days of the ride) and you filed our evidence on time, or you refund the ride under our refund rule, we credit our fee for that ride. Your dispute fee and the ride fare stay with you.`;

/**
 * Quote adjustment credit (legal memo over-cap-credit.md, Oct 11). When a ride's final fare is above the guest's
 * approved cap (quote + capped adjustment) and the guest declines the difference on their own phone, RideNite credits
 * the bar that difference against RideNite's own fees. Credit only, never cash, never interest. It is an adjustment for
 * the accuracy of RideNite's quote. Eligible only for rides booked at RideNite's quote and cap, declined by the guest on
 * their own phone, where the overage was not caused by a guest-requested change (added stop, requested wait) and is not a
 * cleaning, damage or no-show fee. Caps: $10 per ride and $280 per venue per month; anything over goes to manual review.
 */
export const QUOTE_CREDIT_PER_RIDE_CENTS = 1000;
export const QUOTE_CREDIT_PER_MONTH_CENTS = 28000;
export interface QuoteCreditCase {
  rideId: string; pickupMs: number; quoteCents: number; capCents: number; finalCents: number;
  bookedAtRideNiteQuote: boolean; declinedOnGuestPhone: boolean; guestCausedOverage: boolean;
}
export interface QuoteCreditResult {
  rideId: string; pickupMs: number; overCents: number; creditedCents: number; manualReviewCents: number;
  state: 'credited' | 'manual_review' | 'not_eligible';
}
/** Applies the per-ride and per-month caps in pickup order. creditedCents is positive (shown as a negative line). */
export function quoteAdjustmentCredits(cases: readonly QuoteCreditCase[], alreadyCreditedThisMonthCents = 0): QuoteCreditResult[] {
  let used = alreadyCreditedThisMonthCents;
  return [...cases].sort((a, b) => a.pickupMs - b.pickupMs).map((c) => {
    const overCents = Math.max(0, c.finalCents - (c.quoteCents + c.capCents));
    const eligible = overCents > 0 && c.bookedAtRideNiteQuote && c.declinedOnGuestPhone && !c.guestCausedOverage;
    if (!eligible) return { rideId: c.rideId, pickupMs: c.pickupMs, overCents, creditedCents: 0, manualReviewCents: 0, state: 'not_eligible' as const };
    const perRide = Math.min(overCents, QUOTE_CREDIT_PER_RIDE_CENTS);
    const creditedCents = Math.max(0, Math.min(perRide, QUOTE_CREDIT_PER_MONTH_CENTS - used));
    used += creditedCents;
    const manualReviewCents = overCents - creditedCents;
    return { rideId: c.rideId, pickupMs: c.pickupMs, overCents, creditedCents, manualReviewCents, state: manualReviewCents > 0 ? 'manual_review' as const : 'credited' as const };
  });
}
/** "Quote adjustment credit, ride RN-7Q4K2M, Oct 9: -$3.10" */
export function quoteCreditLine(rideId: string, pickupMs: number, creditedCents: number): string {
  return `Quote adjustment credit, ride ${rideId}, ${MD.format(new Date(pickupMs))}: -$${(creditedCents / 100).toFixed(2)}`;
}
/** Once per statement, when a quote adjustment credit appears. */
export const QUOTE_CREDIT_FOOTNOTE =
  "When a ride's final fare is above the guest's approved cap and the guest declines the difference, we credit the difference against our fees, up to $10 per ride. Credits apply to future invoices and aren't paid in cash.";
