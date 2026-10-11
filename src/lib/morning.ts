import { guestActivity } from './confirmRecord';
import { venue } from '../venue.config';
import { morningTotals, type MorningTotals } from './fare';
import { DEMO_TIMELINE, isChargedStage, pickupAt, rideStage } from './rideState';
import { sampleNightTimes } from './night';
import type { DemoState } from '../store/types';

/**
 * P9/M1 inputs: the ride on this phone if any, otherwise the seeded sample night.
 * Charge timing (SCOPE "Chargeback research changes"): the fare line posts at pickup. Inside the undo
 * window, while finding a driver, while the car is on the way, after an undo, when no driver was found,
 * or when the driver cancelled, nothing is on the tab for a ride. Once this phone has slid, the sample ride is not shown.
 */
export function morningFor(state: DemoState, now: number = Date.now()): MorningTotals & { quoteCents: number; finalCents: number; hasRide: boolean; noDriver: boolean } {
  const committed = state.ride && !state.ride.pending ? state.ride : null;
  const stage = committed ? rideStage(committed, now) : null;
  const charged = isChargedStage(stage);
  const noRide = committed ? !charged : guestActivity(state);
  const quoteCents = committed?.quoteCents ?? venue.quoteCents;
  const scenario = committed?.scenario ?? state.fareScenario;
  const finalCents = venue.finalFareCents[scenario];
  const t = morningTotals({
    items: venue.menu, taxRate: venue.taxRate, tipPct: state.tipPct,
    quoteCents: noRide ? null : quoteCents, finalCents: noRide ? null : finalCents, overCapAnswer: state.overCapAnswer,
  });
  return { ...t, quoteCents, finalCents, hasRide: !noRide, noDriver: stage === 'no_cars' || stage === 'canceled_by_driver' };
}

/**
 * Night timeline times (SCOPE 22:28, seeding relative to now). With a ride on this phone: the real slide,
 * pickup and drop-off times. Without one: sample times between tab open and the seed time.
 */
export function nightTimes(state: DemoState): { tabOpened: number; booked: number; pickedUp: number; complete: number } {
  const r = state.ride && !state.ride.pending ? state.ride : null;
  if (r) {
    const slide = [...state.slides].reverse().find((x) => x.rideId === r.id);
    return { tabOpened: state.tabOpenedAt, booked: slide?.at ?? r.confirmedAt ?? r.bookedAt, pickedUp: pickupAt(r), complete: r.bookedAt + DEMO_TIMELINE.complete };
  }
  return sampleNightTimes(state.tabOpenedAt, state.seededAt);
}
