import { venue, type Address } from '../venue.config';
import { capFor, type OverCapAnswer } from '../lib/fare';
import type { Handoff } from '../lib/handoff';
import { DEMO_TIMELINE, bookedAtFor, isAcceptedStage, isChargedStage, nextStage, QUOTE_VALID_MS, rideStage, UNDO_MS, type LiveStage, type Stage } from '../lib/rideState';
import { seedState } from './seed';
import type { UrlLink } from '../lib/urlLink';
import type {
  BarBookResult, BarDraft, BarRide, BarSettings, BarTab, BarState, CarInfo, ConfirmInput, CreateResult, DemoState, DemoStore, DropMode,
  FareScenario, Fault, LinkedTab, Ride, Role,
} from './types';
import type { EntryPoint } from '../lib/handoff';

const TERMINAL_OR_DONE = ['complete', 'canceled_by_driver', 'no_cars', 'canceled_by_guest'];
const GUEST_CAR: CarInfo = { car: venue.driver.car, plate: venue.driver.plate, plateSpoken: venue.driver.plateSpoken, driver: venue.driver.name, partner: venue.driver.partner };
const REBOOK_CAR: CarInfo = { car: 'Blue Hyundai Sonata', plate: 'JMC-8813', plateSpoken: 'J M C 8 8 1 3', driver: 'Tess', partner: venue.bar.rebookPartner };
const OTHER_CAR: CarInfo = { car: 'Gray Kia K5', plate: 'PLW-6620', plateSpoken: 'P L W 6 6 2 0', driver: 'Andre', partner: 'Ballston Car Co.' };

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
  constructor(opts: { clock?: () => number; urlLink?: UrlLink | null; onSkew?: (ms: number) => void } = {}) {
    this.clock = opts.clock ?? (() => Date.now());
    this.onSkew = opts.onSkew;
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
  private skew = 0;
  private onSkew?: (ms: number) => void;
  now = () => this.clock() + this.skew;
  /** Demo phone clock jump (never backwards). The app mirrors it into Date.now() so every screen agrees. */
  jumpClock(ms: number) {
    if (ms <= 0) return;
    this.skew += ms;
    this.onSkew?.(this.skew);
    this.listeners.forEach((l) => l());
  }

  requestStaff(seat: string) {
    const last = this.state.staffPings[this.state.staffPings.length - 1];
    // debounce: one tap creates exactly one staff ping (UI 5 P1 acceptance)
    if (last && last.kind === 'guest_request' && this.now() - last.at < 3000) return;
    this.set({ staffPings: [...this.state.staffPings, { kind: 'guest_request', seat, at: this.now() }] });
  }
  sendQuietRequest(seat: string) {
    const last = this.state.staffPings[this.state.staffPings.length - 1];
    if (last && last.kind === 'quiet_request' && this.now() - last.at < 3000) return;
    const tab = this.state.linkedTab?.tab ?? venue.tabNumber;
    // Shows on the bar phone as a quiet request (B10). No reason, no notes, no sound.
    this.set({
      staffPings: [...this.state.staffPings, { kind: 'quiet_request', seat: seat.slice(0, 40), at: this.now() }],
      bar: { ...this.state.bar, quiet: { tab, seat: seat.slice(0, 40), at: this.now(), seen: false, sideDoor: false, oneRider: false, booked: false } },
    });
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
      id: `r-${h.tab}-${bookedAt}`, feeChargedCents: venue.perRideFeeCents, tab: h.tab, seat: h.seat, guest: h.guest, entryPoint: h.ep, dest,
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
    const ride: Ride = {
      ...this.makeRide(h, dest, this.state.quoteCents, this.now() + UNDO_MS, consentText), pending: true, confirmedAt: this.now(), confirmedBy: by,
      ...(confirm ? { confirmInput: { ...confirm, at: this.now() } } : {}),
      ...(this.state.forceNoDriver ? { noDriver: true } : {}),
    };
    // The billing record is logged when the undo window ends (tick); the slide itself is only noted here.
    this.set({ ride, slides: [...this.state.slides, { rideId: ride.id, at: this.now() }], forceNoDriver: false, fault: null, prevQuoteCents: null, overCapAnswer: null, paid: false });
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
    const ci = r.confirmInput;
    const confirmations = ci
      ? [...this.state.confirmations, {
        rideId: r.id, at: ci.at, quoteCents: ci.shownQuoteCents ?? r.quoteCents, capCents: capFor(ci.shownQuoteCents ?? r.quoteCents),
        entryPoint: r.entryPoint, by: ci.by ?? 'guest', method: ci.method, tab: r.tab,
      }]
      : this.state.confirmations;
    this.set({
      ride: committed,
      confirmations,
      bookings: [...this.state.bookings, { rideId: r.id, at: r.bookedAt }],
      consents: [...this.state.consents, {
        rideId: r.id, renderedText: r.consentText, textVersion: 'confirm-fare-on-tab-v1', quoteCents: r.quoteCents,
        capCents: r.capCents, riders: r.riders, entryPoint: r.entryPoint, tab: r.tab, at: r.bookedAt - UNDO_MS,
      }],
    });
  }

  acceptNewQuote() { this.set({ prevQuoteCents: null, fault: null }); }

  cancelRide() { this.set({ ride: null, fault: null, forceOffline: false }); }

  stageOf(ride: Ride): Stage { return rideStage(ride, this.now()); }

  keepLooking(): 'looking' | 'stale' | 'none' {
    const r = this.state.ride;
    const slide = r ? [...this.state.slides].reverse().find((x) => x.rideId === r.id) : undefined;
    const quotedAt = slide?.at ?? r?.confirmedAt ?? this.now();
    if (this.state.forceStaleQuote || this.now() - quotedAt > QUOTE_VALID_MS) {
      // Never rebook silently on an old price: new quote, new slide.
      const next = this.state.priceMovesOnRefresh || this.state.forceStaleQuote ? venue.e2NewQuoteCents : this.state.quoteCents;
      this.set({ ride: null, fault: null, prevQuoteCents: this.state.quoteCents, quoteCents: next, forceStaleQuote: false, priceMovesOnRefresh: false, forceNoDriver: false });
      return 'stale';
    }
    if (!r) { this.set({ fault: null }); return 'none'; }
    // Search again from now; in the demo a driver accepts this time unless no driver is still forced.
    this.set({ ride: { ...r, terminal: undefined, hold: undefined, noDriver: undefined, bookedAt: this.now() }, fault: null });
    return 'looking';
  }
  setForceNoDriver(on: boolean) {
    const r = this.state.ride;
    const patch: Partial<DemoState> = { forceNoDriver: on };
    // A request still searching gives up right away when forced.
    if (on && r && !r.pending && this.stageOf(r) === 'requested') { patch.ride = { ...r, terminal: 'no_cars' }; patch.forceNoDriver = false; }
    else if (on && r && r.pending) { patch.ride = { ...r, noDriver: true }; patch.forceNoDriver = false; }
    this.set(patch);
  }
  setForceStaleQuote(on: boolean) { this.set({ forceStaleQuote: on, priceMovesOnRefresh: on || this.state.priceMovesOnRefresh }); }

  advanceRide() {
    const r = this.state.ride;
    if (!r || r.terminal || r.pending) return;
    const cur = this.stageOf(r) as LiveStage;
    const next = nextStage(cur);
    // Jump the demo clock to the next stage instead of rewriting the ride's times: booked, pickup, drop-off and the
    // phone clock all stay consistent (the P9 header is never earlier than the drop-off).
    // A held ride (fault demos) resumes at the next stage now, as before.
    if (r.hold) { this.set({ ride: { ...r, hold: undefined, bookedAt: bookedAtFor(next, this.now()) } }); return; }
    this.jumpClock(r.bookedAt + DEMO_TIMELINE[next] - this.now());
  }
  releaseHold(to?: LiveStage) {
    const r = this.state.ride;
    if (!r) return;
    const stage = to ?? (this.stageOf(r) as LiveStage);
    this.set({ ride: { ...r, hold: undefined, bookedAt: bookedAtFor(stage, this.now()) }, fault: null, forceOffline: false });
  }

  setTip(pct: number) { this.set({ tipPct: pct }); }
  setOverCapAnswer(a: OverCapAnswer) { this.set({ overCapAnswer: a }); }
  approveStop(newQuoteCents: number) {
    const r = this.state.ride;
    if (!r || r.pending || r.terminal) return;
    const orig = r.originalQuoteCents ?? r.quoteCents;
    this.set({ ride: { ...r, quoteCents: newQuoteCents, capCents: capFor(newQuoteCents), originalQuoteCents: orig, stopDeltaCents: newQuoteCents - orig }, quoteCents: newQuoteCents, overCapAnswer: null });
  }
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
      case 'E7': this.set({ ...base, fault: f, ride: booked('en_route', { hold: 'en_route' }) }); break;
      case 'E8': this.set({ ...base, fault: f, fareScenario: 'over', ride: booked('complete', { scenario: 'over' as FareScenario }) }); break;
    }
  }
  clearFault() { this.set({ fault: null, forceOffline: false }); }


  /* ---------------- Bartender (M2) ---------------- */

  private setBar(patch: Partial<BarState>, extra: Partial<DemoState> = {}) {
    this.set({ ...extra, bar: { ...this.state.bar, ...patch } });
  }
  private guestTab(): string { return this.state.linkedTab?.tab ?? venue.tabNumber; }

  setRole(r: Role) { this.set({ role: r }); }
  barWelcome() { this.setBar({ welcomed: true }); }

  barRides(): BarRide[] {
    const out: BarRide[] = [...this.state.bar.rides];
    const r = this.state.ride;
    if (r) out.unshift({ ...r, carInfo: GUEST_CAR });
    return out;
  }
  barActiveRide(tab: string): BarRide | null {
    return this.barRides().find((r) => r.tab === tab && !TERMINAL_OR_DONE.includes(this.stageOf(r))) ?? null;
  }

  barStartDraft(tab: string, ep: EntryPoint) {
    const t = this.state.bar.tabs.find((x) => x.tab === tab);
    if (!t) return;
    const reply = this.state.bar.replies.find((x) => x.tab === tab);
    const q = this.state.bar.quiet;
    const draft: BarDraft = {
      tab, ep, mode: 'link', dest: reply?.dest ?? null, quoteCents: reply?.quoteCents ?? null, prevQuoteCents: null,
      // auto-checked only when the guest said yes on their own phone
      sawPrice: !!reply, sawBy: reply ? 'guest' : null,
      ...(q && q.tab === tab ? { sideDoor: q.sideDoor, oneRider: q.oneRider } : {}),
    };
    this.setBar({ draft });
  }
  barSetMode(mode: DropMode) {
    const d = this.state.bar.draft;
    if (!d || d.mode === mode) return;
    if (d.sawBy === 'guest') { this.setBar({ draft: { ...d, mode } }); return; }
    // switching paths drops a staff-entered drop-off and its tick
    this.setBar({ draft: { ...d, mode, dest: null, quoteCents: null, prevQuoteCents: null, sawPrice: false, sawBy: null } });
  }
  barPickDest(a: Address) {
    const d = this.state.bar.draft;
    if (!d) return;
    this.setBar({ draft: { ...d, mode: 'staff', dest: a, quoteCents: venue.quoteCents, prevQuoteCents: null, sawPrice: false, sawBy: null } });
  }
  barToggleSawPrice() {
    const d = this.state.bar.draft;
    if (!d || d.quoteCents == null) return; // nothing to have seen yet
    this.setBar({ draft: { ...d, sawPrice: !d.sawPrice, sawBy: d.sawPrice ? null : 'staff' } });
  }
  barSimulateGuestReply(tab: string) {
    const dest = tab === this.guestTab() ? (this.state.savedHome ?? venue.guest.home) : venue.addresses[3];
    const replies = [...this.state.bar.replies.filter((r) => r.tab !== tab), { tab, dest, quoteCents: venue.quoteCents, at: this.now() }];
    const d = this.state.bar.draft;
    const draft = d && d.tab === tab
      ? { ...d, mode: d.mode === 'staff' ? 'link' as const : d.mode, dest, quoteCents: venue.quoteCents, prevQuoteCents: null, sawPrice: true, sawBy: 'guest' as const }
      : d;
    this.setBar({ replies, draft });
  }
  barPriceChanged() {
    const d = this.state.bar.draft;
    if (!d || d.quoteCents == null) return;
    this.setBar({ draft: { ...d, prevQuoteCents: d.quoteCents, quoteCents: venue.e2NewQuoteCents, sawPrice: false, sawBy: null } });
  }
  barCancelDraft() { this.setBar({ draft: null }); }

  barBook(): BarBookResult {
    const d = this.state.bar.draft;
    if (!d) {
      // a repeat tap after booking returns the ride just made, never a second one
      return { ok: false, reason: 'no_draft' };
    }
    if (d.quoteCents == null || !d.dest) return { ok: false, reason: 'no_quote' };
    if (!d.sawPrice || !d.sawBy) return { ok: false, reason: 'not_seen' };
    const t = this.state.bar.tabs.find((x) => x.tab === d.tab);
    if (!t || t.close !== 'open') return { ok: false, reason: 'tab_closed' };
    const isGuestPhone = d.tab === this.guestTab() && !!this.state.linkedTab;
    if (isGuestPhone ? this.hasActiveRide() : this.barActiveRide(d.tab)) {
      const existing = isGuestPhone ? this.state.ride! : this.barActiveRide(d.tab)!;
      return { ok: true, ride: existing, tab: d.tab, duplicate: true };
    }
    const now = this.now();
    const ride: Ride = {
      id: `r-${d.tab}-${now}`, feeChargedCents: venue.perRideFeeCents, tab: d.tab, seat: t.seat, guest: t.guest, entryPoint: d.ep, dest: d.dest,
      riders: 1, quoteCents: d.quoteCents, capCents: capFor(d.quoteCents), bookedAt: now,
      consentText: '', confirmedAt: now, confirmedBy: d.sawBy, scenario: 'higher',
      ...(this.state.forceNoDriver ? { noDriver: true } : {}),
    };
    const conf = {
      rideId: ride.id, at: now, quoteCents: d.quoteCents, capCents: capFor(d.quoteCents), entryPoint: d.ep, by: d.sawBy,
      // guest said yes on their phone (slide); otherwise staff ticked "Guest saw the price"
      method: d.sawBy === 'guest' ? 'slide' as const : 'staff_saw_price' as const, tab: d.tab,
    };
    const q = this.state.bar.quiet;
    const barPatch: Partial<BarState> = {
      draft: null,
      replies: this.state.bar.replies.filter((r) => r.tab !== d.tab),
      ...(q && q.tab === d.tab ? { quiet: { ...q, seen: true, booked: true } } : {}),
    };
    const common: Partial<DemoState> = {
      forceNoDriver: false,
      confirmations: [...this.state.confirmations, conf],
      bookings: [...this.state.bookings, { rideId: ride.id, at: now }],
    };
    if (isGuestPhone) {
      // Same phone (role switcher): the guest flow shows this ride.
      this.setBar(barPatch, { ...common, ride, dest: d.dest, fault: null, prevQuoteCents: null, overCapAnswer: null, paid: false, quoteCents: d.quoteCents });
    } else {
      const carInfo = d.tab === '4471' ? { car: 'Black Honda Accord', plate: 'KTR-4471', plateSpoken: 'K T R 4 4 7 1', driver: 'Sasha', partner: venue.driver.partner } : GUEST_CAR;
      this.setBar({ ...barPatch, rides: [...this.state.bar.rides, { ...ride, carInfo }] }, common);
    }
    return { ok: true, ride, tab: d.tab, duplicate: false };
  }

  barRebook(rideId: string, partner?: string): Ride | null {
    const now = this.now();
    const car = partner ? OTHER_CAR : REBOOK_CAR;
    const rec = [...this.state.bar.seedRecords, ...this.state.confirmations].reverse().find((c) => c.rideId === rideId);
    const copyRec = (id: string) => (rec ? [...this.state.confirmations, { ...rec, rideId: id }] : this.state.confirmations);
    const r = this.state.ride;
    if (r && r.id === rideId) {
      if (this.stageOf(r) !== 'canceled_by_driver') return null;
      const ride: Ride = { ...r, id: `r-${r.tab}-${now}`, bookedAt: now, terminal: undefined, hold: undefined, pending: false };
      this.set({ ride, fault: null, confirmations: copyRec(ride.id), bookings: [...this.state.bookings, { rideId: ride.id, at: now }] });
      return ride;
    }
    const old = this.state.bar.rides.find((x) => x.id === rideId);
    if (!old || this.stageOf(old) !== 'canceled_by_driver') return null;
    const ride: BarRide = { ...old, id: `r-${old.tab}-${now}`, bookedAt: now, terminal: undefined, carInfo: car };
    this.setBar({ rides: [...this.state.bar.rides.filter((x) => x.id !== rideId), ride] },
      { confirmations: copyRec(ride.id), bookings: [...this.state.bookings, { rideId: ride.id, at: now }] });
    return ride;
  }

  barResendLink(tab: string) {
    this.setBar({ tabs: this.state.bar.tabs.map((t) => (t.tab === tab ? { ...t, linkSentAt: this.now() } : t)) });
  }
  barNewGuest(): string {
    const b = this.state.bar;
    const used = b.tabs.length - venue.bar.tabs.length;
    const g = venue.bar.newGuests[used % venue.bar.newGuests.length];
    const tab = String(b.nextTab);
    this.setBar({ tabs: [...b.tabs, { tab, seat: 'Bar', guest: g.guest, phoneLast4: g.phoneLast4, items: [], close: 'open' }], nextTab: b.nextTab + 1 });
    return tab;
  }
  barCloseTab(tab: string, how: 'closed' | 'held') {
    // SCOPE 22:22: closing with a ride not yet picked up is allowed. The POS shows "Ride pending pickup";
    // the ride line posts and the close completes at pickup, or the tab closes clean on cancel (within the 24 h hold).
    const r = how === 'closed' ? this.barActiveRide(tab) : null;
    const pending = !!r && !isChargedStage(this.stageOf(r));
    const close: BarTab['close'] = pending ? 'pending' : how;
    const extra: Partial<DemoState> = tab === this.guestTab() && how === 'closed' && !pending ? { tabClosed: true } : {};
    this.setBar({ tabs: this.state.bar.tabs.map((t) => (t.tab === tab ? { ...t, close, closeAt: this.now() } : t)) }, extra);
  }
  /** Demo: the driver accepted, then cancelled before pickup. Nothing posts to the tab. */
  driverCancel(rideId?: string) {
    const ok = (r: Ride) => (!rideId || r.id === rideId) && isAcceptedStage(this.stageOf(r)) && !isChargedStage(this.stageOf(r));
    const g = this.state.ride;
    if (g && ok(g)) { this.set({ ride: { ...g, terminal: 'canceled_by_driver', hold: undefined } }); return; }
    if (rideId) this.setBar({ rides: this.state.bar.rides.map((r) => (r.id === rideId && ok(r) ? { ...r, terminal: 'canceled_by_driver' } : r)) });
  }
  barMarkQuietSeen() { const q = this.state.bar.quiet; if (q) this.setBar({ quiet: { ...q, seen: true } }); }
  barSetQuietOption(k: 'sideDoor' | 'oneRider', v: boolean) {
    const q = this.state.bar.quiet;
    if (q) this.setBar({ quiet: { ...q, [k]: v } });
  }
  barSetSetting<K extends keyof BarSettings>(k: K, v: BarSettings[K]) {
    this.setBar({ settings: { ...this.state.bar.settings, [k]: v } });
  }
  barFinishRide(rideId: string) {
    const at = bookedAtFor('complete', this.now());
    if (this.state.ride?.id === rideId) { this.set({ ride: { ...this.state.ride, bookedAt: at, hold: undefined, pending: false } }); return; }
    this.setBar({ rides: this.state.bar.rides.map((r) => (r.id === rideId && !r.terminal ? { ...r, bookedAt: at } : r)) });
  }
  barSetRideScenario(rideId: string, sc: FareScenario) {
    if (this.state.ride?.id === rideId) { this.setFareScenario(sc); return; }
    this.setBar({ rides: this.state.bar.rides.map((r) => (r.id === rideId ? { ...r, scenario: sc } : r)) });
  }

  /** Same as a reload: fresh seed, tab link from the current URL. */
  resetDemoData(urlLink?: UrlLink | null) {
    if (urlLink !== undefined) this.urlLink = urlLink;
    const role = this.state.role;
    this.state = { ...this.fresh(), role };
    this.set({});
  }
}

export type { Address };
