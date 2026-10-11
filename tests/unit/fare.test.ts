import { describe, expect, it } from 'vitest';
import { capFor, morningTotals, reconcile } from '../../src/lib/fare';
import { venue } from '../../src/venue.config';

describe('capFor: lesser of 20% of quote or $5.00', () => {
  it.each([
    [2400, 480], // $24.00 -> $4.80 (UI spec sample)
    [3000, 500], // $30.00 -> $5.00 (20% would be $6.00)
    [2100, 420], // $21.00 -> $4.20 (Maison Cheryl sample)
    [2350, 470], // $23.50 -> $4.70 (E2 new quote)
    [2500, 500], // exactly at the crossover
    [2499, 500], // 20% = $4.998 rounds to $5.00, never above
    [2750, 500], // UI spec E2: 20% of $27.50 is $5.50, so $5.00
    [1000, 200],
    [100, 20],
  ])('quote %i cents -> cap %i cents', (q, cap) => {
    expect(capFor(q)).toBe(cap);
  });
  it('never exceeds $5.00', () => {
    for (let q = 1; q < 20000; q += 37) expect(capFor(q)).toBeLessThanOrEqual(500);
  });
});

describe('reconcile (POS 3a item 4)', () => {
  it('higher within cap posts the full difference', () => {
    const r = reconcile(2100, 2460);
    expect(r).toMatchObject({ postedAdjCents: 360, heldCents: 0, outcome: 'adjustment_posted' });
  });
  it('lower posts a credit', () => {
    expect(reconcile(2100, 1890)).toMatchObject({ postedAdjCents: -210, outcome: 'credit_posted' });
  });
  it('equal posts nothing', () => {
    expect(reconcile(2100, 2100)).toMatchObject({ postedAdjCents: 0, outcome: 'none' });
  });
  it('over the cap posts the cap and holds the rest (E7: $4.20 added, $2.20 needs OK)', () => {
    expect(reconcile(2100, 2740)).toMatchObject({ postedAdjCents: 420, heldCents: 220, outcome: 'held_over_cap' });
  });
  it('over the cap, guest says yes: remainder posts', () => {
    expect(reconcile(2100, 2740, 'yes')).toMatchObject({ postedAdjCents: 640, heldCents: 0, outcome: 'approved' });
  });
  it('over the cap, guest says no: never charged', () => {
    expect(reconcile(2100, 2740, 'no')).toMatchObject({ postedAdjCents: 420, heldCents: 0, declinedCents: 220, outcome: 'declined' });
  });
});

const totals = (quote: number, final: number, answer: 'yes' | 'no' | null = null, tipPct = 20) =>
  morningTotals({ items: venue.menu, taxRate: venue.taxRate, tipPct, quoteCents: quote, finalCents: final, overCapAnswer: answer });

describe('P9 totals for the configured venue (POS build-spec 3b)', () => {
  it('base: food and neutral items $49 (no drinks on the demo tab), tax 11% = $5.39, tip 20% = $9.80', () => {
    const t = totals(2100, 2460);
    expect(t.drinksCents).toBe(0);
    expect(t.foodCents).toBe(4900);
    expect(t.tipBaseCents).toBe(4900);
    expect(t.taxCents).toBe(539);
    expect(t.tipCents).toBe(980);
  });
  it('Higher (guided path): $88.79', () => {
    const t = totals(2100, 2460);
    expect(t.totalBeforeTipCents).toBe(7899);
    expect(t.totalCents).toBe(8879);
  });
  it('Lower: $83.09', () => {
    const t = totals(2100, 1890);
    expect(t.totalBeforeTipCents).toBe(7329);
    expect(t.totalCents).toBe(8309);
  });
  it('Over the cap, before OK: $89.39', () => {
    const t = totals(2100, 2740);
    expect(t.totalBeforeTipCents).toBe(7959);
    expect(t.totalCents).toBe(8939);
  });
  it('Over the cap, guest says yes: $91.59 (POS 3b row corrected Oct 10 from stale 8.875% values)', () => {
    const t = totals(2100, 2740, 'yes');
    expect(t.rideCents).toBe(2740);
    expect(t.totalBeforeTipCents).toBe(8179);
    expect(t.totalCents).toBe(9159);
  });
  it('Over the cap, guest says no: $89.39', () => {
    const t = totals(2100, 2740, 'no');
    expect(t.totalCents).toBe(8939);
    expect(t.recon?.declinedCents).toBe(220);
  });
  it('E2 then higher: quote $23.50, cap $4.70, final $24.60 -> +$1.10, total $88.79', () => {
    const t = totals(2350, 2460);
    expect(t.recon?.capCents).toBe(470);
    expect(t.recon?.postedAdjCents).toBe(110);
    expect(t.totalCents).toBe(8879);
  });
  it('tip is on drinks and food only, never the ride, and recomputes per option', () => {
    expect(totals(2100, 2460, null, 18).tipCents).toBe(882);
    expect(totals(2100, 2460, null, 22).tipCents).toBe(1078);
    expect(totals(2100, 2460, null, 0).tipCents).toBe(0);
    // changing the fare does not change the tip
    expect(totals(2100, 2740, null, 20).tipCents).toBe(totals(2100, 1890, null, 20).tipCents);
  });
  it('no tax on ride lines', () => {
    expect(totals(2100, 2460).taxCents).toBe(totals(9000, 9500).taxCents);
  });
});
