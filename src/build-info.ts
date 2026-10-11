declare const __APP_VERSION__: string;
declare const __BUILD_TIME_ET__: string;
/** Injected at build time (vite define). Same version string names the SW cache. */
export const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const BUILD_TIME_ET: string = typeof __BUILD_TIME_ET__ !== 'undefined' ? __BUILD_TIME_ET__ : 'dev build';
