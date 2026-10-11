import { NO_CALENDAR_DATES } from './build-info';

/**
 * Pitch demo export only (/pitch/demo/, RIDENITE_HIDE_BUILD_STAMP=1): the demo clock starts at the story time,
 * Sat 11:46 PM ET, the drop-off (sample tab opened 7:26 PM, ride confirmed 11:26 PM, picked up 11:32 PM, dropped off 11:46 PM), whenever and wherever
 * it is opened, measured from page load (never wall clock, first visit or storage), and ticks forward from there. Hooks: window.__pinnedStart, window.__pinnedStory. The main app keeps the real clock. Imported first in main.tsx.
 */
export const PINNED_START_MS = Date.UTC(2026, 9, 11, 3, 46, 0);
/** Story times, pinned directly (not derived from the start): tab 7:26 PM, booked 11:26 PM, pickup 11:32 PM, drop-off 11:46 PM ET. */
export const PINNED_STORY = {
  tabOpened: Date.UTC(2026, 9, 10, 23, 26, 0),
  booked: Date.UTC(2026, 9, 11, 3, 26, 0),
  pickedUp: Date.UTC(2026, 9, 11, 3, 32, 0),
  complete: Date.UTC(2026, 9, 11, 3, 46, 0),
} as const;
if (NO_CALENDAR_DATES && typeof window !== 'undefined') {
  const Real = Date;
  // 'now' = Sat 11:46:00 PM ET at this page load, then ticks in real time (ride status screens keep working)
  const off = PINNED_START_MS - Real.now();
  (window as unknown as { __pinnedStart: number; __pinnedStory: typeof PINNED_STORY }).__pinnedStart = PINNED_START_MS;
  (window as unknown as { __pinnedStory: typeof PINNED_STORY }).__pinnedStory = PINNED_STORY;
  class PinnedDate extends Real {
    constructor(...a: unknown[]) {
      if (a.length === 0) super(Real.now() + off);
      else super(...(a as [number]));
    }
    static now() { return Real.now() + off; }
  }
  (globalThis as unknown as { Date: DateConstructor }).Date = PinnedDate as unknown as DateConstructor;
}
