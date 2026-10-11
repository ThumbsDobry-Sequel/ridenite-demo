import { describe, expect, it } from 'vitest';
import { venue } from '../../src/venue.config';
import { DEMO_TIMELINE, TRIP_MS, stageAt } from '../../src/lib/rideState';
import { sampleNightTimes } from '../../src/lib/night';
import { InMemoryStore } from '../../src/store/InMemoryStore';

describe('round 3: one story source (venue.etaMinutes, venue.tripMinutes)', () => {
  it('pickup is etaMinutes after booking and drop-off tripMinutes after pickup (6 min, 14 min)', () => {
    expect(venue.etaMinutes).toBe(6);
    expect(DEMO_TIMELINE.picked_up).toBe(venue.etaMinutes * 60_000);
    expect(TRIP_MS).toBe(venue.tripMinutes * 60_000);
    expect(DEMO_TIMELINE.near).toBeLessThan(DEMO_TIMELINE.arrived);
    expect(DEMO_TIMELINE.arrived).toBeLessThan(DEMO_TIMELINE.picked_up);
  });
  it('sample night uses the same gaps', () => {
    const now = Date.UTC(2026, 9, 11, 3, 30);
    const t = sampleNightTimes(now - 4 * 3600_000, now);
    expect(t.pickedUp - t.booked).toBe(venue.etaMinutes * 60_000);
    expect(t.complete - t.pickedUp).toBe(venue.tripMinutes * 60_000);
  });
  it('seeded bar rides: varied times and fares, each at the stage it is labeled with', () => {
    const now = Date.UTC(2026, 9, 11, 3, 26);
    for (const r of venue.bar.seededRides) expect(stageAt(now - r.agoSec * 1000, now), r.tab).toBe(r.stage);
    expect(new Set(venue.bar.seededRides.map((r) => r.agoSec)).size).toBe(venue.bar.seededRides.length);
    expect(new Set(venue.bar.seededRides.map((r) => r.quoteCents)).size).toBe(venue.bar.seededRides.length);
    expect(venue.bar.seededRides.filter((r) => r.stage === 'en_route').length).toBeLessThanOrEqual(1);
    expect(venue.bar.earlierHistory.length).toBe(venue.bar.earlierRidesTonight);
  });
  it('Demo: next status jumps the phone clock to each stage start, so drop-off is never after the clock', () => {
    let t = Date.UTC(2026, 9, 11, 3, 26, 5);
    let skew = 0;
    const store = new InMemoryStore({ clock: () => t, onSkew: (s: number) => { skew = s; } } as any);
    store.createRide('consent');
    t += 10_500; store.tick();
    const r0 = store.getState().ride!;
    for (let i = 0; i < 6; i++) store.advanceRide();
    const r = store.getState().ride!;
    expect(store.stageOf(r)).toBe('complete');
    expect(store.now()).toBeGreaterThanOrEqual(r0.bookedAt + DEMO_TIMELINE.complete);
    expect(skew).toBe(store.now() - t);
  });
});
