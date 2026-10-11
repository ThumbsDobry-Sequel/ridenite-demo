import { venue } from '../venue.config';
import { morningTotals, type MorningTotals } from './fare';
import type { DemoState } from '../store/types';

/** P9/M1 inputs: the ride on this phone if any, otherwise the seeded sample night. */
export function morningFor(state: DemoState): MorningTotals & { quoteCents: number; finalCents: number } {
  const quoteCents = state.ride?.quoteCents ?? venue.quoteCents;
  const scenario = state.ride?.scenario ?? state.fareScenario;
  const finalCents = venue.finalFareCents[scenario];
  const t = morningTotals({
    items: venue.menu, taxRate: venue.taxRate, tipPct: state.tipPct,
    quoteCents, finalCents, overCapAnswer: state.overCapAnswer,
  });
  return { ...t, quoteCents, finalCents };
}
