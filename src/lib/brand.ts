import { T } from '../venue.config';
import { nightLabel } from './night';
import { chargeAt } from './hold';
import { tabCloseState } from './tab';
import { rideStage } from './rideState';
import type { DemoState } from '../store/types';

/**
 * Is the guest's check closed? (Harper 23:11: "Tab closed." only once the POS closes the check.)
 * Closed when the guest approved and paid, when the bartender's close of the linked tab has completed,
 * or when the hold has run to its charge time.
 */
export function guestCheckClosed(s: DemoState, now: number = Date.now()): boolean {
  if (s.paid) return true;
  const t = s.linkedTab ? s.bar.tabs.find((x) => x.tab === s.linkedTab!.tab) : undefined;
  if (t && t.close !== 'open' && t.close !== 'held') {
    const r = s.ride && !s.ride.pending && s.ride.tab === t.tab ? s.ride : null;
    if (tabCloseState(t, r ? rideStage(r, now) : null, now) === 'closed') return true;
  }
  return now >= chargeAt(s.tabOpenedAt, s.seededAt);
}

/**
 * Receipt line, shown right before the ride line and only when the guest was picked up.
 * Before the check closes: "[Night date]. Ride home is on your tab."
 * After it closes: "[Night date]. Tab closed. Ride home included: $27.40." (the amount always follows; the
 * word is never used bare). The bare marketing tagline is never used in the app.
 */
export function nightTagline(pickedUp: boolean, checkClosed: boolean, rideCents: number, now: number = Date.now()): string | null {
  if (!pickedUp) return null;
  const amt = `$${(rideCents / 100).toFixed(2)}`;
  return checkClosed ? `${nightLabel(now)}. ${T.Bill} closed. Ride home included: ${amt}.` : `${nightLabel(now)}. Ride home is on your ${T.bill}.`;
}
