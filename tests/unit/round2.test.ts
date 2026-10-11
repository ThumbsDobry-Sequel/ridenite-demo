import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { lintText } from '../../scripts/copy-lint.mjs';
import { InMemoryStore } from '../../src/store/InMemoryStore';
import { receiptRideId, rideRefFor } from '../../src/lib/checkLines';
import { sampleOwnerStatement, sampleTrafficRide } from '../../src/lib/ownerData';
import { venue } from '../../src/venue.config';
import { DEMO_TIMELINE, TRIP_MS, dropOffAt, pickupAt } from '../../src/lib/rideState';

const SAT = Date.parse('2026-10-11T03:30:50Z'); // Sat Oct 10, 11:30 PM ET

describe('round 2 copy lint (Oct 11)', () => {
  it("'drinks' wording and street addresses fail lint; the code token 'drink' passes", () => {
    for (const t of ['Tip is on drinks and food', 'Questions about drinks or food go to the bar', 'No drink counts', '2900 Wilson Blvd, Suite 104', '655 N Harrison St', 'Arlington, VA 22201'])
      expect(lintText(t).length, t).toBeGreaterThan(0);
    for (const t of ["kind: 'drink'", 'Questions about your bar tab go to Maison Cheryl.', 'Tip is on food and items', 'Home, Westover area', 'Maison Cheryl, Clarendon area'])
      expect(lintText(t), t).toEqual([]);
  });
  it('rendered copy golden has no drinks wording and no street address', () => {
    const g = readFileSync(new URL('../golden/copy-snapshot.json', import.meta.url), 'utf8');
    expect(g).not.toMatch(/\bdrinks?\b/i);
    expect(g).not.toMatch(/\b\d{2,5} (?:[NSEW] )?[A-Z][a-z]+ (?:St|Blvd|Ave|Dr|Rd|Pike)\b|\b(VA|DC) \d{5}\b/);
  });
});

describe('stable demo ride IDs (Oct 11)', () => {
  it("the standard night's ride is always venue.sampleRideId; a rebook gets its own ID", () => {
    let t = SAT;
    const store = new InMemoryStore({ clock: () => t });
    store.linkTab({ tab: venue.tabNumber, seat: venue.seat, guest: venue.guest.name, via: 'table_qr' } as never);
    store.createRide('consent');
    t += 11_000; store.tick();
    const s = store.getState();
    expect(receiptRideId(s)).toBe(venue.sampleRideId);
    expect(rideRefFor({ id: 'r-4468-other', tab: '4468' }, s)).not.toBe(venue.sampleRideId);
    expect(rideRefFor({ id: 'r-4471-1', tab: '4471' }, s)).toMatch(/^RN-[0-9A-Z]{6}$/);
  });
  it('sample traffic ride is RN-NHMCXN on Fri Oct 9; statement credits reconcile', () => {
    for (const now of [SAT, Date.parse('2026-10-11T13:00:00Z')]) {
      const t = sampleTrafficRide(now);
      expect(t.rideId).toBe('RN-NHMCXN');
      expect(t.recon.declinedCents).toBe(310);
      const st = sampleOwnerStatement(now);
      const credit = st.quoteCredits.filter((c) => c.creditedCents > 0);
      expect(credit.map((c) => [c.rideId, c.creditedCents])).toEqual([['RN-NHMCXN', 310]]);
      expect(credit[0].line).toBe('Quote adjustment credit, ride RN-NHMCXN, Oct 9: -$3.10');
      const ids = new Set(st.rides.map((r) => r.rideId));
      for (const f of st.feeReturns) expect(ids.has(f.rideId)).toBe(true);
      expect(st.feeReturnsCents + st.quoteCreditsCents).toBe(st.feeReturns.reduce((a, f) => a + f.cents, 0) - 310);
    }
  });
});

describe('believable trip (Oct 11)', () => {
  it('drop-off is 14 min after pickup, also after skipping the trip', () => {
    expect(TRIP_MS).toBe(14 * 60_000);
    const r = { bookedAt: SAT };
    expect(dropOffAt(r) - pickupAt(r)).toBe(14 * 60_000);
    const skipped = { bookedAt: SAT - DEMO_TIMELINE.complete + 5_000, pickedUpAt: SAT + 60_000 };
    expect(dropOffAt(skipped)).toBe(SAT + 60_000 + TRIP_MS);
  });
});
