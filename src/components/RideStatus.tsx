import { isAcceptedStage, type Stage } from '../lib/rideState';
import { capFor } from '../lib/fare';
import { fmt } from '../lib/money';

/**
 * Status copy (SCOPE "Ride status and charge timing", Harper memo): undo screen "Requesting your ride...",
 * then "Ride requested. Finding a driver." until a driver accepts (the simulated driver accepts at en_route),
 * then "Ride booked. Fare on your tab." No tagline on live screens.
 */
export const isAccepted = (stage: Stage | null) => isAcceptedStage(stage) && stage !== 'complete' && stage !== 'picked_up';

export function bookedLine(tabClosed: boolean): string {
  return tabClosed ? 'Ride booked. Fare added to your tab.' : 'Ride booked. Fare on your tab.';
}
export const requestedLine = (quoteCents: number) =>
  `${fmt(quoteCents)} goes on your tab when a driver accepts. Final fare may differ by up to ${fmt(capFor(quoteCents))}.`;

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
      <p className="ride-status__head" data-testid="status-booked">{bookedLine(tabClosed)}</p>
    </div>
  );
}
