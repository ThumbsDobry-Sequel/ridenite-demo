import { HOLD_WINDOW_MS } from './hold';
import { returnWindowEnds, ymdIso } from './payouts';
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
  /** Bar vs RideNite split (SCOPE 23:01): every tab line is a bar line or a ride line. */
  kind: 'bar' | 'ride';
  type: 'item' | 'tax' | 'ride_quote' | 'ride_adjustment' | 'ride_credit' | 'ride_held';
  /** Ride lines only: fictional RideNite ride ID (RN-xxxxxx). */
  rideId?: string;
  /** Ride lines only, owner data: RideNite fee charged for this ride, as stored at booking. */
  feeChargedCents?: number;
  /** Ride lines only, owner data: pickup date (ET) + venue.payoutReturnWindowDays calendar days, "YYYY-MM-DD". */
  returnWindowEnds?: string;
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
  /** Exact ride line text, e.g. the bar POS line "RideNite car home, Clarendon area, 11:52 PM". */
  rideLineName?: string;
  ride?: { quoteCents: number; finalCents: number | null; overCapAnswer?: OverCapAnswer; rideId?: string; pickupMs?: number; feeChargedCents?: number } | null;
}): TabTotals {
  const lines: TabLine[] = [];
  const grouped = new Map<string, { cents: number; qty: number }>();
  for (const i of opts.items) {
    const g = grouped.get(i.name) ?? { cents: 0, qty: 0 };
    g.cents += i.cents; g.qty += 1;
    grouped.set(i.name, g);
  }
  for (const [name, g] of grouped) lines.push({ kind: 'bar', type: 'item', name, qty: g.qty, cents: g.cents });
  const subtotalCents = opts.items.reduce((a, i) => a + i.cents, 0);
  const taxCents = Math.round(subtotalCents * opts.taxRate);
  lines.push({ kind: 'bar', type: 'tax', name: 'Tax', cents: taxCents });
  let rideCents = 0, heldCents = 0;
  let recon: Reconciliation | null = null;
  if (opts.ride) {
    const q = opts.ride.quoteCents;
    const rideId = opts.ride.rideId;
    const feeChargedCents = opts.ride.feeChargedCents;
    const returnWindowEndsIso = opts.ride.pickupMs != null ? ymdIso(returnWindowEnds(opts.ride.pickupMs)) : undefined;
    lines.push({ kind: 'ride', type: 'ride_quote', rideId, returnWindowEnds: returnWindowEndsIso, feeChargedCents, name: opts.rideLineName ?? `${opts.tabLineName}, quoted fare`, cents: q });
    rideCents = q;
    if (opts.ride.finalCents != null) {
      recon = reconcile(q, opts.ride.finalCents, opts.ride.overCapAnswer ?? null);
      const f = (c: number) => `$${(c / 100).toFixed(2)}`;
      if (recon.postedAdjCents > 0) lines.push({ kind: 'ride', type: 'ride_adjustment', rideId, returnWindowEnds: returnWindowEndsIso, feeChargedCents, name: `Ride fare adjustment (final fare ${f(recon.finalCents)}, quoted ${f(q)})`, cents: recon.postedAdjCents });
      if (recon.postedAdjCents < 0) lines.push({ kind: 'ride', type: 'ride_credit', rideId, returnWindowEnds: returnWindowEndsIso, feeChargedCents, name: `Ride fare credit (final fare ${f(recon.finalCents)}, quoted ${f(q)})`, cents: recon.postedAdjCents });
      if (recon.heldCents > 0) lines.push({ kind: 'ride', type: 'ride_held', rideId, name: 'Held for the guest\'s OK, not charged to the bar', cents: recon.heldCents });
      rideCents += recon.postedAdjCents;
      heldCents = recon.heldCents;
    }
  }
  return { lines, subtotalCents, taxCents, rideCents, heldCents, totalBeforeTipCents: subtotalCents + taxCents + rideCents, tipBaseCents: subtotalCents, recon };
}

/** Neighborhood for a drop-off: first part of the area that is not a street number ("Clarendon"). */
export function neighborhood(area: string): string {
  const parts = area.split(',').map((x) => x.trim()).filter(Boolean);
  return parts.find((x) => !/^\d/.test(x)) ?? parts[0] ?? '';
}

/**
 * Bar POS tab line (SCOPE 22:22): "RideNite car home, [area], [time]", time = pickup (when it posts), ET.
 * The guest's "Confirmed by guest" record stays on the RideNite receipt and record, never on this line.
 */
export function barRideLineName(dest: { area: string }, pickupMs: number, fmtTime: (ms: number) => string): string {
  return `RideNite car home, ${neighborhood(dest.area)} area, ${fmtTime(pickupMs)}`;
}

export type TabCloseState = 'open' | 'held' | 'closed' | 'pending';
const NOT_CHARGED_END = ['canceled_by_driver', 'no_cars', 'canceled_by_guest'];
/**
 * Effective POS close state. A close tapped while a ride was pending pickup stays "pending" until pickup
 * (ride line posts, close completes) or a cancel / no driver (closes clean), all inside the 24 h POS hold.
 */
export function tabCloseState(t: { close: TabCloseState; closeAt?: number }, rideStage: string | null, now: number, holdMs = HOLD_WINDOW_MS): TabCloseState {
  if (t.close !== 'pending') return t.close;
  if (rideStage === 'picked_up' || rideStage === 'complete') return 'closed';
  if (!rideStage || NOT_CHARGED_END.includes(rideStage)) return 'closed';
  if (t.closeAt != null && now - t.closeAt >= holdMs) return 'closed';
  return 'pending';
}
