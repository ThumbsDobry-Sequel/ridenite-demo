/**
 * Owner payout data (SCOPE 23:05, revised 23:06). Data model only: nothing here is shown to guests.
 * - returnWindowEnds = ET calendar date of the ride's pickup + venue.payoutReturnWindowDays (90) calendar days.
 *   Open through the end of that day ET; after that the statement status is "Payout final".
 * - disputeNoticeDue = ET date the bar receives a dispute notice + venue.disputeNoticeBusinessDays (3) business
 *   days (Mon to Fri, weekends skipped, no holiday calendar). No UI yet.
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

/** Date the bar's response to a dispute notice is due: notice date + venue.disputeNoticeBusinessDays. */
export const disputeNoticeDue = (noticeMs: number, businessDays: number = venue.disputeNoticeBusinessDays): YMD => addBusinessDays(noticeMs, businessDays);

export const ymdIso = (d: YMD): string => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
const SHORT = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
/** "Jan 8" */
export const fmtWindowDate = (d: YMD): string => SHORT.format(new Date(Date.UTC(d.y, d.m - 1, d.d, 12)));
/** First instant after the window: midnight ET at the start of the next day. */
export const returnWindowClosesAt = (d: YMD): number => { const n = addDays(d, 1); return etWallToUtc(n.y, n.m, n.d, 0); };

/** Owner statement status chip (muted text, never amber): "Return window open until Jan 8" while open, then "Payout final". */
export function returnWindowStatus(ends: YMD, now: number): string {
  return now < returnWindowClosesAt(ends) ? `Return window open until ${fmtWindowDate(ends)}` : 'Payout final';
}

/** ET calendar date as a comparable number, e.g. 20270108. */
const ymdNum = (d: YMD) => d.y * 10000 + d.m * 100 + d.d;

/**
 * Payout return eligibility (SCOPE 23:07), keyed on the processor's dispute notice date, not today:
 * eligible iff the notice date (ET) is on or before pickup date + payoutReturnWindowDays (90) calendar days,
 * AND the evidence was filed before the processor's deadline. Data only, no UI.
 */
export function payoutReturnEligible(x: { pickupMs: number; noticeMs: number; evidenceFiledMs: number | null; processorDeadlineMs: number }): boolean {
  const inWindow = ymdNum(etYmdh(x.noticeMs)) <= ymdNum(returnWindowEnds(x.pickupMs));
  const filedInTime = x.evidenceFiledMs != null && x.evidenceFiledMs < x.processorDeadlineMs;
  return inWindow && filedInTime;
}
