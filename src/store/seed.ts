import { venue } from '../venue.config';
import type { DemoState } from './types';

export const STORE_VERSION = 1;
/** Storage keys/prefixes the app owns. Cleared on every load (memory-only demo). */
export const OWNED_KEY_PREFIX = 'ridenite';

export function seedState(now: number): DemoState {
  return {
    version: STORE_VERSION,
    seededAt: now,
    handoff: null,
    dest: null,
    riders: 1,
    quoteCents: venue.quoteCents,
    prevQuoteCents: null,
    ride: null,
    bookings: [],
    consents: [],
    confirmations: [],
    staffPings: [],
    // Saved home on this phone (fictional), so the three-tap path works out of the box.
    savedHome: venue.guest.home,
    fareScenario: 'higher',
    overCapAnswer: null,
    tipPct: venue.defaultTipPct,
    paid: false,
    tabClosed: false,
    fault: null,
    forceOffline: false,
    dispute: null,
    dismissedNudges: [],
    // Demo starts linked to an open tab at the venue (fictional). Unlink in the demo panel.
    linkedTab: { tab: venue.tabNumber, seat: venue.seat, guest: venue.guest.name, via: 'seed', at: now },
    priceMovesOnRefresh: false,
  };
}
