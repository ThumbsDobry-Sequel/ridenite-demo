import { NO_CALENDAR_DATES } from '../build-info';

/**
 * Display-only date formatter. In the /pitch/demo/ Sample Venue export
 * (RIDENITE_HIDE_BUILD_STAMP=1) no calendar date may render anywhere, so month,
 * day and year are dropped and only the weekday is shown ("Fri, Oct 9" -> "Fri").
 * The main app is unchanged. Never use this for date math.
 */
export function displayDateFmt(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  if (!NO_CALENDAR_DATES) return new Intl.DateTimeFormat('en-US', opts);
  const { month: _m, day: _d, year: _y, ...rest } = opts;
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', ...rest });
}
