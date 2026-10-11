import { T } from '../venue.config';
import { nightLabel } from './night';

/**
 * Receipt line (SCOPE 22:29): "[Night date]. Tab closed. Ride home on your tab.",
 * shown right before the ride line, and only when the guest was picked up. The bare marketing tagline
 * is never used in the app.
 */
export function nightTagline(pickedUp: boolean, now: number = Date.now()): string | null {
  return pickedUp ? `${nightLabel(now)}. ${T.Bill} closed. Ride home on your ${T.bill}.` : null;
}
