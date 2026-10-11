import type { Address, PriceMode } from '../venue.config';
import type { EntryPoint, Handoff } from '../lib/handoff';
import type { LiveStage, Stage, TerminalStage } from '../lib/rideState';
import type { OverCapAnswer } from '../lib/fare';

export type FareScenario = 'higher' | 'lower' | 'equal' | 'over';
export type Fault = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7';

export interface Ride {
  id: string;
  /** RideNite per-ride fee charged for this ride, stored at booking (Harper payout-return.md section 7).
   *  Payout Returns use this value, never live config. 0 if the fee was waived. */
  feeChargedCents: number;
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
  /** Demo: no driver accepts this request. */
  noDriver?: boolean;
  /** Guest confirm details, held while pending; the record is logged when the undo window ends. */
  confirmInput?: ConfirmInput & { at: number };
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

/* ---------- Bartender side (M2) ---------- */

export type Role = 'guest' | 'bartender';
export type DropMode = 'link' | 'qr' | 'staff';

export interface BarTab {
  tab: string;
  seat: string;
  guest: string;
  phoneLast4: string;
  items: [string, number][];
  /** open, closed now (Mode A) or held for morning checkout (Mode B). */
  close: 'open' | 'closed' | 'held' | 'pending';
  /** When the bartender tapped Close (pending: waits for pickup or cancel, inside the 24 h POS hold). */
  closeAt?: number;
  /** Link to enter drop-off was texted (sample). */
  linkSentAt?: number;
}

/** Guest's answer on their own phone: drop-off picked and price seen ("Yes, send my ride"). */
export interface GuestReply { tab: string; dest: Address; quoteCents: number; at: number }

/** Booking sheet in progress (B3). Nothing here is free text. */
export interface BarDraft {
  tab: string;
  ep: EntryPoint;
  mode: DropMode;
  dest: Address | null;
  quoteCents: number | null;
  prevQuoteCents: number | null;
  sawPrice: boolean;
  sawBy: 'guest' | 'staff' | null;
  sideDoor?: boolean;
  oneRider?: boolean;
}

export interface CarInfo { car: string; plate: string; plateSpoken: string; driver: string; partner: string }

export interface BarRide extends Ride { carInfo: CarInfo; completedAt?: number }

export interface QuietRequest { tab: string; seat: string; at: number; seen: boolean; sideDoor: boolean; oneRider: boolean; booked: boolean }

export interface BarSettings {
  priceMode: PriceMode;
  receipt: 'neutral' | 'detailed';
  tabLineName: 'Courtesy car' | 'RideNite Ride';
  closeNoticeMin: number;
}

export interface BarState {
  welcomed: boolean;
  tabs: BarTab[];
  /** Rides on tabs other than this phone's guest tab (that one lives in DemoState.ride). */
  rides: BarRide[];
  replies: GuestReply[];
  draft: BarDraft | null;
  quiet: QuietRequest | null;
  settings: BarSettings;
  /** Sample count of rides finished earlier tonight, for the header. */
  earlierRides: number;
  seedRecords: Confirmation[];
  nextTab: number;
}

export type BarBookResult =
  | { ok: true; ride: Ride; tab: string; duplicate: boolean }
  | { ok: false; reason: 'no_draft' | 'no_quote' | 'not_seen' | 'active' | 'tab_closed' };

export interface DemoState {
  version: number;
  seededAt: number;
  /** Fee charged on the seeded sample ride, stored at seed time (same rule as feeChargedCents on live rides). */
  sampleRideFeeChargedCents: number;
  /** When the guest's tab opened (sample). The card hold deadline is computed from it. */
  tabOpenedAt: number;
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
  /** Every completed slide on this phone (rideId, time), kept even if undone. Not a billing record. */
  slides: { rideId: string; at: number }[];
  /** Demo: the next or current request finds no driver. */
  forceNoDriver: boolean;
  /** Demo: treat the quote as older than 5 minutes. */
  forceStaleQuote: boolean;
  role: Role;
  bar: BarState;
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
  /** No driver found: keep looking. Returns 'stale' when the quote is too old (new price, new slide needed). */
  keepLooking(): 'looking' | 'stale' | 'none';
  setForceNoDriver(on: boolean): void;
  setForceStaleQuote(on: boolean): void;
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

  // bartender (M2)
  setRole(r: Role): void;
  barWelcome(): void;
  /** Tap 1 (Guest asked / I offered): opens the booking sheet for a tab with that entry point. */
  barStartDraft(tab: string, ep: EntryPoint): void;
  barSetMode(mode: DropMode): void;
  /** Staff entered path: pick a seeded drop-off (no typing). Quote appears; box stays unticked. */
  barPickDest(a: Address): void;
  barToggleSawPrice(): void;
  /** Demo: the guest picks a drop-off and taps "Yes, send my ride" on their phone. */
  barSimulateGuestReply(tab: string): void;
  /** Demo E2: price changes before booking; Book disables again until the price is re-seen. */
  barPriceChanged(): void;
  barCancelDraft(): void;
  barBook(): BarBookResult;
  barRebook(rideId: string, partner?: string): Ride | null;
  barResendLink(tab: string): void;
  barNewGuest(): string;
  barCloseTab(tab: string, how: 'closed' | 'held'): void;
  driverCancel(rideId?: string): void;
  barMarkQuietSeen(): void;
  barSetQuietOption(k: 'sideDoor' | 'oneRider', v: boolean): void;
  barSetSetting<K extends keyof BarSettings>(k: K, v: BarSettings[K]): void;
  barSetRideScenario(rideId: string, s: FareScenario): void;
  /** Demo: jump a ride to drop-off so the final fare lines post. */
  barFinishRide(rideId: string): void;
  /** All rides the bar sees, plus the ride on the guest phone. */
  barRides(): BarRide[];
  barActiveRide(tab: string): BarRide | null;
}
