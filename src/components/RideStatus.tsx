import { isAcceptedStage, type Stage } from '../lib/rideState';
import { capFor } from '../lib/fare';
import { fmt } from '../lib/money';

/**
 * Status copy (SCOPE "Ride status and charge timing", Harper memo): undo screen "Requesting your ride...",
 * then "Ride requested. Finding a driver." until a driver accepts (the simulated driver accepts at en_route),
 * then "Ride booked. Fare goes on your tab at pickup." (SCOPE 22:22: the fare posts at pickup). No tagline on live screens.
 */
export const isAccepted = (stage: Stage | null) => isAcceptedStage(stage) && stage !== 'complete' && stage !== 'picked_up';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function bookedLine(_tabClosed?: boolean): string {
  return 'Ride booked. Fare goes on your tab at pickup.';
}
export const requestedLine = (quoteCents: number) =>
  `${fmt(quoteCents)} goes on your tab when you're picked up. Final fare may differ by up to ${fmt(capFor(quoteCents))}.`;

export function RideStatus({ stage, quoteCents, tabClosed }: { stage: Stage | null; quoteCents: number; tabClosed: boolean }) {
  if (stage === 'requested') {
    return (
      <div className="ride-status" role="status" data-testid="ride-status">
        <p className="ride-status__head" data-testid="status-requested">Ride requested. Finding a driver.</p>
        <p className="callout" data-testid="status-requested-fare">{requestedLine(quoteCents)}</p>
      </div>
    );
  }
  if (!isAccepted(stage)) return null;
  return (
    <div className="ride-status" role="status" data-testid="ride-status">
      {/* Vera rev 04: "Ride booked." heading, "Fare goes on your tab at pickup." second line */}
      <p className="ride-status__head" data-testid="status-booked">Ride booked.</p>
      <p className="callout" data-testid="status-booked-fare">Fare goes on your tab at pickup.</p>
    </div>
  );
}
