import { describe, expect, it } from 'vitest';
import { chargeAt, etWallToUtc, fmtDeadline, holdDeadline, holdText, HOLD_WINDOW_MS } from '../../src/lib/hold';
import { drinkTimes, nightDate, nightLabel, sampleNightTimes, seededTabOpen } from '../../src/lib/night';
import { nightTagline } from '../../src/lib/brand';
import { InMemoryStore } from '../../src/store/InMemoryStore';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { barRideLineName, neighborhood, tabCloseState, tabTotals, tabItems } from '../../src/lib/tab';
import { fmtET } from '../../src/lib/confirmRecord';
import { venue } from '../../src/venue.config';

const ET = (iso: string) => new Date(iso).getTime();

describe('next 11:00 AM ET helper', () => {
  it('9:00 AM -> same day 11:00 AM; exactly 11:00 AM -> next day; DST fall back handled', () => {
    expect(holdDeadline(etWallToUtc(2026, 10, 10, 9))).toBe(etWallToUtc(2026, 10, 10, 11));
    expect(holdDeadline(etWallToUtc(2026, 10, 10, 11))).toBe(etWallToUtc(2026, 10, 11, 11));
    expect(holdDeadline(ET('2026-11-01T02:00:00Z'))).toBe(ET('2026-11-01T16:00:00Z'));
    expect(fmtDeadline(ET('2026-11-01T16:00:00Z'))).toBe('Sun, Nov 1 at 11:00 AM');
  });
});

/**
 * Acceptance (SCOPE 22:28): seeding relative to now. Tab opens now - 4 h (to the minute); booking at now;
 * charge = next 11:00 AM ET if future and < 24 h after open, else the latest whole hour >= 1 h before open + 24 h.
 */
const CASES: [string, string, string, string][] = [
  // [label, now ISO, heading date, charge text]
  ['Sat Oct 10, 2:00 PM', '2026-10-10T18:00:00Z', 'Saturday, Oct 10', 'charged Sun, Oct 11 at 9:00 AM'],
  ['Sat Oct 10, 11:00 PM', '2026-10-11T03:00:00Z', 'Saturday, Oct 10', 'charged Sun, Oct 11 at 11:00 AM'],
  ['Sun Oct 11, 1:00 AM', '2026-10-11T05:00:00Z', 'Saturday, Oct 10', 'charged Sun, Oct 11 at 11:00 AM'],
  ['Sun Oct 11, 5:59 AM', '2026-10-11T09:59:00Z', 'Saturday, Oct 10', 'charged Sun, Oct 11 at 11:00 AM'],
  ['Sun Oct 11, 11:30 AM', '2026-10-11T15:30:00Z', 'Sunday, Oct 11', 'charged Mon, Oct 12 at 6:00 AM'],
  ['month boundary: Sat Oct 31, 11:00 PM (DST ends next morning)', '2026-11-01T03:00:00Z', 'Saturday, Oct 31', 'charged Sun, Nov 1 at 11:00 AM'],
  ['month and year boundary: Fri Jan 1 2027, 12:30 AM', '2027-01-01T05:30:00Z', 'Thursday, Dec 31', 'charged Fri, Jan 1 at 11:00 AM'],
];

describe('date and charge acceptance (mocked clock, America/New_York)', () => {
  for (const [label, iso, heading, charge] of CASES) {
    it(label, () => {
      let t = ET(iso);
      const store = new InMemoryStore({ clock: () => t });
      const s0 = store.getState();
      const open = s0.tabOpenedAt;
      expect(open).toBe(seededTabOpen(t));
      expect(open % 60_000).toBe(0);
      expect(Math.abs(t - 4 * 3600_000 - open)).toBeLessThan(60_000);
      // the live booking happens at now
      store.createRide('c', { method: 'slide', by: 'guest', shownQuoteCents: 2100 });
      const booking = store.getState().slides[0].at;
      expect(open).toBeLessThan(booking);
      expect(booking).toBeLessThanOrEqual(t);
      // drinks and sample times fall between open and now
      for (const d of drinkTimes(open, t, 4)) { expect(d).toBeGreaterThan(open); expect(d).toBeLessThan(t); }
      const sn = sampleNightTimes(open, t);
      for (const x of [sn.booked, sn.pickedUp, sn.complete]) { expect(x).toBeGreaterThan(open); expect(x).toBeLessThanOrEqual(t); }
      // charge in the future and less than 24 h after open
      const c = chargeAt(open, t);
      expect(c).toBeGreaterThan(t);
      expect(c - open).toBeLessThan(HOLD_WINDOW_MS);
      expect(holdText(open, t)).toBe(charge);
      expect(holdText(open, t)).not.toMatch(/today|tomorrow/i);
      // heading uses the night date (6:00 AM cutoff)
      expect(nightLabel(t)).toBe(heading);
      expect(nightTagline(true, t)).toBe(`${heading}. Tab closed. Ride home on your tab.`);
      expect(nightTagline(false, t)).toBeNull();
    });
  }

  it('6:00 AM starts a new night date; 5:59 AM does not', () => {
    expect(nightDate(ET('2026-10-11T09:59:00Z'))).toEqual({ y: 2026, m: 10, d: 10 });
    expect(nightDate(ET('2026-10-11T10:00:00Z'))).toEqual({ y: 2026, m: 10, d: 11 });
  });

  it('every 15 minutes for two days: charge in the future, < 24 h after open, whole hour, never today/tomorrow', () => {
    for (let i = 0; i < 192; i++) {
      const now = ET('2026-10-10T04:00:00Z') + i * 15 * 60_000;
      const open = seededTabOpen(now);
      const c = chargeAt(open, now);
      expect(c).toBeGreaterThan(now);
      expect(c - open).toBeLessThan(HOLD_WINDOW_MS);
      expect(c % 3600_000).toBe(0);
      expect(holdText(open, now)).toMatch(/^charged (Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2} at \d{1,2}:00 [AP]M$/);
    }
  });
});

describe('receipt line and copy', () => {
  const files = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : [p]; });
  const src = files('src').filter((f) => /\.(tsx?|css|html)$/.test(f)).map((f) => [f, readFileSync(f, 'utf8')] as const);
  it('the bare marketing tagline "Tab closed. Ride booked." is not used anywhere in the app', () => {
    for (const [f, t] of src) expect(t.includes('Tab closed. Ride booked.'), f).toBe(false);
  });
  it('no "included", "free" or "on us" in guest ride copy strings', () => {
    for (const [f, t] of src) {
      const strings = t.match(/(['"`])(?:(?!\1).)*\1|>[^<>{}]+</g) ?? [];
      for (const x of strings) expect(/\bon us\b|\bincluded\b|\bfree ride|\bride (is )?free\b/i.test(x), `${f}: ${x}`).toBe(false);
    }
  });
});

describe('bar POS tab line', () => {
  it('neighborhood from the drop-off area', () => {
    expect(neighborhood('Clarendon, Arlington, VA 22201')).toBe('Clarendon');
    expect(neighborhood('Westover, Arlington, VA 22205')).toBe('Westover');
    expect(neighborhood('601 F St NW, Washington, DC')).toBe('Washington');
  });
  it('"RideNite car home, Clarendon area, 11:52 PM" and no guest record on the line', () => {
    const at = ET('2026-10-10T03:52:00Z');
    const name = barRideLineName({ area: 'Clarendon, Arlington, VA 22201' }, at, fmtET);
    expect(name).toBe('RideNite car home, Clarendon area, 11:52 PM');
    const t = tabTotals({ items: tabItems([['Old Fashioned', 1]] as [string, number][]), taxRate: venue.taxRate, tabLineName: 'Courtesy car', rideLineName: name, ride: { quoteCents: 2100, finalCents: null } });
    const l = t.lines.find((x) => x.type === 'ride_quote')!;
    expect(l.name).toBe(name);
    expect(l.name).not.toMatch(/Confirmed by guest/);
  });
});

describe('tab close with a ride pending pickup', () => {
  const now = 1_000_000_000;
  const t = { close: 'pending' as const, closeAt: now - 60_000 };
  it('stays pending while the ride is requested, on the way, or the car is here', () => {
    for (const st of ['pending', 'requested', 'en_route', 'near', 'arrived']) expect(tabCloseState(t, st, now)).toBe('pending');
  });
  it('finishes closing at pickup', () => {
    expect(tabCloseState(t, 'picked_up', now)).toBe('closed');
    expect(tabCloseState(t, 'complete', now)).toBe('closed');
  });
  it('closes clean on cancel or no driver', () => {
    for (const st of ['canceled_by_driver', 'no_cars', 'canceled_by_guest', null]) expect(tabCloseState(t, st, now)).toBe('closed');
  });
  it('never waits past the 24 h POS hold', () => {
    expect(tabCloseState({ close: 'pending', closeAt: now - HOLD_WINDOW_MS }, 'en_route', now)).toBe('closed');
  });
  it('open and held are unchanged', () => {
    expect(tabCloseState({ close: 'open' }, 'en_route', now)).toBe('open');
    expect(tabCloseState({ close: 'held' }, 'en_route', now)).toBe('held');
  });
});


describe('venue words and date settings live in venue.config.ts (Maison Cheryl values)', () => {
  it('bars only: tab and bartender; heading; 6:00 AM cutoff; 24 h hold', async () => {
    const { venue: v, T } = await import('../../src/venue.config');
    expect(T).toMatchObject({ bill: 'tab', Bill: 'Tab', staff: 'bartender' });
    expect(v.nightHeading).toBe('Your night, in one place');
    expect(v.nightCutoffHour).toBe(6);
    expect(v.holdHours).toBe(24);
    expect(HOLD_WINDOW_MS).toBe(24 * 3600_000);
  });
});

describe('morning heading "Night of ..." follows the night-date rule (6:00 AM cutoff) on the tab-open time', () => {
  it('viewed Sat 10:52 PM ET and Sun 9:30 AM ET both read "Night of Sat, Oct 10"', async () => {
    const { nightOfHeading, seededTabOpen } = await import('../../src/lib/night');
    const sat1052 = Date.parse('2026-10-11T02:52:00Z'); // tab opened Sat 6:52 PM
    const sun0930 = Date.parse('2026-10-11T13:30:00Z'); // tab opened Sun 5:30 AM, before the 6:00 AM cutoff
    expect(nightOfHeading(seededTabOpen(sat1052))).toBe('Night of Sat, Oct 10');
    expect(nightOfHeading(seededTabOpen(sun0930))).toBe('Night of Sat, Oct 10');
    // the cutoff itself
    expect(nightOfHeading(Date.parse('2026-10-11T09:59:00Z'))).toBe('Night of Sat, Oct 10'); // Sun 5:59 AM
    expect(nightOfHeading(Date.parse('2026-10-11T10:00:00Z'))).toBe('Night of Sun, Oct 11'); // Sun 6:00 AM
  });
});
