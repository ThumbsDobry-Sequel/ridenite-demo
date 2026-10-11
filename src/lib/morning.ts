import { venue } from '../venue.config';
import { morningTotals, type MorningTotals } from './fare';
import type { DemoState } from '../store/types';

/**
 * P9/M1 inputs: the booked ride on this phone if any, otherwise the seeded sample night.
 * A ride still inside its undo window, or undone, puts nothing on the tab (Confirm record rules):
 * once this phone has confirmed a ride, the sample ride is no longer shown either.
 */
export function morningFor(state: DemoState): MorningTotals & { quoteCents: number; finalCents: number; hasRide: boolean } {
  const committed = state.ride && !state.ride.pending ? state.ride : null;
  const noRide = !committed && state.confirmations.length > 0;
  const quoteCents = committed?.quoteCents ?? venue.quoteCents;
  const scenario = committed?.scenario ?? state.fareScenario;
  const finalCents = venue.finalFareCents[scenario];
  const t = morningTotals({
    items: venue.menu, taxRate: venue.taxRate, tipPct: state.tipPct,
    quoteCents: noRide ? null : quoteCents, finalCents: noRide ? null : finalCents, overCapAnswer: state.overCapAnswer,
  });
  return { ...t, quoteCents, finalCents, hasRide: !noRide };
}
