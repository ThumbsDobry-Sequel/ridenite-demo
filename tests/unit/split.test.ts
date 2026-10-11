import { describe, expect, it } from 'vitest';
import { InMemoryStore } from '../../src/store/InMemoryStore';
import { morningFor } from '../../src/lib/morning';
import { checkLines, rideLinesOnly, barLinesOnly, rideRef, splitSubtotals, receiptRideId } from '../../src/lib/checkLines';
import { tabItems, tabTotals } from '../../src/lib/tab';
import { venue } from '../../src/venue.config';
import type { FareScenario } from '../../src/lib/fare';
import { etWallToUtc } from '../../src/lib/hold';
const et0 = (y: number, m: number, d: number, h: number, min = 0) => etWallToUtc(y, m, d, h, min);
import { PayoutReturnError, payoutReturnCents, payoutReturnEligible, addBusinessDays, evidenceDueBy, businessDaysBetween, payoutReturnLine, statementFootnote, returnWindowEnds, returnWindowStatus, ymdIso, returnWindowClosesAt } from '../../src/lib/payouts';

const T0 = Date.parse('2026-10-11T02:30:00Z');

function stateFor(scen: FareScenario, answer: 'yes' | 'no' | null, tip = 20) {
  const st = new InMemoryStore({ clock: () => T0 });
  st.setFareScenario(scen); st.setOverCapAnswer(answer); st.setTip(tip);
  return st.getState();
}

describe('bar vs RideNite split (SCOPE 23:01)', () => {
  it('P9 over-cap approved: Bar sales $64.19 + RideNite rides $27.40 = $91.59 exactly, in cents', () => {
    const s = stateFor('over', 'yes');
    const m = morningFor(s, T0);
    const lines = checkLines(s, m);
    const sp = splitSubtotals(lines);
    expect(sp.barCents).toBe(6419);
    expect(sp.rideCents).toBe(2740);
    expect(sp.totalCents).toBe(9159);
    expect(sp.barCents + sp.rideCents).toBe(m.totalCents);
    // ride lines: quote $21.00, adjustment within the cap $4.20, approved stop $2.20
    expect(rideLinesOnly(lines).map((l) => [l.type, l.cents])).toEqual([['ride_quote', 2100], ['ride_adjustment', 420], ['ride_stop', 220]]);
  });

  it('tax and tip are bar lines only; every line carries a kind; ride lines carry the ride ID', () => {
    const s = stateFor('over', 'yes');
    const lines = checkLines(s, morningFor(s, T0));
    for (const l of lines) expect(['bar', 'ride']).toContain(l.kind);
    expect(lines.filter((l) => l.type === 'tax' || l.type === 'tip').every((l) => l.kind === 'bar')).toBe(true);
    expect(barLinesOnly(lines).some((l) => l.rideId)).toBe(false);
    for (const l of rideLinesOnly(lines)) expect(l.rideId).toMatch(/^RN-[0-9A-Z]{6}$/);
    expect(receiptRideId(s)).toBe(venue.sampleRideId);
  });

  it('subtotals always sum to the check across every fare scenario, answer and tip', () => {
    for (const scen of ['higher', 'lower', 'equal', 'over'] as FareScenario[])
      for (const ans of [null, 'yes', 'no'] as const)
        for (const tip of venue.tipOptions) {
          const s = stateFor(scen, ans, tip);
          const m = morningFor(s, T0);
          const sp = splitSubtotals(checkLines(s, m));
          expect(sp.totalCents, `${scen}/${ans}/${tip}`).toBe(m.totalCents);
          expect(sp.rideCents, `${scen}/${ans}/${tip}`).toBe(m.rideCents);
          expect(sp.barCents).toBe(m.tipBaseCents + m.taxCents + m.tipCents);
        }
  });

  it('rideRef: fictional RN-xxxxxx, stable per ride, different across rides', () => {
    expect(rideRef('r-4468-1')).toMatch(/^RN-[0-9A-Z]{6}$/);
    expect(rideRef('r-4468-1')).toBe(rideRef('r-4468-1'));
    expect(rideRef('r-4468-1')).not.toBe(rideRef('r-4468-2'));
  });

  it('bar tab lines (B6) carry kind bar or ride; ride lines carry the ride ID; evidence pack can filter ride lines', () => {
    const t = tabTotals({ items: tabItems([['Table snacks', 1]]), taxRate: venue.taxRate, tabLineName: 'Courtesy car', ride: { quoteCents: 2100, finalCents: 2460, rideId: 'RN-ABC123' } });
    expect(t.lines.filter((l) => l.kind === 'bar').map((l) => l.type)).toEqual(['item', 'tax']);
    const ride = t.lines.filter((l) => l.kind === 'ride');
    expect(ride.map((l) => l.type)).toEqual(['ride_quote', 'ride_adjustment']);
    expect(ride.every((l) => l.rideId === 'RN-ABC123')).toBe(true);
  });
});

describe('both sample-night variants, in cents (SCOPE 23:05)', () => {
  it('standard night (no stop): Bar sales $64.19 + RideNite rides $24.60 = $88.79', () => {
    const s = stateFor('higher', null);
    const m = morningFor(s, T0);
    const sp = splitSubtotals(checkLines(s, m));
    expect([sp.barCents, sp.rideCents, sp.totalCents]).toEqual([6419, 2460, 8879]);
    expect(sp.barCents + sp.rideCents).toBe(m.totalCents);
    expect(rideLinesOnly(checkLines(s, m)).some((l) => l.type === 'ride_stop')).toBe(false);
  });
  it('approved-stop night: Bar sales $64.19 + RideNite rides $27.40 = $91.59', () => {
    const s = stateFor('over', 'yes');
    const m = morningFor(s, T0);
    const sp = splitSubtotals(checkLines(s, m));
    expect([sp.barCents, sp.rideCents, sp.totalCents]).toEqual([6419, 2740, 9159]);
    expect(sp.barCents + sp.rideCents).toBe(m.totalCents);
  });
});

describe('owner preview data model (no UI yet)', () => {
  it('evidence pack holds ride lines only, grouped by ride ID, labeled Sample data', async () => {
    const { evidencePack } = await import('../../src/lib/ownerData');
    const pack = evidencePack(stateFor('over', 'yes'), T0);
    expect(pack[0].returnWindowEnds).toBe('2027-01-08'); // sample pickup Sat Oct 10, 10:04 PM ET + 90 days
    expect(pack[0].status).toBe('Return window open until Jan 8');
    expect(pack).toHaveLength(1);
    expect(pack[0].label).toBe('Sample data');
    expect(pack[0].rideId).toBe(venue.sampleRideId);
    expect(pack[0].lines.every((l) => l.kind === 'ride')).toBe(true);
    expect(pack[0].rideCents).toBe(2740);
  });
  it('monthly statement splits Bar sales and RideNite rides, sums exactly, has no payout-return line', async () => {
    const { monthlyStatement } = await import('../../src/lib/ownerData');
    const a = stateFor('higher', null), b = stateFor('over', 'yes');
    const st = monthlyStatement('October 2026', [
      { night: 'Sat, Oct 10', lines: checkLines(a, morningFor(a, T0)) },
      { night: 'Sat, Oct 17', lines: checkLines(b, morningFor(b, T0)) },
    ]);
    expect(st.label).toBe('Sample data');
    expect(st.barSalesCents).toBe(6419 * 2);
    expect(st.rideNiteRidesCents).toBe(2460 + 2740);
    expect(st.totalCents).toBe(8879 + 9159);
    expect(st.rows.map((r) => r.rides.length)).toEqual([1, 1]);
    expect(JSON.stringify(st)).not.toMatch(/reimburs|refund|payoutReturn|returnCents|payout_return/i);
    for (const r of st.rows) expect(Object.keys(r).sort()).toEqual(['barCents', 'night', 'rideCents', 'rides', 'totalCents']);
    expect(Object.keys(st).sort()).toEqual(['barSalesCents', 'label', 'month', 'rideNiteRidesCents', 'rows', 'totalCents']);
  });
});

describe('payout return window: pickup date (ET) + 90 calendar days; dispute notice: + 3 business days', () => {
  const et = (y: number, m: number, d: number, h: number, min = 0) => etWallToUtc(y, m, d, h, min);
  it('config: 90 calendar days; no fixed forwarding deadline in config; fee $1.00', () => {
    expect(venue.payoutReturnWindowDays).toBe(90);
    expect('disputeNoticeBusinessDays' in venue).toBe(false);
    expect(venue.perRideFeeCents).toBe(100);
  });
  it('an Oct 10 ride: chip reads "Return window open until Jan 8"', () => {
    const end = returnWindowEnds(et(2026, 10, 10, 22, 4));
    expect(returnWindowStatus(end, et(2026, 10, 11, 9, 0))).toBe('Return window open until Jan 8');
  });
  it('sample Saturday ride (Sat Oct 10, 10:04 PM ET) ends Fri Jan 8, 2027', () => expect(ymdIso(returnWindowEnds(et(2026, 10, 10, 22, 4)))).toBe('2027-01-08'));
  it('Saturday-night ride picked up after midnight (Sun Oct 11, 12:40 AM ET) counts from Sunday: Sat Jan 9, 2027', () => expect(ymdIso(returnWindowEnds(et(2026, 10, 11, 0, 40)))).toBe('2027-01-09'));
  it('ET date, not UTC: Fri Oct 9, 9:30 PM ET (Sat 01:30 UTC) counts from Friday: Thu Jan 7, 2027', () => expect(ymdIso(returnWindowEnds(Date.parse('2026-10-10T01:30:00Z')))).toBe('2027-01-07'));
  it('month and year boundaries; leap year Feb', () => {
    expect(ymdIso(returnWindowEnds(et(2026, 11, 30, 22, 0)))).toBe('2027-02-28');
    expect(ymdIso(returnWindowEnds(et(2027, 12, 1, 22, 0)))).toBe('2028-02-29');
  });
  it('status: open through the end day ET, then "Payout final"', () => {
    const end = { y: 2027, m: 1, d: 8 };
    expect(returnWindowStatus(end, et(2026, 10, 11, 9, 0))).toBe('Return window open until Jan 8');
    expect(returnWindowStatus(end, et(2027, 1, 8, 23, 59))).toBe('Return window open until Jan 8');
    expect(returnWindowClosesAt(end)).toBe(et(2027, 1, 9, 0, 0));
    expect(returnWindowStatus(end, et(2027, 1, 9, 0, 0))).toBe('Payout final');
  });
  it('business-day helper: Fri + 3 -> Wed; Sat + 3 -> Wed; month boundary Thu Oct 29 + 3 -> Tue Nov 3; year boundary', () => {
    expect(ymdIso(addBusinessDays(et(2026, 10, 9, 15, 0), 3))).toBe('2026-10-14');
    expect(ymdIso(addBusinessDays(et(2026, 10, 10, 15, 0), 3))).toBe('2026-10-14');
    expect(ymdIso(addBusinessDays(et(2026, 10, 29, 15, 0), 3))).toBe('2026-11-03');
    expect(ymdIso(addBusinessDays(et(2026, 12, 31, 12, 0), 3))).toBe('2027-01-05');
    expect(businessDaysBetween({ y: 2026, m: 10, d: 9 }, { y: 2026, m: 10, d: 14 })).toBe(3);
  });
  it('bar tab (B6) ride lines carry returnWindowEnds when the pickup time is known; bar lines never do', () => {
    const t = tabTotals({ items: tabItems([['Table snacks', 1]]), taxRate: venue.taxRate, tabLineName: 'Courtesy car', ride: { quoteCents: 2100, finalCents: 2460, rideId: 'RN-ABC123', pickupMs: et(2026, 10, 9, 23, 15) } });
    expect(t.lines.filter((l) => l.kind === 'ride').every((l) => l.returnWindowEnds === '2027-01-07')).toBe(true);
    expect(t.lines.filter((l) => l.kind === 'bar').some((l) => l.returnWindowEnds)).toBe(false);
  });
});

describe('payout return eligibility: keyed on the processor dispute notice date (SCOPE 23:07)', () => {
  const et = (y: number, m: number, d: number, h: number, min = 0) => etWallToUtc(y, m, d, h, min);
  const pickupMs = et(2026, 10, 10, 22, 4); // window ends Fri Jan 8, 2027
  const deadline = et(2027, 2, 1, 23, 59);
  it('notice on day 90 (Jan 8) with evidence filed before the deadline: eligible', () =>
    expect(payoutReturnEligible({ pickupMs, outcome: 'dispute_lost', noticeMs: et(2027, 1, 8, 23, 30), evidenceFiledMs: et(2027, 1, 20, 12, 0), processorDeadlineMs: deadline })).toBe(true));
  it('notice on day 91 (Jan 9): not eligible, even with evidence on time', () =>
    expect(payoutReturnEligible({ pickupMs, outcome: 'dispute_lost', noticeMs: et(2027, 1, 9, 0, 5), evidenceFiledMs: et(2027, 1, 10, 12, 0), processorDeadlineMs: deadline })).toBe(false));
  it('notice in window but evidence filed at or after the processor deadline, or never: not eligible', () => {
    expect(payoutReturnEligible({ pickupMs, outcome: 'dispute_lost', noticeMs: et(2026, 11, 2, 9, 0), evidenceFiledMs: deadline, processorDeadlineMs: deadline })).toBe(false);
    expect(payoutReturnEligible({ pickupMs, outcome: 'dispute_lost', noticeMs: et(2026, 11, 2, 9, 0), evidenceFiledMs: null, processorDeadlineMs: deadline })).toBe(false);
  });
  it('the decision uses the notice date, not today: a late review of an in-window notice stays eligible', () =>
    expect(payoutReturnEligible({ pickupMs, outcome: 'dispute_lost', noticeMs: et(2026, 12, 15, 9, 0), evidenceFiledMs: et(2026, 12, 20, 9, 0), processorDeadlineMs: et(2027, 1, 14, 0, 0) })).toBe(true));
});

describe('sample owner-statement rides, seeded relative to now (SCOPE 23:07)', () => {
  it('at least one older than 90 days ("Payout final") and one recent ("Return window open until Jan 8"), all Sample data, muted', async () => {
    const { sampleOwnerRides } = await import('../../src/lib/ownerData');
    const now = T0; // Sat Oct 10, 10:30 PM ET
    const rides = sampleOwnerRides(now);
    const final = rides.filter((r) => r.status === 'Payout final');
    const open = rides.filter((r) => r.status.startsWith('Return window open until '));
    expect(final.length).toBeGreaterThanOrEqual(1);
    expect(open.length).toBeGreaterThanOrEqual(1);
    for (const r of final) expect(now - r.pickupMs).toBeGreaterThan(90 * 86_400_000);
    // seeds count back from 11 PM ET on the demo night: 1 day = Fri Oct 9 (traffic ride RN-NHMCXN), 2 days = Thu Oct 8 -> open until Jan 6
    expect(rides.find((r) => r.rideNo === '4822')!.status).toBe('Return window open until Jan 6');
    const traffic = rides.find((r) => r.rideNo === '4823')!;
    expect(traffic.rideId).toBe('RN-NHMCXN');
    expect(new Date(traffic.pickupMs).toISOString()).toBe('2026-10-10T03:00:00.000Z'); // Fri Oct 9, 11:00 PM ET
    // same pickup date on Sunday morning
    expect(sampleOwnerRides(Date.parse('2026-10-11T13:00:00Z')).find((r) => r.rideNo === '4823')!.pickupMs).toBe(traffic.pickupMs);
    for (const r of open) expect(r.status).toMatch(/^Return window open until [A-Z][a-z]{2} \d{1,2}$/);
    for (const r of rides) { expect(r.label).toBe('Sample data'); expect(r.tone).toBe('muted'); expect(r.rideId).toMatch(/^RN-[0-9A-Z]{6}$/); }
  });
  it('relative seeding holds on another date (Jun 1, 2027)', async () => {
    const { sampleOwnerRides } = await import('../../src/lib/ownerData');
    const rides = sampleOwnerRides(Date.parse('2027-06-01T16:00:00Z'));
    expect(rides.some((r) => r.status === 'Payout final')).toBe(true);
    expect(rides.some((r) => r.status.startsWith('Return window open until '))).toBe(true);
  });
});

describe('evidenceDueBy: 1 business day, or same business day if the processor deadline is 3 business days away or less', () => {
  const et = (y: number, m: number, d: number, h: number, min = 0) => etWallToUtc(y, m, d, h, min);
  it('Toast-like 15-day deadline: Mon notice -> Tue', () => expect(ymdIso(evidenceDueBy(et(2026, 10, 12, 10, 0), et(2026, 10, 27, 23, 0)))).toBe('2026-10-13'));
  it('Fri notice, deadline far away -> Mon', () => expect(ymdIso(evidenceDueBy(et(2026, 10, 9, 16, 0), et(2026, 10, 23, 23, 0)))).toBe('2026-10-12'));
  it('Fri notice, deadline Wed (3 business days) -> same day Fri', () => expect(ymdIso(evidenceDueBy(et(2026, 10, 9, 16, 0), et(2026, 10, 14, 23, 0)))).toBe('2026-10-09'));
  it('Fri notice, deadline Thu (4 business days) -> Mon', () => expect(ymdIso(evidenceDueBy(et(2026, 10, 9, 16, 0), et(2026, 10, 15, 23, 0)))).toBe('2026-10-12'));
  it('Sat notice, deadline Tue -> Mon (same business day, next one open)', () => expect(ymdIso(evidenceDueBy(et(2026, 10, 10, 11, 0), et(2026, 10, 13, 23, 0)))).toBe('2026-10-12'));
  it('month boundary: Fri Oct 30 notice, deadline far -> Mon Nov 2', () => expect(ymdIso(evidenceDueBy(et(2026, 10, 30, 12, 0), et(2026, 11, 20, 23, 0)))).toBe('2026-11-02'));
});

describe('Payout Return: RideNite fee only, eligibility on the dispute notice date (Harper 23:11, Jason 23:12)', () => {
  const et = (y: number, m: number, d: number, h: number, min = 0) => etWallToUtc(y, m, d, h, min);
  const pickupMs = et(2026, 10, 10, 22, 4); // window ends Jan 8, 2027
  const deadline = et(2027, 1, 20, 23, 0);
  it('statement line format, always -$1.00 (never the fare)', () => {
    expect(payoutReturnLine('4821', et(2026, 10, 9, 23, 0), 'dispute_lost', 100)).toBe('Ride Payout returned (RideNite fee), ride 4821, Oct 9, dispute lost: -$1.00');
    expect(payoutReturnLine('4820', et(2026, 10, 8, 22, 0), 'refunded_under_rule', 100)).toBe('Ride Payout returned (RideNite fee), ride 4820, Oct 8, refunded under the refund rule: -$1.00');
  });
  it('footnote names the 90-day notice window, keeps dispute fee and fare with the bar', () => {
    expect(statementFootnote()).toContain('notice dated within 90 days of the ride');
    expect(statementFootnote()).toContain('Your dispute fee and the ride fare stay with you.');
  });
  it('dispute lost, notice on day 90, evidence filed in time: eligible; day 91: not', () => {
    expect(payoutReturnEligible({ pickupMs, outcome: 'dispute_lost', noticeMs: et(2027, 1, 8, 20, 0), evidenceFiledMs: et(2027, 1, 12, 9, 0), processorDeadlineMs: deadline })).toBe(true);
    expect(payoutReturnEligible({ pickupMs, outcome: 'dispute_lost', noticeMs: et(2027, 1, 9, 9, 0), evidenceFiledMs: et(2027, 1, 12, 9, 0), processorDeadlineMs: deadline })).toBe(false);
  });
  it('dispute won by the bar: no return', () =>
    expect(payoutReturnEligible({ pickupMs, outcome: 'dispute_won', noticeMs: et(2026, 11, 2, 9, 0), evidenceFiledMs: et(2026, 11, 3, 9, 0), processorDeadlineMs: deadline })).toBe(false));
  it('bar refunds under the refund rule: returned, no window', () =>
    expect(payoutReturnEligible({ pickupMs, outcome: 'refunded_under_rule' })).toBe(true));
  it('evidence not filed in time: not eligible, unless RideNite sent the pack late', () => {
    const base = { pickupMs, outcome: 'dispute_lost' as const, noticeMs: et(2026, 11, 2, 9, 0), forwardedMs: et(2026, 11, 2, 10, 0), evidenceFiledMs: null, processorDeadlineMs: et(2026, 11, 9, 23, 0) };
    expect(payoutReturnEligible({ ...base, evidenceSentMs: et(2026, 11, 3, 9, 0) })).toBe(false); // sent on time (due Tue Nov 3), bar did not file
    expect(payoutReturnEligible({ ...base, evidenceSentMs: et(2026, 11, 5, 9, 0) })).toBe(true); // RideNite late
  });
  it('bar forwarded within 2 business days but the deadline left no time: condition met', () =>
    expect(payoutReturnEligible({ pickupMs, outcome: 'dispute_lost', noticeMs: et(2026, 11, 2, 9, 0), forwardedMs: et(2026, 11, 4, 9, 0), evidenceSentMs: et(2026, 11, 4, 12, 0), evidenceFiledMs: null, processorDeadlineMs: et(2026, 11, 4, 23, 0) })).toBe(true));
  it('sample statement: ride 4821 (shown by its RN- ride ID) "Oct 9, dispute lost" and a refund-rule return, each -$1.00, Sample data; owner copy uses the agreed timing words', async () => {
    const { sampleOwnerStatement } = await import('../../src/lib/ownerData');
    const st = sampleOwnerStatement(T0); // Sat Oct 10, 10:30 PM ET
    expect(st.label).toBe('Sample data');
    const r4821 = st.rides.find((r) => r.rideNo === '4821')!;
    expect(st.feeReturns.map((f) => f.line)).toContain(`Ride Payout returned (RideNite fee), ride ${r4821.rideId}, Oct 9, dispute lost: -$1.00`);
    // one ride ID format on statements, the same as guest receipts (RN-xxxxxx); never the bare 4-digit number
    for (const l of [...st.feeReturns.map((f) => f.line), ...st.quoteCredits.map((c) => c.line!)]) { expect(l).toMatch(/ride RN-[A-Z0-9]{6},/); expect(l).not.toMatch(/ride \d{4}\b/); }
    expect(st.feeReturns.some((f) => f.outcome === 'refunded_under_rule')).toBe(true);
    for (const f of st.feeReturns) { expect(f.cents).toBe(-100); expect(f.label).toBe('Sample data'); }
    expect(st.feeReturnsCents).toBe(-100 * st.feeReturns.length);
    expect(st.forwarding).toContain('as soon as you reasonably can');
    expect(st.evidence).toBe('RideNite sends the evidence pack within 1 business day, or the same business day if your processor deadline is 3 business days away or less.');
    expect(JSON.stringify(st)).not.toMatch(/3 business days of receiving|within 3 business days\b(?! away)/);
  });
});

describe('"never more than $X" is all-in (Harper 23:11 condition list)', () => {
  it('quote parts (fare, taxes, booking fee, tolls, wait, tip) sum to the quote; X = all-in quote + cap', async () => {
    const { allInQuote, maxChargeCents, capFor } = await import('../../src/lib/fare');
    expect(Object.keys(venue.quoteParts).sort()).toEqual(['bookingFee', 'fare', 'taxes', 'tip', 'tolls', 'wait']);
    expect(allInQuote(venue.quoteParts)).toBe(venue.quoteCents);
    expect(maxChargeCents(venue.quoteCents)).toBe(venue.quoteCents + capFor(venue.quoteCents));
    expect(maxChargeCents(2100)).toBe(2520);
    const { maxLine } = await import('../../src/screens/confirm');
    expect(maxLine(2100)).toBe('You pay the final fare, never more than $25.20 unless you approve a change.');
  });
  it('without the guest\'s yes, the ride on the tab never exceeds X; cleaning, damage and no-show fees are never ride line types', async () => {
    const { maxChargeCents, NEVER_ON_GUEST_RIDE_LINE } = await import('../../src/lib/fare');
    for (const ans of [null, 'no'] as const) {
      const s = stateFor('over', ans);
      const m = morningFor(s, T0);
      expect(m.rideCents).toBeLessThanOrEqual(maxChargeCents(m.quoteCents));
      for (const l of checkLines(s, m)) expect(NEVER_ON_GUEST_RIDE_LINE as readonly string[]).not.toContain(l.type);
    }
  });
});

describe('per-ride fee stored at booking (Harper payout-return.md section 7)', () => {
  it('each booked ride records the fee charged; changing config afterwards does not change the return', () => {
    const st = new InMemoryStore({ clock: () => T0 });
    const r0 = st.getState().bar.rides[0];
    expect(r0.feeChargedCents).toBe(100);
    const v = venue as unknown as { perRideFeeCents: number };
    const before = v.perRideFeeCents;
    try {
      v.perRideFeeCents = 150; // price change after booking
      expect(st.getState().bar.rides[0].feeChargedCents).toBe(100);
      expect(payoutReturnCents(r0.feeChargedCents)).toBe(-100);
      expect(payoutReturnLine('4821', et0(2026, 10, 9, 23, 0), 'dispute_lost', r0.feeChargedCents)).toMatch(/: -\$1\.00$/);
      // new bookings pick up the new fee; old rides keep theirs
      const fresh = new InMemoryStore({ clock: () => T0 });
      expect(fresh.getState().bar.rides[0].feeChargedCents).toBe(150);
      expect(st.getState().sampleRideFeeChargedCents).toBe(100);
    } finally { v.perRideFeeCents = before; }
  });
  it('guest check ride lines carry the stored fee', () => {
    const s = stateFor('over', 'yes');
    for (const l of rideLinesOnly(checkLines(s, morningFor(s, T0)))) expect(l.feeChargedCents).toBe(100);
  });
  it('hard check: a return can never exceed the ride\'s recorded fee; never any part of the subscription', () => {
    expect(payoutReturnCents(100)).toBe(-100);
    expect(payoutReturnCents(150)).toBe(-150);
    expect(payoutReturnCents(0)).toBe(0); // waived fee: nothing to return
    expect(payoutReturnCents(100, 50)).toBe(-50);
    expect(() => payoutReturnCents(100, 101)).toThrow(PayoutReturnError);
    expect(() => payoutReturnCents(100, 100 + 19900)).toThrow(PayoutReturnError); // fee + a monthly subscription share
    expect(() => payoutReturnCents(100, 2740)).toThrow(PayoutReturnError); // fare-sized
    expect(() => payoutReturnCents(-1)).toThrow(PayoutReturnError);
    expect(() => payoutReturnCents(100, 1.5)).toThrow(PayoutReturnError);
  });
});

describe('quote adjustment credit (legal memo over-cap-credit.md, Oct 11)', async () => {
  const { quoteAdjustmentCredits, quoteCreditLine, QUOTE_CREDIT_FOOTNOTE } = await import('../../src/lib/payouts');
  const base = { rideId: 'RN-ABC123', pickupMs: Date.parse('2026-10-10T03:00:00Z'), quoteCents: 2100, capCents: 420, bookedAtRideNiteQuote: true, declinedOnGuestPhone: true, guestCausedOverage: false };
  it('credits the amount over the approved cap, as a negative statement line with the RN- ride ID', () => {
    const [c] = quoteAdjustmentCredits([{ ...base, finalCents: 2830 }]);
    expect(c).toMatchObject({ overCents: 310, creditedCents: 310, manualReviewCents: 0, state: 'credited' });
    expect(quoteCreditLine(c.rideId, c.pickupMs, c.creditedCents)).toBe('Quote adjustment credit, ride RN-ABC123, Oct 9: -$3.10');
  });
  it('caps at $10 per ride; the rest goes to manual review', () => {
    const [c] = quoteAdjustmentCredits([{ ...base, finalCents: 2520 + 1350 }]);
    expect(c).toMatchObject({ overCents: 1350, creditedCents: 1000, manualReviewCents: 350, state: 'manual_review' });
  });
  it('caps at $280 per venue per month; over that is manual review, not auto-credited', () => {
    const rides = Array.from({ length: 30 }, (_, i) => ({ ...base, rideId: `RN-R${String(i).padStart(5, '0')}`, pickupMs: base.pickupMs + i * 60_000, finalCents: 2520 + 1000 }));
    const out = quoteAdjustmentCredits(rides);
    expect(out.reduce((a, c) => a + c.creditedCents, 0)).toBe(28000);
    expect(out.slice(0, 28).every((c) => c.state === 'credited')).toBe(true);
    expect(out.slice(28).every((c) => c.state === 'manual_review' && c.creditedCents === 0 && c.manualReviewCents === 1000)).toBe(true);
    expect(quoteAdjustmentCredits([{ ...base, finalCents: 2830 }], 27900)[0]).toMatchObject({ creditedCents: 100, manualReviewCents: 210, state: 'manual_review' });
  });
  it('only rides at our quote and cap, declined by the guest on their own phone, not caused by a guest change', () => {
    for (const k of [{ bookedAtRideNiteQuote: false }, { declinedOnGuestPhone: false }, { guestCausedOverage: true }])
      expect(quoteAdjustmentCredits([{ ...base, ...k, finalCents: 2830 }])[0]).toMatchObject({ state: 'not_eligible', creditedCents: 0 });
    expect(quoteAdjustmentCredits([{ ...base, finalCents: 2460 }])[0].state).toBe('not_eligible'); // within the cap: no credit
  });
  it('sample statement shows the credit with Sample data and the footnote', async () => {
    const { sampleOwnerStatement } = await import('../../src/lib/ownerData');
    const st = sampleOwnerStatement(Date.parse('2026-10-11T02:30:00Z'));
    expect(st.quoteCredits).toHaveLength(1);
    expect(st.quoteCredits[0].line).toMatch(/^Quote adjustment credit, ride RN-[A-Z0-9]{6}, Oct 9: -\$3\.10$/);
    expect(st.quoteCredits[0].label).toBe('Sample data');
    expect(st.quoteCreditsCents).toBe(-310);
    expect(st.quoteCreditFootnote).toBe(QUOTE_CREDIT_FOOTNOTE);
    expect(QUOTE_CREDIT_FOOTNOTE).toBe("When a ride's final fare is above the guest's approved cap and the guest declines the difference, we credit the difference against our fees, up to $10 per ride. Credits apply to future invoices and aren't paid in cash.");
  });
});
