import type { Address } from '../venue.config';
import type { EntryPoint, Handoff } from '../lib/handoff';
import type { LiveStage, Stage, TerminalStage } from '../lib/rideState';
import type { OverCapAnswer } from '../lib/fare';

export type FareScenario = 'higher' | 'lower' | 'equal' | 'over';
export type Fault = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7';

export interface Ride {
  id: string;
  tab: string;
  seat: string;
  guest: string;
  entryPoint: EntryPoint;
  dest: Address;
  riders: 1 | 2;
  quoteCents: number;
  capCents: number;
  /** When the ride counts as booked (end of the undo window). */
  bookedAt: number;
  /** Set while inside the 10 s undo window; cleared on commit. */
  pending?: boolean;
  consentText: string;
  /** Dispute record: when and how the price was confirmed. */
  confirmedAt?: number;
  confirmedBy?: 'guest' | 'staff';
  scenario: FareScenario;
  /** Frozen at this stage (fault panel) until the guest acts. */
  hold?: LiveStage;
  terminal?: TerminalStage;
}

export type CreateResult =
  | { ride: Ride; duplicate: boolean; refused?: undefined }
  | { ride: Ride | null; duplicate: false; refused: 'active' | 'no_tab' };

export interface Consent {
  rideId: string;
  renderedText: string;
  textVersion: string;
  quoteCents: number;
  capCents: number;
  riders: number;
  entryPoint: EntryPoint;
  tab: string;
  at: number;
}

/** shownQuoteCents: the quote on screen at the confirm (snapshot for the record). */
export interface ConfirmInput { method: ConfirmMethod; by?: 'guest' | 'staff'; shownQuoteCents?: number }
export type ConfirmMethod = 'slide' | 'long_press' | 'a11y' | 'staff_saw_price';
/** Dispute record (founder decision 2026-10-10): time, quote, cap and entry point. Facts only. */
export interface Confirmation {
  rideId: string;
  at: number;
  quoteCents: number;
  capCents: number;
  entryPoint: EntryPoint;
  by: 'guest' | 'staff';
  method: ConfirmMethod;
  tab: string;
}

/** Event log entries hold facts only: no reason, notes, condition or drink count fields (UI 14b). */
export interface StaffPing { kind: 'guest_request' | 'quiet_request'; seat: string; at: number }

export interface LinkedTab { tab: string; seat: string; guest: string; via: 'seed' | 'table_qr' | 'staff_link'; at: number }

export interface DemoState {
  version: number;
  seededAt: number;
  handoff: Handoff | null;
  dest: Address | null;
  riders: 1 | 2;
  quoteCents: number;
  prevQuoteCents: number | null; // set when the price changed before booking (E2)
  ride: Ride | null;
  bookings: { rideId: string; at: number }[];
  consents: Consent[];
  /** Every completed confirm (slide, long press, accessible action), kept even if undone. */
  confirmations: Confirmation[];
  staffPings: StaffPing[];
  savedHome: Address | null;
  fareScenario: FareScenario;
  overCapAnswer: OverCapAnswer;
  tipPct: number;
  paid: boolean;
  tabClosed: boolean;
  fault: Fault | null;
  forceOffline: boolean;
  dispute: string | null;
  /** In-app nudges the guest dismissed, keyed `${rideId}:p4` etc. */
  dismissedNudges: string[];
  /** The open tab this phone is linked to. Ride home books only when linked. */
  linkedTab: LinkedTab | null;
  /** Demo: the next quote refresh returns a higher price. */
  priceMovesOnRefresh: boolean;
}

/**
 * The data layer interface (v1 implementation: InMemoryStore). All app code depends only on this, so a backend
 * implementation (HTTP + server sync) can replace LocalStorageStore later.
 */
export interface DemoStore {
  getState(): DemoState;
  subscribe(listener: () => void): () => void;
  now(): number;

  // guest requests (entry point is always guest_request from the patron side)
  requestStaff(seat: string): void;
  sendQuietRequest(seat: string): void;
  cancelStaffRequest(): void;

  // handoff from staff link
  openHandoff(h: Handoff): void;
  setDestination(a: Address): void;
  setRiders(n: 1 | 2): void;

  // booking: Confirm starts a 10 s undo window, then the ride counts as booked.
  // Idempotent: repeat taps return the existing ride.
  createRide(consentText: string, confirm?: ConfirmInput): CreateResult;
  /** Re-quote before booking (Confirm open > 2 min). Returns true if the price changed. */
  refreshQuote(): boolean;
  linkTab(t: Omit<LinkedTab, 'at'>): void;
  unlinkTab(): void;
  setPriceMovesOnRefresh(on: boolean): void;
  /** True while a ride is pending, booked, on the way, here or in progress. */
  hasActiveRide(): boolean;
  dismissNudge(key: string): void;
  undoRide(): void;
  /** Commits a pending ride once its undo window has passed. Fine to call often. */
  tick(): void;
  acceptNewQuote(): void;
  cancelRide(): void;
  advanceRide(): void;
  releaseHold(to?: LiveStage): void;
  stageOf(ride: Ride): Stage;

  // morning after
  setTip(pct: number): void;
  setOverCapAnswer(a: OverCapAnswer): void;
  setFareScenario(s: FareScenario): void;
  pay(): void;
  sendDispute(reason: string): void;
  saveHome(a: Address): void;
  clearSavedHome(): void;

  // demo
  applyFault(f: Fault): void;
  clearFault(): void;
  resetDemoData(urlLink?: { tab: string; seat: string } | null): void;
}
