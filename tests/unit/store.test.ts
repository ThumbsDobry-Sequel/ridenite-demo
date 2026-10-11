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
    store.applyFault('E7');
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
});
