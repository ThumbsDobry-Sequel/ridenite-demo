import { venue, type Address } from '../venue.config';
import { capFor, type OverCapAnswer } from '../lib/fare';
import type { Handoff } from '../lib/handoff';
import { bookedAtFor, nextStage, stageAt, UNDO_MS, type LiveStage, type Stage } from '../lib/rideState';
import { seedState } from './seed';
import type { UrlLink } from '../lib/urlLink';
import type { ConfirmInput, CreateResult, DemoState, DemoStore, FareScenario, Fault, LinkedTab, Ride } from './types';

/**
 * v1 data layer: memory only. Every page load is a fresh demo (product decision Oct 10):
 * nothing is persisted, so a reload mid-ride shows a fresh demo with nothing booked.
 * The tab link comes from the URL on every load (see lib/urlLink.ts).
 */
export class InMemoryStore implements DemoStore {
  private state: DemoState;
  private listeners = new Set<() => void>();
  private clock: () => number;
  private urlLink: UrlLink | null | undefined;

  /** urlLink: tab from the QR link params (undefined = none given, use the seeded demo tab). */
  constructor(opts: { clock?: () => number; urlLink?: UrlLink | null } = {}) {
    this.clock = opts.clock ?? (() => Date.now());
    this.urlLink = opts.urlLink;
    this.state = this.fresh();
  }

  private fresh(): DemoState {
    const s = seedState(this.clock());
    if (this.urlLink) s.linkedTab = { ...this.urlLink, guest: s.linkedTab?.guest ?? '', via: 'table_qr', at: this.clock() };
    return s;
  }

  private set(patch: Partial<DemoState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Clears ride-related state so faults never stack. */
  private freshRidePatch(): Partial<DemoState> {
    return {
      ride: null, fault: null, forceOffline: false, tabClosed: false, prevQuoteCents: null,
      quoteCents: this.state.handoff?.q ?? venue.quoteCents, overCapAnswer: null, paid: false,
      fareScenario: 'higher', dispute: null,
    };
  }

  getState = () => this.state;
  subscribe = (l: () => void) => { this.listeners.add(l); return () => void this.listeners.delete(l); };
  now = () => this.clock();

  requestStaff(seat: string) {
    const last = this.state.staffPings[this.state.staffPings.length - 1];
    // debounce: one tap creates exactly one staff ping (UI 5 P1 acceptance)
    if (last && last.kind === 'guest_request' && this.now() - last.at < 3000) return;
    this.set({ staffPings: [...this.state.staffPings, { kind: 'guest_request', seat, at: this.now() }] });
  }
  sendQuietRequest(seat: string) {
    const last = this.state.staffPings[this.state.staffPings.length - 1];
    if (last && last.kind === 'quiet_request' && this.now() - last.at < 3000) return;
    this.set({ staffPings: [...this.state.staffPings, { kind: 'quiet_request', seat: seat.slice(0, 40), at: this.now() }] });
  }
  cancelStaffRequest() { this.set({ staffPings: [] }); }

  openHandoff(h: Handoff) {
    const patch: Partial<DemoState> = {
      ...this.freshRidePatch(), handoff: h, quoteCents: h.q, dest: this.state.savedHome,
      linkedTab: { tab: h.tab, seat: h.seat, guest: h.guest, via: 'staff_link', at: this.now() },
    };
    if (h.at) {
      // Second phone: the link already carries a booking, so mirror that ride.
      const dest = this.state.savedHome && h.dest === this.state.savedHome.line ? this.state.savedHome
        : { line: h.dest ?? 'Drop-off set by staff', area: '' };
      patch.ride = this.makeRide(h, dest, h.q, h.at);
      patch.dest = dest;
    }
    this.set(patch);
  }
  setDestination(a: Address) { this.set({ dest: a }); }
  setRiders(n: 1 | 2) { this.set({ riders: n }); }

  private makeRide(h: Handoff, dest: Address, quoteCents: number, bookedAt: number, consentText = ''): Ride {
    return {
      id: `r-${h.tab}-${bookedAt}`, tab: h.tab, seat: h.seat, guest: h.guest, entryPoint: h.ep, dest,
      riders: this.state.riders, quoteCents, capCents: capFor(quoteCents), bookedAt, consentText, scenario: this.state.fareScenario,
    };
  }

  private defaultHandoff(): Handoff {
    const t = this.state.linkedTab;
    return { v: 1, venue: venue.slug, tab: t?.tab ?? venue.tabNumber, seat: t?.seat ?? venue.seat, guest: t?.guest ?? venue.guest.name, ep: 'guest_request', q: this.state.quoteCents };
  }

  hasActiveRide(): boolean {
    const r = this.state.ride;
    if (!r) return false;
    const st = this.stageOf(r);
    return st !== 'complete' && st !== 'canceled_by_driver' && st !== 'no_cars' && st !== 'canceled_by_guest';
  }

  dismissNudge(key: string) {
    if (!this.state.dismissedNudges.includes(key)) this.set({ dismissedNudges: [...this.state.dismissedNudges, key] });
  }

  linkTab(t: Omit<LinkedTab, 'at'>) { this.set({ linkedTab: { ...t, at: this.now() }, tabClosed: false }); }
  unlinkTab() { this.set({ linkedTab: null }); }
  setPriceMovesOnRefresh(on: boolean) { this.set({ priceMovesOnRefresh: on }); }

  refreshQuote(): boolean {
    const next = this.state.priceMovesOnRefresh ? venue.e2NewQuoteCents : (this.state.handoff?.q ?? venue.quoteCents);
    if (next === this.state.quoteCents) return false;
    this.set({ prevQuoteCents: this.state.quoteCents, quoteCents: next, priceMovesOnRefresh: false });
    return true;
  }

  createRide(consentText: string, confirm?: ConfirmInput): CreateResult {
    // Never two rides: a repeat tap while a ride is active returns the same ride.
    if (this.hasActiveRide()) return { ride: this.state.ride!, duplicate: true };
    // Only book against an open, linked tab.
    if (!this.state.linkedTab || this.state.tabClosed) return { ride: null, duplicate: false, refused: 'no_tab' };
    const h = this.state.handoff ?? this.defaultHandoff();
    const dest = this.state.dest ?? this.state.savedHome ?? venue.guest.home;
    const by = confirm?.by ?? 'guest';
    const ride: Ride = { ...this.makeRide(h, dest, this.state.quoteCents, this.now() + UNDO_MS, consentText), pending: true, confirmedAt: this.now(), confirmedBy: by };
    const confirmations = confirm
      ? [...this.state.confirmations, {
        rideId: ride.id, at: this.now(), quoteCents: confirm.shownQuoteCents ?? ride.quoteCents,
        capCents: capFor(confirm.shownQuoteCents ?? ride.quoteCents), entryPoint: ride.entryPoint, by, method: confirm.method, tab: ride.tab,
      }]
      : this.state.confirmations;
    this.set({ ride, confirmations, fault: null, prevQuoteCents: null, overCapAnswer: null, paid: false });
    return { ride, duplicate: false };
  }

  undoRide() {
    const r = this.state.ride;
    // Undo only inside the window: nothing was booked, nothing added to the tab.
    if (r && r.pending && this.now() < r.bookedAt) this.set({ ride: null });
  }

  tick() {
    const r = this.state.ride;
    if (!r || !r.pending || this.now() < r.bookedAt) return;
    const committed: Ride = { ...r, pending: false };
    this.set({
      ride: committed,
      bookings: [...this.state.bookings, { rideId: r.id, at: r.bookedAt }],
      consents: [...this.state.consents, {
        rideId: r.id, renderedText: r.consentText, textVersion: 'confirm-fare-on-tab-v1', quoteCents: r.quoteCents,
        capCents: r.capCents, riders: r.riders, entryPoint: r.entryPoint, tab: r.tab, at: r.bookedAt - UNDO_MS,
      }],
    });
  }

  acceptNewQuote() { this.set({ prevQuoteCents: null, fault: null }); }

  cancelRide() { this.set({ ride: null, fault: null, forceOffline: false }); }

  stageOf(ride: Ride): Stage {
    if (ride.terminal) return ride.terminal;
    if (ride.pending && this.now() < ride.bookedAt) return 'pending';
    if (ride.hold) return ride.hold;
    return stageAt(ride.bookedAt, this.now());
  }

  advanceRide() {
    const r = this.state.ride;
    if (!r || r.terminal || r.pending) return;
    const cur = this.stageOf(r) as LiveStage;
    this.set({ ride: { ...r, hold: undefined, bookedAt: bookedAtFor(nextStage(cur), this.now()) } });
  }
  releaseHold(to?: LiveStage) {
    const r = this.state.ride;
    if (!r) return;
    const stage = to ?? (this.stageOf(r) as LiveStage);
    this.set({ ride: { ...r, hold: undefined, bookedAt: bookedAtFor(stage, this.now()) }, fault: null, forceOffline: false });
  }

  setTip(pct: number) { this.set({ tipPct: pct }); }
  setOverCapAnswer(a: OverCapAnswer) { this.set({ overCapAnswer: a }); }
  setFareScenario(s: FareScenario) {
    this.set({ fareScenario: s, overCapAnswer: null, ride: this.state.ride ? { ...this.state.ride, scenario: s } : null });
  }
  pay() { this.set({ paid: true }); }
  sendDispute(reason: string) { this.set({ dispute: reason.slice(0, 60) }); }
  saveHome(a: Address) { this.set({ savedHome: a }); }
  clearSavedHome() { this.set({ savedHome: null, dest: null }); }

  applyFault(f: Fault) {
    // Every fault starts from a fresh ride state (faults never stack).
    const base = { ...this.freshRidePatch() };
    this.state = { ...this.state, ...base };
    const h = this.state.handoff ?? this.defaultHandoff();
    const dest = this.state.savedHome ?? venue.guest.home;
    const now = this.now();
    const booked = (stage: LiveStage, extra: Partial<Ride> = {}): Ride => ({
      ...this.makeRide(h, dest, venue.quoteCents, bookedAtFor(stage, now)), ...extra,
    });
    switch (f) {
      case 'E1': this.set({ ...base, fault: f }); break;
      case 'E2': this.set({ ...base, fault: f, prevQuoteCents: venue.quoteCents, quoteCents: venue.e2NewQuoteCents, dest }); break;
      case 'E3': this.set({ ...base, fault: f, ride: booked('arrived', { hold: 'arrived' }) }); break;
      case 'E4': this.set({ ...base, fault: f, tabClosed: true }); break;
      case 'E5': this.set({ ...base, fault: f, forceOffline: true, ride: booked('en_route', { hold: 'en_route' }) }); break;
      case 'E6': this.set({ ...base, fault: f, ride: booked('en_route', { terminal: 'canceled_by_driver' }) }); break;
      case 'E7': this.set({ ...base, fault: f, fareScenario: 'over', ride: booked('complete', { scenario: 'over' as FareScenario }) }); break;
    }
  }
  clearFault() { this.set({ fault: null, forceOffline: false }); }

  /** Same as a reload: fresh seed, tab link from the current URL. */
  resetDemoData(urlLink?: UrlLink | null) {
    if (urlLink !== undefined) this.urlLink = urlLink;
    this.state = this.fresh();
    this.set({});
  }
}

export type { Address };
