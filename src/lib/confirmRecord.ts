import type { DemoState, Ride } from '../store/types';
import { venue } from '../venue.config';
import { fmt } from './money';
import { isAcceptedStage, rideStage } from './rideState';

const ET = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
/** Clock time in America/New_York, e.g. "11:42 PM". */
export const fmtET = (ms: number): string => ET.format(new Date(ms));

/** Confirm records for this phone's guest tab (bar bookings on other tabs do not count). */
export const guestConfirmations = (s: DemoState) => {
  const tab = s.linkedTab?.tab ?? venue.tabNumber;
  return s.confirmations.filter((c) => c.tab === tab);
};

/** This phone slid or has a record on its tab (then the sample night is no longer shown). */
export const guestActivity = (s: DemoState) => s.slides.length > 0 || guestConfirmations(s).length > 0;

/** No driver found: "Requested by guest, 11:42 PM. No driver found. Not charged." (time of the slide, ET). */
export function noDriverLine(s: DemoState, ride: Ride | null = s.ride, now: number = Date.now()): string | null {
  if (!ride || ride.pending || rideStage(ride, now) !== 'no_cars') return null;
  const slide = [...s.slides].reverse().find((x) => x.rideId === ride.id);
  const at = slide?.at ?? ride.confirmedAt ?? ride.bookedAt;
  return `Requested by ${ride.confirmedBy === 'staff' ? 'staff' : 'guest'}, ${fmtET(at)}. No driver found. Not charged.`;
}

/** B6 record line for any bar ride (never the sample fallback). Shown with the fare line once a driver accepts. */
export function barConfirmLine(s: DemoState, ride: Ride, now: number = Date.now()): ConfirmLine | null {
  if (ride.pending || !isAcceptedStage(rideStage(ride, now))) return null;
  const rec = [...s.bar.seedRecords, ...s.confirmations].reverse().find((c) => c.rideId === ride.id);
  if (!rec) return null;
  const text = rec.by === 'staff' ? `Booked by staff, price shown to guest, ${fmtET(rec.at)}` : `Confirmed by guest, ${fmtET(rec.at)}`;
  return { text, amounts: `Quote ${fmt(rec.quoteCents)}, may differ by up to ${fmt(rec.capCents)}, as shown at the time.`, sample: false };
}

export interface ConfirmLine { text: string; amounts: string; sample: boolean }

/**
 * Billing record line for the receipt (P9/P10) and the bar's tab line (B6). Confirm record rules:
 * logged when the 10 s undo window ends, shown with the fare line once a driver accepts; an undone confirm shows nothing.
 * Quote and cap are the snapshot shown on screen at the confirm, never a later re-quote.
 */
export function confirmLine(s: DemoState, ride: Ride | null = s.ride, now: number = Date.now()): ConfirmLine | null {
  if (ride && !ride.pending && !isAcceptedStage(rideStage(ride, now))) return null; // fare and record post on driver accept
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
  if (!ride && guestActivity(s)) return null; // undone: no record line
  return { text: `Confirmed by guest, ${venue.night.booked}`, amounts: `Quote ${fmt(venue.quoteCents)}, may differ by up to ${fmt(Math.min(Math.round(venue.quoteCents * 0.2), 500))}, as shown at the time.`, sample: true };
}
