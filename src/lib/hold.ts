import { venue } from '../venue.config';
/**
 * Card hold deadline (SCOPE 22:22): the next 11:00 AM ET after the tab opened, which is always within
 * 24 hours of opening (Toast-style 24 h POS hold). Real date, never "today" or "tomorrow".
 */
export const HOLD_WINDOW_MS = venue.holdHours * 60 * 60 * 1000;
const TZ = 'America/New_York';

function etParts(ms: number) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(new Date(ms));
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return { y: g('year'), m: g('month'), d: g('day'), h: g('hour'), min: g('minute') };
}

/** UTC ms for a wall-clock time in America/New_York (handles EST/EDT). */
export function etWallToUtc(y: number, m: number, d: number, h: number, min = 0): number {
  let guess = Date.UTC(y, m - 1, d, h, min);
  for (let i = 0; i < 2; i++) {
    const p = etParts(guess);
    const diff = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - Date.UTC(y, m - 1, d, h, min);
    guess -= diff;
  }
  return guess;
}

/** Next 11:00 AM ET strictly after `openedAt`. */
export function holdDeadline(openedAt: number): number {
  const p = etParts(openedAt);
  let at = etWallToUtc(p.y, p.m, p.d, 11);
  if (at <= openedAt) {
    const next = new Date(Date.UTC(p.y, p.m - 1, p.d + 1));
    at = etWallToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 11);
  }
  return at;
}

const DAY = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' });
const TIME = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
/** "Sunday at 11:00 AM": the charge is always within 24 h of tab open, so the weekday names it without a calendar date (Quinn, Oct 11). */
export const fmtDeadline = (ms: number): string => `${DAY.format(new Date(ms))} at ${TIME.format(new Date(ms))}`;
const HOUR = 60 * 60 * 1000;
/**
 * Charge time (SCOPE 22:28): the next 11:00 AM ET after `now` if it is in the future AND less than 24 h
 * after the tab opened; otherwise the latest whole hour at least 1 h before open + 24 h.
 */
export function chargeAt(openedAt: number, now: number): number {
  const next11 = holdDeadline(now);
  if (next11 > now && next11 - openedAt < HOLD_WINDOW_MS) return next11;
  return Math.floor((openedAt + HOLD_WINDOW_MS - HOUR) / HOUR) * HOUR; // ET offsets are whole hours
}
/** "charged Sunday at 11:00 AM" */
export const holdText = (openedAt: number, now: number): string => `charged ${fmtDeadline(chargeAt(openedAt, now))}`;
