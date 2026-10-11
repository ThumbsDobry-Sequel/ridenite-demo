import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/store/InMemoryStore';
import { UNDO_MS, DEMO_TIMELINE } from '../../src/lib/rideState';
import { venue } from '../../src/venue.config';

function mk(urlLink?: { tab: string; seat: string } | null) {
  let t = 1_000_000;
  const store = new InMemoryStore({ clock: () => t, urlLink });
  return { store, advance: (ms: number) => { t += ms; } };
}

describe('InMemoryStore', () => {
  it('seeds linked to the demo tab with a saved home, nothing booked', () => {
    const { store } = mk();
    const s = store.getState();
    expect(s.linkedTab?.tab).toBe(venue.tabNumber);
    expect(s.savedHome?.line).toBe(venue.guest.home.line);
    expect(s.ride).toBeNull();
    expect(s.bookings).toHaveLength(0);
  });

  it('URL link overrides the seeded tab', () => {
    const { store } = mk({ tab: '9001', seat: 'Bar 3' });
    expect(store.getState().linkedTab).toMatchObject({ tab: '9001', seat: 'Bar 3', via: 'table_qr' });
  });

  it('confirm starts a 10 s undo window; nothing counts as booked until it ends', () => {
    const { store, advance } = mk();
    store.createRide('consent');
    expect(store.stageOf(store.getState().ride!)).toBe('pending');
    advance(UNDO_MS - 1); store.tick();
    expect(store.getState().bookings).toHaveLength(0);
    advance(1); store.tick();
    expect(store.getState().bookings).toHaveLength(1);
    expect(store.getState().consents[0].renderedText).toBe('consent');
    store.tick(); store.tick();
    expect(store.getState().bookings).toHaveLength(1); // commits exactly once
  });

  it('undo inside the window leaves nothing booked', () => {
    const { store, advance } = mk();
    store.createRide('consent');
    advance(5000);
    store.undoRide();
    advance(20_000); store.tick();
    expect(store.getState().ride).toBeNull();
    expect(store.getState().bookings).toHaveLength(0);
    expect(store.hasActiveRide()).toBe(false);
  });

  it('createRide refuses while a ride is active (pending, booked, on the way, here)', () => {
    const { store, advance } = mk();
    const first = store.createRide('a');
    const again = store.createRide('b');
    expect(again.duplicate).toBe(true);
    expect(again.ride?.id).toBe(first.ride?.id);
    advance(UNDO_MS); store.tick();
    for (const k of ['requested', 'en_route', 'near', 'arrived', 'picked_up'] as const) {
      store.releaseHold(k);
      expect(store.createRide('x').duplicate).toBe(true);
    }
    expect(store.getState().bookings).toHaveLength(1);
  });

  it('a new ride is allowed after the previous one completes', () => {
    const { store, advance } = mk();
    store.createRide('a'); advance(UNDO_MS); store.tick();
    advance(DEMO_TIMELINE.complete + 1);
    expect(store.hasActiveRide()).toBe(false);
    const r = store.createRide('b');
    expect(r.duplicate).toBe(false);
    expect(r.refused).toBeUndefined();
  });

  it('refuses to book without a linked open tab', () => {
    const { store } = mk();
    store.unlinkTab();
    const r = store.createRide('a');
    expect(r.refused).toBe('no_tab');
    expect(store.getState().ride).toBeNull();
    store.linkTab({ tab: '4468', seat: 'Table 7', guest: 'Maya R.', via: 'table_qr' });
    expect(store.createRide('a').refused).toBeUndefined();
  });

  it('ride stage follows the booking timestamp', () => {
    const { store, advance } = mk();
    store.createRide('a'); advance(UNDO_MS); store.tick();
    const ride = () => store.getState().ride!;
    expect(store.stageOf(ride())).toBe('requested');
    advance(DEMO_TIMELINE.en_route); expect(store.stageOf(ride())).toBe('en_route');
    advance(DEMO_TIMELINE.near - DEMO_TIMELINE.en_route); expect(store.stageOf(ride())).toBe('near');
    advance(DEMO_TIMELINE.arrived - DEMO_TIMELINE.near); expect(store.stageOf(ride())).toBe('arrived');
  });

  it('faults never stack: each starts from a fresh ride state', () => {
    const { store } = mk();
    store.applyFault('E6');
    expect(store.getState().ride?.terminal).toBe('canceled_by_driver');
    store.applyFault('E4');
    expect(store.getState().ride).toBeNull();
    expect(store.getState().tabClosed).toBe(true);
    store.applyFault('E3');
    expect(store.getState().tabClosed).toBe(false);
    expect(store.stageOf(store.getState().ride!)).toBe('arrived');
    store.applyFault('E2');
    expect(store.getState().ride).toBeNull();
    expect(store.getState()).toMatchObject({ prevQuoteCents: 2100, quoteCents: 2350 });
    store.applyFault('E8');
    expect(store.getState()).toMatchObject({ prevQuoteCents: null, quoteCents: 2100, fareScenario: 'over' });
    store.applyFault('E1');
    expect(store.getState()).toMatchObject({ ride: null, fault: 'E1', fareScenario: 'higher', forceOffline: false });
  });

  it('quote refresh reports a changed price and does not book', () => {
    const { store } = mk();
    expect(store.refreshQuote()).toBe(false);
    store.setPriceMovesOnRefresh(true);
    expect(store.refreshQuote()).toBe(true);
    expect(store.getState().quoteCents).toBe(2350);
    expect(store.getState().ride).toBeNull();
  });

  it('reset is the same as a fresh load', () => {
    const { store } = mk();
    store.createRide('a'); store.unlinkTab(); store.setTip(0);
    store.resetDemoData(null);
    const s = store.getState();
    expect(s.ride).toBeNull();
    expect(s.tipPct).toBe(20);
    expect(s.linkedTab?.tab).toBe(venue.tabNumber);
  });

  it('logs the confirm when the undo window ends (time of the slide, shown quote and cap); line shows only at pickup', async () => {
    const { confirmLine } = await import('../../src/lib/confirmRecord');
    const { store, advance } = mk();
    const slidAt = store.now();
    store.createRide('c', { method: 'slide', by: 'guest', shownQuoteCents: 2100 });
    expect(store.getState().confirmations).toHaveLength(0); // not logged during undo
    expect(store.getState().slides).toHaveLength(1);
    expect(confirmLine(store.getState(), store.getState().ride, store.now())).toBeNull();
    advance(UNDO_MS); store.tick();
    expect(store.getState().confirmations[0]).toMatchObject({ at: slidAt, quoteCents: 2100, capCents: 420, entryPoint: 'guest_request', method: 'slide' });
    // requested, no driver yet: nothing on the tab
    expect(confirmLine(store.getState(), store.getState().ride, store.now())).toBeNull();
    advance(DEMO_TIMELINE.en_route); // driver accepted: still nothing on the tab
    expect(confirmLine(store.getState(), store.getState().ride, store.now())).toBeNull();
    advance(DEMO_TIMELINE.picked_up - DEMO_TIMELINE.en_route); // picked up: record and fare line together
    expect(confirmLine(store.getState(), store.getState().ride, store.now())?.text).toMatch(/^Confirmed by guest, \d{1,2}:\d{2} [AP]M$/);
  });

  it('no driver can accept during the undo window', () => {
    const { store, advance } = mk();
    store.createRide('c', { method: 'slide' });
    advance(UNDO_MS - 1);
    expect(store.stageOf(store.getState().ride!)).toBe('pending');
  });

  it('charge at pickup: requested and accepted have no ride line; picked up does', async () => {
    const { morningFor } = await import('../../src/lib/morning');
    const { store, advance } = mk();
    store.createRide('c', { method: 'slide' });
    advance(UNDO_MS); store.tick();
    expect(morningFor(store.getState(), store.now()).hasRide).toBe(false);
    expect(morningFor(store.getState(), store.now()).rideCents).toBe(0);
    advance(DEMO_TIMELINE.arrived); // accepted and the car is here, not picked up yet
    expect(morningFor(store.getState(), store.now()).hasRide).toBe(false);
    expect(morningFor(store.getState(), store.now()).rideCents).toBe(0);
    advance(DEMO_TIMELINE.picked_up - DEMO_TIMELINE.arrived);
    expect(morningFor(store.getState(), store.now()).hasRide).toBe(true);
    expect(morningFor(store.getState(), store.now()).rideCents).toBeGreaterThan(0);
  });

  it('no driver found: no charge line; receipt reads "Requested by guest, <slide time>. No driver found. Not charged."', async () => {
    const { morningFor } = await import('../../src/lib/morning');
    const { noDriverLine, confirmLine, fmtET } = await import('../../src/lib/confirmRecord');
    const { NO_DRIVER_MS } = await import('../../src/lib/rideState');
    const { store, advance } = mk();
    store.setForceNoDriver(true);
    const slidAt = store.now();
    store.createRide('c', { method: 'slide' });
    advance(UNDO_MS); store.tick();
    advance(NO_DRIVER_MS);
    const s = store.getState();
    expect(store.stageOf(s.ride!)).toBe('no_cars');
    const m = morningFor(s, store.now());
    expect(m.hasRide).toBe(false);
    expect(m.noDriver).toBe(true);
    expect(m.totalCents).toBe(6419);
    expect(confirmLine(s, s.ride, store.now())).toBeNull();
    expect(noDriverLine(s, s.ride, store.now())).toBe(`Requested by guest, ${fmtET(slidAt)}. No driver found. Not charged.`);
  });

  it('keep looking within 5 minutes searches again; past 5 minutes needs a new price and a new slide', () => {
    const { store, advance } = mk();
    store.setForceNoDriver(true);
    store.createRide('c', { method: 'slide' });
    advance(UNDO_MS); store.tick();
    advance(25_000);
    expect(store.keepLooking()).toBe('looking');
    expect(store.stageOf(store.getState().ride!)).toBe('requested');
    advance(DEMO_TIMELINE.en_route);
    expect(store.stageOf(store.getState().ride!)).toBe('en_route'); // a driver accepts this time
    // stale: forced no driver again, then wait past 5 minutes
    const { store: s2, advance: adv2 } = mk();
    s2.setForceNoDriver(true);
    s2.createRide('c', { method: 'slide' });
    adv2(UNDO_MS); s2.tick();
    adv2(5 * 60_000 + 1);
    expect(s2.keepLooking()).toBe('stale');
    expect(s2.getState().ride).toBeNull(); // never rebooked silently
    expect(s2.getState().bookings).toHaveLength(1);
  });

  it('forced stale quote: Keep looking shows the new price ($23.50) and clears the ride', () => {
    const { store, advance } = mk();
    store.setForceNoDriver(true);
    store.createRide('c', { method: 'slide' });
    advance(UNDO_MS); store.tick();
    advance(25_000);
    store.setForceStaleQuote(true);
    expect(store.keepLooking()).toBe('stale');
    expect(store.getState().quoteCents).toBe(2350);
    expect(store.getState().prevQuoteCents).toBe(2100);
  });

  it('undone confirm: no record line, no ride on the tab', async () => {
    const { confirmLine } = await import('../../src/lib/confirmRecord');
    const { morningFor } = await import('../../src/lib/morning');
    const { store } = mk();
    store.createRide('c', { method: 'slide' });
    store.undoRide();
    expect(confirmLine(store.getState())).toBeNull();
    const m = morningFor(store.getState());
    expect(m.hasRide).toBe(false);
    expect(m.rideCents).toBe(0);
    expect(m.totalCents).toBe(6419);
  });

  it('staff booking reads "Booked by staff, price shown to guest"', async () => {
    const { confirmLine } = await import('../../src/lib/confirmRecord');
    const { store, advance } = mk();
    store.createRide('s', { method: 'staff_saw_price', by: 'staff' });
    advance(UNDO_MS); store.tick(); advance(DEMO_TIMELINE.picked_up);
    expect(confirmLine(store.getState(), store.getState().ride, store.now())?.text).toMatch(/^Booked by staff, price shown to guest, /);
  });

  it('driver accepts then cancels: nothing posts; "Requested by guest, <slide time>. Driver cancelled. Not charged."', async () => {
    const { morningFor } = await import('../../src/lib/morning');
    const { noDriverLine, confirmLine, fmtET } = await import('../../src/lib/confirmRecord');
    const { store, advance } = mk();
    const slidAt = store.now();
    store.createRide('c', { method: 'slide' });
    advance(UNDO_MS); store.tick();
    store.driverCancel(); // not accepted yet: ignored
    expect(store.stageOf(store.getState().ride!)).toBe('requested');
    advance(DEMO_TIMELINE.near);
    store.driverCancel();
    const s = store.getState();
    expect(store.stageOf(s.ride!)).toBe('canceled_by_driver');
    const m = morningFor(s, store.now());
    expect(m.hasRide).toBe(false);
    expect(m.rideCents).toBe(0);
    expect(m.totalCents).toBe(6419);
    expect(confirmLine(s, s.ride, store.now())).toBeNull();
    expect(noDriverLine(s, s.ride, store.now())).toBe(`Requested by guest, ${fmtET(slidAt)}. Driver cancelled. Not charged.`);
  });

  it('driver cancel after pickup does nothing (already charged)', () => {
    const { store, advance } = mk();
    store.createRide('c', { method: 'slide' });
    advance(UNDO_MS); store.tick(); advance(DEMO_TIMELINE.picked_up);
    store.driverCancel();
    expect(store.stageOf(store.getState().ride!)).toBe('picked_up');
  });

  it('seeded tab opened within 24 h of the hold deadline, deadline ahead of the clock', async () => {
    const { holdDeadline, HOLD_WINDOW_MS } = await import('../../src/lib/hold');
    const { store } = mk();
    const s = store.getState();
    const d = holdDeadline(s.tabOpenedAt);
    expect(d).toBeGreaterThan(store.now());
    expect(d - s.tabOpenedAt).toBeLessThanOrEqual(HOLD_WINDOW_MS);
  });
});
