import { venue, type MenuItem } from '../venue.config';
import { reconcile, type OverCapAnswer, type Reconciliation } from './fare';

/** Expand [name, qty] pairs into priced items using the venue menu. */
export function tabItems(pairs: readonly (readonly [string, number])[]): MenuItem[] {
  const out: MenuItem[] = [];
  for (const [name, qty] of pairs) {
    const m = venue.menu.find((i) => i.name === name);
    if (!m) throw new Error(`Unknown menu item ${name}`);
    for (let i = 0; i < qty; i++) out.push({ name: m.name, cents: m.cents, kind: m.kind });
  }
  return out;
}

export interface TabLine {
  kind: 'item' | 'tax' | 'ride_quote' | 'ride_adjustment' | 'ride_credit' | 'ride_held';
  name: string;
  qty?: number;
  cents: number;
}

export interface TabTotals {
  lines: TabLine[];
  subtotalCents: number; // drinks + food
  taxCents: number; // on drinks and food only
  rideCents: number; // quote line + posted adjustment or credit (never the held part)
  heldCents: number;
  totalBeforeTipCents: number;
  /** Tip prompt base: drinks and food only, never the ride lines. */
  tipBaseCents: number;
  recon: Reconciliation | null;
}

/**
 * B6 tab detail math (POS 3a): items, tax on items only, "Courtesy car, quoted fare" at the quote,
 * then the adjustment or credit as its own separate line once the final fare is in.
 */
export function tabTotals(opts: {
  items: readonly MenuItem[];
  taxRate: number;
  tabLineName: string;
  ride?: { quoteCents: number; finalCents: number | null; overCapAnswer?: OverCapAnswer } | null;
}): TabTotals {
  const lines: TabLine[] = [];
  const grouped = new Map<string, { cents: number; qty: number }>();
  for (const i of opts.items) {
    const g = grouped.get(i.name) ?? { cents: 0, qty: 0 };
    g.cents += i.cents; g.qty += 1;
    grouped.set(i.name, g);
  }
  for (const [name, g] of grouped) lines.push({ kind: 'item', name, qty: g.qty, cents: g.cents });
  const subtotalCents = opts.items.reduce((a, i) => a + i.cents, 0);
  const taxCents = Math.round(subtotalCents * opts.taxRate);
  lines.push({ kind: 'tax', name: 'Tax', cents: taxCents });
  let rideCents = 0, heldCents = 0;
  let recon: Reconciliation | null = null;
  if (opts.ride) {
    const q = opts.ride.quoteCents;
    lines.push({ kind: 'ride_quote', name: `${opts.tabLineName}, quoted fare`, cents: q });
    rideCents = q;
    if (opts.ride.finalCents != null) {
      recon = reconcile(q, opts.ride.finalCents, opts.ride.overCapAnswer ?? null);
      const f = (c: number) => `$${(c / 100).toFixed(2)}`;
      if (recon.postedAdjCents > 0) lines.push({ kind: 'ride_adjustment', name: `Ride fare adjustment (final fare ${f(recon.finalCents)}, quoted ${f(q)})`, cents: recon.postedAdjCents });
      if (recon.postedAdjCents < 0) lines.push({ kind: 'ride_credit', name: `Ride fare credit (final fare ${f(recon.finalCents)}, quoted ${f(q)})`, cents: recon.postedAdjCents });
      if (recon.heldCents > 0) lines.push({ kind: 'ride_held', name: 'Held for the guest\'s OK, not charged to the bar', cents: recon.heldCents });
      rideCents += recon.postedAdjCents;
      heldCents = recon.heldCents;
    }
  }
  return { lines, subtotalCents, taxCents, rideCents, heldCents, totalBeforeTipCents: subtotalCents + taxCents + rideCents, tipBaseCents: subtotalCents, recon };
}
