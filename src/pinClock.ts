import { NO_CALENDAR_DATES } from './build-info';

/**
 * Pitch demo export only (/pitch/demo/, RIDENITE_HIDE_BUILD_STAMP=1): the demo clock starts at the story time,
 * Sat 11:52 PM ET (sample ride confirmed 11:26 PM, picked up 11:32 PM, dropped off 11:46 PM), whenever and wherever
 * it is opened, and runs forward from there. The main app keeps the real clock. Imported first in main.tsx.
 */
export const PINNED_START_MS = Date.UTC(2026, 9, 11, 3, 52, 0);
if (NO_CALENDAR_DATES && typeof window !== 'undefined') {
  const Real = Date;
  const off = PINNED_START_MS - Real.now();
  class PinnedDate extends Real {
    constructor(...a: unknown[]) {
      if (a.length === 0) super(Real.now() + off);
      else super(...(a as [number]));
    }
    static now() { return Real.now() + off; }
  }
  (globalThis as unknown as { Date: DateConstructor }).Date = PinnedDate as unknown as DateConstructor;
}
