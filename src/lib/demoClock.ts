/**
 * Demo phone clock. "Demo: next status" jumps the clock to the next ride stage instead of rewriting ride times, so
 * every time on screen (headers, timeline, receipts) stays consistent: the P9 header is never earlier than drop-off.
 * The skew lives in memory only (every load is a fresh demo).
 */
const real = Date.now.bind(Date);
let skew = 0;
/** Clock without the demo skew (the store adds its own skew). */
export const realNow = (): number => real();
export const demoSkew = (): number => skew;
export function setDemoSkew(ms: number): void { skew = ms; }
/** App entry only: Date.now() reads the demo phone clock everywhere in the UI. */
export function installDemoClock(): void { Date.now = () => real() + skew; }
