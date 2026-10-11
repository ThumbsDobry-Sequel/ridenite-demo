import { describe, expect, it } from 'vitest';
import { tabItems, tabTotals } from '../../src/lib/tab';
import { venue } from '../../src/venue.config';
import { InMemoryStore } from '../../src/store/InMemoryStore';
import { barConfirmLine, confirmLine } from '../../src/lib/confirmRecord';

const maya = tabItems(venue.bar.tabs.find((t) => t.tab === '4468')!.items);
const base = { items: maya, taxRate: venue.taxRate, tabLineName: 'Courtesy car' };
const ride = (sc: keyof typeof venue.finalFareCents, overCapAnswer: 'yes' | 'no' | null = null) =>
  tabTotals({ ...base, ride: { quoteCents: 2100, finalCents: venue.finalFareCents[sc], overCapAnswer } });

describe('B6 tab line math (POS 3a, Maison Cheryl sample)', () => {
  it('seeded tab totals match the B1 sample amounts', () => {
    const want: Record<string, number> = { '4468': 4900, '4471': 3600, '4474': 2800, '4475': 11200, '4476': 2200, '4473': 5800 };
    for (const [tab, cents] of Object.entries(want)) {
      expect(tabItems(venue.bar.tabs.find((t) => t.tab === tab)!.items).reduce((a, i) => a + i.cents, 0)).toBe(cents);
    }
  });
  it('no ride: items, tax 11% on items only', () => {
    const t = tabTotals(base);
    expect(t.subtotalCents).toBe(4900);
    expect(t.taxCents).toBe(539);
    expect(t.totalBeforeTipCents).toBe(5439);
    expect(t.lines.some((l) => l.kind.startsWith('ride'))).toBe(false);
  });
  it('quoted fare is its own line before the final fare is in', () => {
    const t = tabTotals({ ...base, ride: { quoteCents: 2100, finalCents: null } });
    const l = t.lines.find((x) => x.kind === 'ride_quote')!;
    expect(l.name).toBe('Courtesy car, quoted fare');
    expect(l.cents).toBe(2100);
    expect(t.totalBeforeTipCents).toBe(7539);
    expect(t.lines.filter((x) => x.kind === 'ride_adjustment' || x.kind === 'ride_credit')).toHaveLength(0);
  });
  it('higher fare: +$3.60 adjustment as a separate line, total $78.99', () => {
    const t = ride('higher');
    const adj = t.lines.find((x) => x.kind === 'ride_adjustment')!;
    expect(adj.name).toBe('Ride fare adjustment (final fare $24.60, quoted $21.00)');
    expect(adj.cents).toBe(360);
    expect(t.lines.find((x) => x.kind === 'ride_quote')!.cents).toBe(2100);
    expect(t.totalBeforeTipCents).toBe(7899);
  });
  it('lower fare: -$2.10 credit as a separate line, total $73.29', () => {
    const t = ride('lower');
    const c = t.lines.find((x) => x.kind === 'ride_credit')!;
    expect(c.cents).toBe(-210);
    expect(c.name).toBe('Ride fare credit (final fare $18.90, quoted $21.00)');
    expect(t.totalBeforeTipCents).toBe(7329);
  });
  it('equal fare: no adjustment line', () => {
    const t = ride('equal');
    expect(t.lines.filter((x) => x.kind === 'ride_adjustment' || x.kind === 'ride_credit')).toHaveLength(0);
    expect(t.totalBeforeTipCents).toBe(7539);
  });
  it('over cap: $4.20 posted, $2.20 held and never in the bar total ($79.59)', () => {
    const t = ride('over');
    expect(t.lines.find((x) => x.kind === 'ride_adjustment')!.cents).toBe(420);
    expect(t.lines.find((x) => x.kind === 'ride_held')!.cents).toBe(220);
    expect(t.heldCents).toBe(220);
    expect(t.rideCents).toBe(2520);
    expect(t.totalBeforeTipCents).toBe(7959);
  });
  it('over cap, guest said no: held part dropped, still $79.59', () => {
    const t = ride('over', 'no');
    expect(t.lines.some((x) => x.kind === 'ride_held')).toBe(false);
    expect(t.totalBeforeTipCents).toBe(7959);
  });
  it('tip base is drinks and food only ($49.00), in every scenario', () => {
    for (const sc of ['higher', 'lower', 'equal', 'over'] as const) expect(ride(sc).tipBaseCents).toBe(4900);
    expect(tabTotals(base).tipBaseCents).toBe(4900);
  });
  it('tab line name follows the setting', () => {
    const t = tabTotals({ ...base, tabLineName: 'RideNite Ride', ride: { quoteCents: 2100, finalCents: null } });
    expect(t.lines.find((x) => x.kind === 'ride_quote')!.name).toBe('RideNite Ride, quoted fare');
  });
  it('groups repeated items with a count', () => {
    const t = tabTotals({ items: tabItems([['Old Fashioned', 3]]), taxRate: 0.11, tabLineName: 'Courtesy car' });
    expect(t.lines[0]).toMatchObject({ name: 'Old Fashioned', qty: 3, cents: 4500 });
  });
});

function mk() {
  let t = Date.UTC(2026, 9, 10, 3, 42); // 11:42 PM ET
  const store = new InMemoryStore({ clock: () => t });
  return { store, advance: (ms: number) => { t += ms; } };
}

describe('Bartender store (M2)', () => {
  it('Book refuses without a quote, and without the tick, each alone', () => {
    const { store } = mk();
    store.barStartDraft('4475', 'staff_offer');
    store.barSetMode('staff');
    expect(store.barBook()).toEqual({ ok: false, reason: 'no_quote' });
    store.barPickDest(venue.addresses[4]);
    expect(store.getState().bar.draft!.sawPrice).toBe(false);
    expect(store.barBook()).toEqual({ ok: false, reason: 'not_seen' });
    store.barToggleSawPrice();
    const r = store.barBook();
    expect(r.ok).toBe(true);
  });
  it('tick does nothing without a quote', () => {
    const { store } = mk();
    store.barStartDraft('4475', 'guest_request');
    store.barToggleSawPrice();
    expect(store.getState().bar.draft!.sawPrice).toBe(false);
  });
  it('stores the entry point tapped and a staff record line', () => {
    const { store } = mk();
    store.barStartDraft('4475', 'staff_offer');
    store.barPickDest(venue.addresses[4]);
    store.barToggleSawPrice();
    const r = store.barBook();
    if (!r.ok) throw new Error('not booked');
    expect(r.ride.entryPoint).toBe('staff_offer');
    const s = store.getState();
    const rec = s.confirmations.find((c) => c.rideId === r.ride.id)!;
    expect(rec).toMatchObject({ by: 'staff', method: 'staff_saw_price', quoteCents: 2100, capCents: 420, entryPoint: 'staff_offer' });
    const line = barConfirmLine(s, store.barRides().find((x) => x.id === r.ride.id)!)!;
    expect(line.text).toBe('Booked by staff, price shown to guest, 11:42 PM');
    expect(line.text).not.toContain('Confirmed by guest');
  });
  it('guest reply auto-ticks and records the guest; Bar 3 is two taps out of the box', () => {
    const { store } = mk();
    store.barStartDraft('4471', 'guest_request');
    const d = store.getState().bar.draft!;
    expect(d).toMatchObject({ sawPrice: true, sawBy: 'guest', quoteCents: 2100 });
    const r = store.barBook();
    if (!r.ok) throw new Error('not booked');
    const line = barConfirmLine(store.getState(), store.barRides().find((x) => x.id === r.ride.id)!)!;
    expect(line.text).toBe('Confirmed by guest, 11:42 PM');
  });
  it('E2 price change clears the tick: $21.00 to $23.50, cap $4.70', () => {
    const { store } = mk();
    store.barStartDraft('4471', 'guest_request');
    store.barPriceChanged();
    const d = store.getState().bar.draft!;
    expect(d).toMatchObject({ quoteCents: 2350, prevQuoteCents: 2100, sawPrice: false });
    expect(store.barBook()).toEqual({ ok: false, reason: 'not_seen' });
    store.barToggleSawPrice();
    const r = store.barBook();
    if (!r.ok) throw new Error('not booked');
    expect(r.ride.capCents).toBe(470);
  });
  it('double Book makes one ride', () => {
    const { store } = mk();
    store.barStartDraft('4471', 'guest_request');
    const a = store.barBook();
    const b = store.barBook();
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    expect(store.barRides().filter((r) => r.tab === '4471')).toHaveLength(1);
    // a second draft on the same tab returns the existing ride
    store.barStartDraft('4471', 'staff_offer');
    store.barPickDest(venue.addresses[4]); store.barToggleSawPrice();
    const c = store.barBook();
    expect(c.ok && c.duplicate).toBe(true);
    expect(store.barRides().filter((r) => r.tab === '4471')).toHaveLength(1);
  });
  it('booking the guest phone tab shows the ride in the guest flow (same phone)', () => {
    const { store } = mk();
    store.barStartDraft('4468', 'guest_request');
    store.barSimulateGuestReply('4468');
    const r = store.barBook();
    expect(r.ok).toBe(true);
    const s = store.getState();
    expect(s.ride?.tab).toBe('4468');
    expect(s.ride?.pending).toBeFalsy();
    expect(store.stageOf(s.ride!)).toBe('requested');
    expect(confirmLine(s)!.text).toBe('Confirmed by guest, 11:42 PM');
  });
  it('a bar booking on another tab never hides the guest sample receipt', () => {
    const { store } = mk();
    store.barStartDraft('4471', 'guest_request');
    store.barBook();
    expect(confirmLine(store.getState())!.sample).toBe(true);
  });
  it('declined ride rebooks in one call with a new car', () => {
    const { store } = mk();
    const declined = store.barRides().find((r) => r.tab === '4476')!;
    expect(store.stageOf(declined)).toBe('canceled_by_driver');
    const n = store.barRebook(declined.id);
    expect(n).not.toBeNull();
    const now = store.barRides().filter((r) => r.tab === '4476');
    expect(now).toHaveLength(1);
    expect(store.stageOf(now[0])).toBe('requested');
    expect(now[0].carInfo.partner).toBe(venue.bar.rebookPartner);
  });
  it('closed tab refuses booking; hold for morning keeps it bookable state held', () => {
    const { store } = mk();
    store.barCloseTab('4475', 'closed');
    store.barStartDraft('4475', 'guest_request');
    store.barPickDest(venue.addresses[4]); store.barToggleSawPrice();
    expect(store.barBook()).toEqual({ ok: false, reason: 'tab_closed' });
    store.barCloseTab('4471', 'held');
    expect(store.getState().bar.tabs.find((t) => t.tab === '4471')!.close).toBe('held');
  });
  it('guest quiet request lands on the bar; reset returns to seed', () => {
    const { store } = mk();
    store.sendQuietRequest('Table 7');
    expect(store.getState().bar.quiet).toMatchObject({ seat: 'Table 7', seen: false });
    store.barSetSetting('receipt', 'detailed');
    store.resetDemoData();
    const s = store.getState();
    expect(s.bar.quiet!.seat).toBe('Table 4');
    expect(s.bar.settings.receipt).toBe('neutral');
    expect(s.bar.rides).toHaveLength(3);
  });
  it('drafts and rides carry no free-text fields', () => {
    const { store } = mk();
    store.barStartDraft('4471', 'guest_request');
    const keys = Object.keys(store.getState().bar.draft!);
    for (const k of keys) expect(k).not.toMatch(/reason|note|drink|condition/i);
  });
});
