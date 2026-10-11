declare const __APP_VERSION__: string;
declare const __BUILD_TIME_ET__: string;
declare const __SHOW_BUILD_STAMP__: boolean;
declare const __NO_CALENDAR_DATES__: boolean;
/** Injected at build time (vite define). Same version string names the SW cache. */
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const BUILD_TIME_ET: string = typeof __BUILD_TIME_ET__ !== 'undefined' ? __BUILD_TIME_ET__ : 'dev build';
/** False in the /pitch/demo/ Sample Venue export (RIDENITE_HIDE_BUILD_STAMP=1): no build date there. */
export const SHOW_BUILD_STAMP: boolean = typeof __SHOW_BUILD_STAMP__ !== 'undefined' ? __SHOW_BUILD_STAMP__ : true;
/** True in the /pitch/demo/ export only: display dates show the weekday, never month/day/year. */
export const NO_CALENDAR_DATES: boolean = typeof __NO_CALENDAR_DATES__ !== 'undefined' ? __NO_CALENDAR_DATES__ : false;
