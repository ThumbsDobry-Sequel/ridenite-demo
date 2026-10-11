import type { DemoState, Ride } from '../store/types';
import { venue } from '../venue.config';
import { fmt } from './money';

const ET = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
/** Clock time in America/New_York, e.g. "11:42 PM". */
export const fmtET = (ms: number): string => ET.format(new Date(ms));

export interface ConfirmLine { text: string; amounts: string; sample: boolean }

/**
 * Billing record line for the receipt (P9/P10) and the bar's tab line (B6). Confirm record rules:
 * shown only once the ride is booked (after the 10 s undo window); an undone confirm shows nothing.
 * Quote and cap are the snapshot shown on screen at the confirm, never a later re-quote.
 */
export function confirmLine(s: DemoState, ride: Ride | null = s.ride): ConfirmLine | null {
  if (ride && !ride.pending) {
    const rec = [...s.confirmations].reverse().find((c) => c.rideId === ride.id);
    if (rec) {
      const text = rec.by === 'staff'
        ? `Booked by staff, price shown to guest, ${fmtET(rec.at)}`
        : `Confirmed by guest, ${fmtET(rec.at)}`;
      return { text, amounts: `Quote ${fmt(rec.quoteCents)}, may differ by up to ${fmt(rec.capCents)}, as shown at the time.`, sample: false };
    }
  }
  if (ride && ride.pending) return null;
  if (!ride && s.confirmations.length > 0) return null; // undone: no record line
  return { text: `Confirmed by guest, ${venue.night.booked}`, amounts: `Quote ${fmt(venue.quoteCents)}, may differ by up to ${fmt(Math.min(Math.round(venue.quoteCents * 0.2), 500))}, as shown at the time.`, sample: true };
}
