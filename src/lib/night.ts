import { venue } from '../venue.config';

/**
 * Night date (SCOPE date rules, 22:27): from the device clock in America/New_York. It is today's date,
 * except 00:00 to 05:59 counts as the previous evening. Never "today" or "tomorrow" in copy.
 */
const TZ = 'America/New_York';
export interface YMD { y: number; m: number; d: number }

export function etYmdh(ms: number): YMD & { h: number } {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(ms));
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return { y: g('year'), m: g('month'), d: g('day'), h: g('hour') };
}

export function nightDate(now: number): YMD {
  const p = etYmdh(now);
  if (p.h >= venue.nightCutoffHour) return { y: p.y, m: p.m, d: p.d };
  const prev = new Date(Date.UTC(p.y, p.m - 1, p.d - 1));
  return { y: prev.getUTCFullYear(), m: prev.getUTCMonth() + 1, d: prev.getUTCDate() };
}

const LONG = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' });
/** "Saturday, Oct 10" */
export const fmtNightLong = (n: YMD): string => LONG.format(new Date(Date.UTC(n.y, n.m - 1, n.d, 12)));
export const nightLabel = (now: number): string => fmtNightLong(nightDate(now));

/** Seeding is relative to now (SCOPE 22:28): the tab opened 4 h ago, rounded to the minute. */
export const TAB_OPEN_AGO_MS = 4 * 60 * 60 * 1000;
export const seededTabOpen = (now: number): number => Math.round((now - TAB_OPEN_AGO_MS) / 60_000) * 60_000;

/** Sample drink times, spread between tab open and now (open < t < now). */
export function drinkTimes(openedAt: number, now: number, n: number): number[] {
  const step = (now - openedAt) / (n + 1);
  return Array.from({ length: n }, (_, i) => Math.round((openedAt + step * (i + 1)) / 60_000) * 60_000);
}

/** Sample night times when this phone has no ride: all between tab open and now. */
export function sampleNightTimes(openedAt: number, now: number) {
  const m = (x: number) => Math.round(x / 60_000) * 60_000;
  return { tabOpened: openedAt, booked: m(now - 34 * 60_000), pickedUp: m(now - 26 * 60_000), complete: m(now - 8 * 60_000) };
}

const SHORT = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
/** "Sat Oct 10" (no comma, matches the receipt heading style) */
export const nightShort = (now: number): string => SHORT.format(new Date(Date.UTC(nightDate(now).y, nightDate(now).m - 1, nightDate(now).d, 12))).replace(',', '');
/** "Sat" */
export const nightWeekday = (now: number): string => nightShort(now).split(' ')[0];
