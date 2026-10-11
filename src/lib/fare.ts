/**
 * Fare rule of record (UI 0a item 4, POS 3a): quote plus capped adjustment.
 * Cap = the lesser of 20% of the quote or $5.00, in cents, shown before booking.
 */
export const CAP_PCT = 0.2;
export const CAP_MAX_CENTS = 500;

export const capFor = (quoteCents: number): number =>
  Math.min(Math.round(quoteCents * CAP_PCT), CAP_MAX_CENTS);

/** Parts of an all-in quote. Every amount that can land on the guest's ride line is one of these. */
export interface QuoteParts { fare: number; taxes: number; bookingFee: number; tolls: number; wait: number; tip: number }
export const allInQuote = (p: QuoteParts): number => p.fare + p.taxes + p.bookingFee + p.tolls + p.wait + p.tip;
/** Charges that never go on the guest's ride line (Harper 23:11): provider cleaning or damage fees, no-show fees. */
export const NEVER_ON_GUEST_RIDE_LINE = ['cleaning_fee', 'damage_fee', 'no_show_fee'] as const;
/**
 * Most the guest can pay without a new tap on their own phone: the all-in quote (taxes, fees, tolls, wait
 * time and tip are all inside it) plus the cap. Anything above it that the guest did not approve is never added to
 * the tab (see reconcile: held, then declined and absorbed).
 */
export const maxChargeCents = (allInQuoteCents: number): number => allInQuoteCents + capFor(allInQuoteCents);

export type OverCapAnswer = 'yes' | 'no' | null;

export interface Reconciliation {
  quoteCents: number;
  finalCents: number;
  capCents: number;
  diffCents: number;
  /** Posted automatically as its own line: adjustment (+) or credit (-). */
  postedAdjCents: number;
  /** Over the cap and waiting for the guest's OK (E7). Not charged. */
  heldCents: number;
  /** Guest said no: absorbed by RideNite, never the guest or the bar. */
  declinedCents: number;
  outcome: 'none' | 'adjustment_posted' | 'credit_posted' | 'held_over_cap' | 'approved' | 'declined';
}

/** POS 3a item 4 and POS 5a. */
export function reconcile(quoteCents: number, finalCents: number, answer: OverCapAnswer = null): Reconciliation {
  const capCents = capFor(quoteCents);
  const diffCents = finalCents - quoteCents;
  let postedAdjCents = 0, heldCents = 0, declinedCents = 0;
  let outcome: Reconciliation['outcome'] = 'none';
  if (diffCents > 0) {
    postedAdjCents = Math.min(diffCents, capCents);
    heldCents = diffCents - postedAdjCents;
    outcome = 'adjustment_posted';
    if (heldCents > 0) {
      outcome = 'held_over_cap';
      if (answer === 'yes') { postedAdjCents = diffCents; heldCents = 0; outcome = 'approved'; }
      else if (answer === 'no') { declinedCents = heldCents; heldCents = 0; outcome = 'declined'; }
    }
  } else if (diffCents < 0) {
    postedAdjCents = diffCents;
    outcome = 'credit_posted';
  }
  return { quoteCents, finalCents, capCents, diffCents, postedAdjCents, heldCents, declinedCents, outcome };
}

export interface LineItem { name: string; cents: number; kind: 'drink' | 'food' }

export interface MorningTotals {
  drinksCents: number;
  foodCents: number;
  /** Tip and tax base: drinks + food only, never ride lines. */
  tipBaseCents: number;
  taxCents: number;
  rideCents: number; // quote line + posted adjustment/credit
  tipCents: number;
  totalBeforeTipCents: number;
  totalCents: number;
  recon: Reconciliation | null;
}

export function morningTotals(opts: {
  items: readonly LineItem[];
  taxRate: number;
  tipPct: number;
  quoteCents: number | null; // null = no ride on the tab
  finalCents?: number | null; // null/undefined = not reconciled yet
  overCapAnswer?: OverCapAnswer;
  perkCents?: number; // venue perk (reduces ride lines), 0 by default
}): MorningTotals {
  const drinksCents = opts.items.filter((i) => i.kind === 'drink').reduce((a, i) => a + i.cents, 0);
  const foodCents = opts.items.filter((i) => i.kind === 'food').reduce((a, i) => a + i.cents, 0);
  const tipBaseCents = drinksCents + foodCents;
  const taxCents = Math.round(tipBaseCents * opts.taxRate);
  let rideCents = 0;
  let recon: Reconciliation | null = null;
  if (opts.quoteCents != null) {
    rideCents = opts.quoteCents;
    if (opts.finalCents != null) {
      recon = reconcile(opts.quoteCents, opts.finalCents, opts.overCapAnswer ?? null);
      rideCents += recon.postedAdjCents;
    }
    rideCents -= Math.min(opts.perkCents ?? 0, rideCents);
  }
  const tipCents = Math.round((tipBaseCents * opts.tipPct) / 100);
  const totalBeforeTipCents = tipBaseCents + taxCents + rideCents;
  return { drinksCents, foodCents, tipBaseCents, taxCents, rideCents, tipCents, totalBeforeTipCents, totalCents: totalBeforeTipCents + tipCents, recon };
}
