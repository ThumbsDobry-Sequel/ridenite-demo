import { guestActivity } from './confirmRecord';
import { venue } from '../venue.config';
import { morningTotals, type MorningTotals } from './fare';
import { isAcceptedStage, rideStage } from './rideState';
import type { DemoState } from '../store/types';

/**
 * P9/M1 inputs: the ride on this phone if any, otherwise the seeded sample night.
 * Charge timing (SCOPE "Ride status and charge timing"): the fare line posts only once a driver
 * accepts. Inside the undo window, while still finding a driver, after an undo, or when no driver
 * was found, nothing is on the tab for a ride. Once this phone has slid, the sample ride is not shown.
 */
export function morningFor(state: DemoState, now: number = Date.now()): MorningTotals & { quoteCents: number; finalCents: number; hasRide: boolean; noDriver: boolean } {
  const committed = state.ride && !state.ride.pending ? state.ride : null;
  const stage = committed ? rideStage(committed, now) : null;
  const accepted = isAcceptedStage(stage);
  const noRide = committed ? !accepted : guestActivity(state);
  const quoteCents = committed?.quoteCents ?? venue.quoteCents;
  const scenario = committed?.scenario ?? state.fareScenario;
  const finalCents = venue.finalFareCents[scenario];
  const t = morningTotals({
    items: venue.menu, taxRate: venue.taxRate, tipPct: state.tipPct,
    quoteCents: noRide ? null : quoteCents, finalCents: noRide ? null : finalCents, overCapAnswer: state.overCapAnswer,
  });
  return { ...t, quoteCents, finalCents, hasRide: !noRide, noDriver: stage === 'no_cars' };
}
