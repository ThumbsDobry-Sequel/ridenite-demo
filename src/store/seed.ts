import { venue } from '../venue.config';
import type { BarRide, BarState, DemoState } from './types';
import { capFor } from '../lib/fare';
import { bookedAtFor } from '../lib/rideState';

/** Bartender seed (UI 7 B1 sample, Maison Cheryl numbers). Stages are set relative to load time. */
export function seedBar(now: number): BarState {
  const b = venue.bar;
  const tabs = b.tabs.map((t) => ({ ...t, items: t.items.map(([n, q]) => [n, q] as [string, number]), close: 'open' as const,
    ...(t.tab === venue.tabNumber ? { linkSentAt: now - 4 * 60_000 } : {}) }));
  const rides: BarRide[] = b.seededRides.map((r) => {
    const t = b.tabs.find((x) => x.tab === r.tab)!;
    const stage = r.stage === 'declined' ? 'en_route' : r.stage;
    const bookedAt = bookedAtFor(stage, now);
    return {
      id: `r-${r.tab}-seed`, tab: r.tab, seat: t.seat, guest: t.guest, entryPoint: r.tab === '4474' ? 'staff_offer' : 'guest_request',
      dest: venue.addresses[r.tab === '4472' ? 4 : r.tab === '4474' ? 5 : 6], riders: 1, quoteCents: venue.quoteCents,
      capCents: capFor(venue.quoteCents), bookedAt, consentText: '', scenario: r.scenario, confirmedAt: bookedAt, confirmedBy: 'staff',
      ...(r.stage === 'declined' ? { terminal: 'canceled_by_driver' as const } : {}),
      carInfo: { car: r.car, plate: r.plate, plateSpoken: r.plateSpoken, driver: r.driver, partner: r.partner },
    };
  });
  return {
    welcomed: false,
    tabs,
    rides,
    // Dev already picked a drop-off and saw the price on his phone (B3 sample "Clarendon (Dev entered)").
    replies: [{ tab: '4471', dest: venue.addresses[3], quoteCents: venue.quoteCents, at: now - 60_000 }],
    draft: null,
    quiet: { tab: b.quietTab, seat: b.tabs.find((t) => t.tab === b.quietTab)!.seat, at: now - 2 * 60_000, seen: false, sideDoor: false, oneRider: false, booked: false },
    settings: { priceMode: venue.priceMode, receipt: 'neutral', tabLineName: venue.tabLineName as 'Courtesy car', closeNoticeMin: 2 },
    earlierRides: b.earlierRidesTonight,
    // Seeded rides were booked by staff after the guest saw the price (sample records, kept apart from this phone's own).
    seedRecords: rides.map((r) => ({ rideId: r.id, at: r.bookedAt, quoteCents: r.quoteCents, capCents: r.capCents, entryPoint: r.entryPoint, by: 'staff' as const, method: 'staff_saw_price' as const, tab: r.tab })),
    nextTab: 4477,
  };
}

export const STORE_VERSION = 1;
/** Storage keys/prefixes the app owns. Cleared on every load (memory-only demo). */
export const OWNED_KEY_PREFIX = 'ridenite';

export function seedState(now: number): DemoState {
  const bar = seedBar(now);
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
    slides: [],
    forceNoDriver: false,
    forceStaleQuote: false,
    role: 'guest',
    bar,
  };
}
