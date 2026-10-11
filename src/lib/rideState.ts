/**
 * Ride state is derived from the booking timestamp (UI 4e, POS 5a), so any phone
 * holding the same bookedAt shows the same status. Demo timeline is compressed.
 */
export type LiveStage = 'requested' | 'en_route' | 'near' | 'arrived' | 'picked_up' | 'complete';
export type TerminalStage = 'canceled_by_driver' | 'no_cars' | 'canceled_by_guest';
export type Stage = 'pending' | LiveStage | TerminalStage;

/** Undo window after Confirm, before the ride counts as booked. */
export const UNDO_MS = 10_000;

/** Demo: with "no driver found" forced, the search gives up this long after the request. */
export const NO_DRIVER_MS = 20_000;
/** A quote stays valid this long (demo constant, SCOPE: Ride status and charge timing). */
export const QUOTE_VALID_MS = 5 * 60_000;

/** Stage start offsets in ms after booking (demo speed). */
export const DEMO_TIMELINE: Record<LiveStage, number> = {
  requested: 0,
  en_route: 8_000,
  near: 30_000,
  arrived: 45_000,
  picked_up: 60_000,
  complete: 90_000,
};
const ORDER: LiveStage[] = ['requested', 'en_route', 'near', 'arrived', 'picked_up', 'complete'];

export function stageAt(bookedAt: number, now: number): LiveStage {
  const t = now - bookedAt;
  let s: LiveStage = 'requested';
  for (const k of ORDER) if (t >= DEMO_TIMELINE[k]) s = k;
  return s;
}

export function nextStage(s: LiveStage): LiveStage {
  const i = ORDER.indexOf(s);
  return ORDER[Math.min(i + 1, ORDER.length - 1)];
}

/** bookedAt value that puts the ride at the start of `stage` at time `now`. */
export function bookedAtFor(stage: LiveStage, now: number): number {
  return now - DEMO_TIMELINE[stage];
}

export const STAGE_ROUTE: Record<Stage, string> = {
  pending: '/g/p4',
  requested: '/g/p4',
  en_route: '/g/p5',
  near: '/g/p5w',
  arrived: '/g/e3',
  picked_up: '/g/p6',
  complete: '/g/p7',
  canceled_by_driver: '/g/e6',
  no_cars: '/g/e1',
  canceled_by_guest: '/g/p1',
};

/** Patron status words (UI 4e). */
export const STAGE_LABEL: Record<Stage, string> = {
  pending: 'Requesting your ride',
  requested: 'Ride requested',
  en_route: 'Driver on the way',
  near: '2 min away',
  arrived: 'Your car is here',
  picked_up: 'Picked up',
  complete: 'Dropped off',
  canceled_by_driver: 'Driver cancelled',
  no_cars: 'No driver found yet',
  canceled_by_guest: 'Cancelled',
};

/** Minimal ride shape for stage math (keeps this module free of store types). */
export interface StageInput { bookedAt: number; pending?: boolean; hold?: LiveStage; terminal?: TerminalStage; noDriver?: boolean }

/** Stage of a ride at `now`. No driver can accept during the undo window (stage stays pending). */
export function rideStage(r: StageInput, now: number): Stage {
  if (r.terminal) return r.terminal;
  if (r.pending && now < r.bookedAt) return 'pending';
  if (r.hold) return r.hold;
  if (r.noDriver) return now - r.bookedAt >= NO_DRIVER_MS ? 'no_cars' : 'requested';
  return stageAt(r.bookedAt, now);
}

/** A driver has accepted: the fare line and the record line post to the tab from here on. */
export const ACCEPTED: Stage[] = ['en_route', 'near', 'arrived', 'picked_up', 'complete'];
export const isAcceptedStage = (st: Stage | null | undefined): boolean => !!st && ACCEPTED.includes(st);

/**
 * Charge timing (SCOPE "Chargeback research changes", 22:22): the fare line and the guest record post
 * to the tab at PICKUP, not at driver accept. A driver who accepts and then cancels never posts anything.
 */
export const CHARGED: Stage[] = ['picked_up', 'complete'];
export const isChargedStage = (st: Stage | null | undefined): boolean => !!st && CHARGED.includes(st);
/** Simulated pickup time for a ride on the demo timeline. */
export const pickupAt = (r: { bookedAt: number }): number => r.bookedAt + DEMO_TIMELINE.picked_up;
