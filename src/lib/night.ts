import { PINNED_STORY } from '../pinClock';
import { NO_CALENDAR_DATES } from '../build-info';
import { venue } from '../venue.config';
import { displayDateFmt } from './dateFmt';

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

const LONG = displayDateFmt({ timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' });
/** "Saturday, Oct 10" */
export const fmtNightLong = (n: YMD): string => LONG.format(new Date(Date.UTC(n.y, n.m - 1, n.d, 12)));
export const nightLabel = (now: number): string => fmtNightLong(nightDate(now));
const WEEKDAY = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' });
/** "Saturday night" (Quinn, Oct 11): the receipt tagline names the night, not a calendar date. */
export const nightName = (now: number): string => { const n = nightDate(now); return `${WEEKDAY.format(new Date(Date.UTC(n.y, n.m - 1, n.d, 12)))} night`; };

/** Seeding is relative to now (SCOPE 22:28): the tab opened 4 h ago, rounded to the minute. */
export const TAB_OPEN_AGO_MS = 4 * 60 * 60 * 1000;
export const seededTabOpen = (now: number): number => Math.round((now - TAB_OPEN_AGO_MS) / 60_000) * 60_000;

/** Sample order times, spread between tab open and now (open < t < now). */
export function drinkTimes(openedAt: number, now: number, n: number): number[] {
  const step = (now - openedAt) / (n + 1);
  return Array.from({ length: n }, (_, i) => Math.round((openedAt + step * (i + 1)) / 60_000) * 60_000);
}

/** Sample night times when this phone has no ride: all between tab open and now. */
export function sampleNightTimes(openedAt: number, now: number) {
  if (NO_CALENDAR_DATES) return { ...PINNED_STORY }; // pitch export: fixed story times
  const m = (x: number) => Math.round(x / 60_000) * 60_000;
  // same story shape as a live ride: booked 6 min before pickup, drop-off 14 min after it
  const dropAgo = 6 * 60_000, trip = venue.tripMinutes * 60_000, eta = venue.etaMinutes * 60_000;
  return { tabOpened: openedAt, booked: m(now - dropAgo - trip - eta), pickedUp: m(now - dropAgo - trip), complete: m(now - dropAgo) };
}

const SHORT = displayDateFmt({ timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
/** "Sat Oct 10" (no comma, matches the receipt heading style) */
export const nightShort = (now: number): string => SHORT.format(new Date(Date.UTC(nightDate(now).y, nightDate(now).m - 1, nightDate(now).d, 12))).replace(',', '');
/** Morning heading, true at any hour: "Night of Sat, Oct 10". Pass the tab-open time: the night date
 *  (venue cutoff hour) of when the night started, so a Sunday-morning review still names Saturday. */
export const nightOfHeading = (t: number): string => {
  const n = nightDate(t);
  return `Night of ${SHORT.format(new Date(Date.UTC(n.y, n.m - 1, n.d, 12)))}`;
};
/** "Sat" */
export const nightWeekday = (now: number): string => nightShort(now).split(' ')[0];

/**
 * How copy names a night relative to the viewing time (simulated clock): "tonight" while it is still that
 * night (before the cutoff hour), "last night" on the next day, otherwise null (use the date).
 * Pass the tab-open time as `nightAt`. Guest home never says "Last night's receipt" on the same night.
 */
export function nightRelative(nightAt: number, now: number): 'tonight' | 'last night' | null {
  const a = nightDate(nightAt);
  const b = nightDate(now);
  const diff = Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
  return diff === 0 ? 'tonight' : diff === 1 ? 'last night' : null;
}
/** "Tonight's receipt" / "Last night's receipt" / "Receipt, Sat Oct 10" */
export function receiptTitle(nightAt: number, now: number): string {
  const r = nightRelative(nightAt, now);
  return r === 'tonight' ? "Tonight's receipt" : r === 'last night' ? "Last night's receipt" : `Receipt, ${nightShort(nightAt)}`;
}
/** "tonight's" / "last night's" / "the Sat Oct 10" possessive phrase for a bill noun. */
export function nightPossessive(nightAt: number, now: number): string {
  const r = nightRelative(nightAt, now);
  return r === 'tonight' ? "tonight's" : r === 'last night' ? "last night's" : `the ${nightShort(nightAt)}`;
}
