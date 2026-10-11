import { T } from '../venue.config';
import { nightName } from './night';
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
 * Before the check closes: "Saturday night. Ride home is on your tab."
 * After it closes: "Saturday night. Tab closed. Ride home added: $27.40." (the amount always follows, from the
 * ride's final fare; never a free-sounding word or a courtesy label, which reads as a free ride next to a charge: Quinn, Oct 11). The bare marketing tagline is never used in the app.
 */
/** `night` is any time inside the night being described (pass the tab-open time): a Sunday-morning view still names Saturday. */
export function nightTagline(pickedUp: boolean, checkClosed: boolean, rideCents: number, night: number = Date.now()): string | null {
  if (!pickedUp) return null;
  const amt = `$${(rideCents / 100).toFixed(2)}`;
  return checkClosed ? `${nightName(night)}. ${T.Bill} closed. Ride home added: ${amt}.` : `${nightName(night)}. Ride home is on your ${T.bill}.`;
}
