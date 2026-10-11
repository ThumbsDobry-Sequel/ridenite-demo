import { venue } from '../venue.config';

/**
 * Lead tagline (founder, Oct 10; placement per SCOPE "Ride status and charge timing", 9:42 update).
 * Appears ONLY on the morning receipt / night summary, as a small line under the total, and only
 * when a ride was actually booked (a driver accepted). Never on landing, menu, booked or trip screens.
 */
export const BRAND_LINE = 'Tab closed. Ride booked.';

/** "Friday, Oct 9. Tab closed. Ride booked." or just "Friday, Oct 9." on a night with no ride booked. */
export function nightTagline(rideBooked: boolean): string {
  return rideBooked ? `${venue.night.dateLong}. ${BRAND_LINE}` : `${venue.night.dateLong}.`;
}
