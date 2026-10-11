/**
 * Ride state is derived from the booking timestamp (UI 4e, POS 5a), so any phone
 * holding the same bookedAt shows the same status. Demo timeline is compressed.
 */
export type LiveStage = 'requested' | 'en_route' | 'near' | 'arrived' | 'picked_up' | 'complete';
export type TerminalStage = 'canceled_by_driver' | 'no_cars' | 'canceled_by_guest';
export type Stage = 'pending' | LiveStage | TerminalStage;

/** Undo window after Confirm, before the ride counts as booked. */
export const UNDO_MS = 10_000;

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
  pending: 'Booking in a moment',
  requested: 'Your car is requested',
  en_route: 'Driver on the way',
  near: '2 min away',
  arrived: 'Your car is here',
  picked_up: 'Picked up',
  complete: 'Ride complete',
  canceled_by_driver: 'Driver cancelled',
  no_cars: 'No cars nearby',
  canceled_by_guest: 'Cancelled',
};
