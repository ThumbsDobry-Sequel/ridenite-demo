import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { nav, open, slide, state, store, tapper } from './helpers';
// @ts-expect-error plain JS module
import { lintText } from '../../scripts/copy-lint.mjs';

/* M2 bartender flow. Every test here is tagged @bar and runs at 390x844, 375x667, 430x932 and iPad 1024x768. */

const wide = (page: Page) => page.viewportSize()!.width >= 768;
const decode = (href: string) => {
  const d = new URL(href.replace('/#/', '/')).searchParams.get('d')!;
  return JSON.parse(Buffer.from(d.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
};
const bookRide = (page: Page) => page.locator('[data-testid=bar-book]:visible, [data-testid=bar-book-top]:visible').first();

/** Fresh load (a goto to the same hash would not reload, so the demo would carry over). */
async function fresh(page: Page, path: string) {
  await page.goto('about:blank');
  await open(page, path);
}

async function tonight(page: Page) {
  await fresh(page, '/b/tonight');
  await expect(page.getByTestId('tab-card-4471')).toBeVisible();
}

/** Each bar screen, with the state it needs (sheets need a draft or a ride). */
const SCREENS: { name: string; path: string; prep?: string }[] = [
  { name: 'B0', path: '/b' },
  { name: 'B1', path: '/b/tonight' },
  { name: 'B2', path: '/b/book' },
  { name: 'B3 with quote', path: '/b/sheet?tab=4471', prep: "s.barStartDraft('4471','guest_request')" },
  { name: 'B3 waiting', path: '/b/sheet?tab=4475', prep: "s.barStartDraft('4475','staff_offer')" },
  { name: 'B3 QR', path: '/b/sheet?tab=4475', prep: "s.barStartDraft('4475','staff_offer'); s.barSetMode('qr')" },
  { name: 'B3 staff', path: '/b/sheet?tab=4475', prep: "s.barStartDraft('4475','staff_offer'); s.barPickDest({ line: '3100 Clarendon Blvd', area: 'Clarendon, Arlington, VA 22201' })" },
  { name: 'B3h', path: '/b/sheet/help', prep: "s.barStartDraft('4471','guest_request')" },
  { name: 'Booked', path: '/b/booked?ride=r-4472-seed' },
  { name: 'B4', path: '/b/live' },
  { name: 'B5', path: '/b/history' },
  { name: 'B6', path: '/b/tab?tab=4472' },
  { name: 'B8', path: '/b/settings' },
  { name: 'B9', path: '/b/plate?tab=4472' },
  { name: 'B10', path: '/b/quiet' },
  { name: 'More', path: '/b/more' },
];

async function openScreen(page: Page, sc: (typeof SCREENS)[number]) {
  await open(page, '/b/tonight');
  if (sc.prep) await store(page, sc.prep);
  await nav(page, sc.path);
  await expect(page.locator('main').last()).toBeVisible();
  await page.waitForTimeout(350); // sheet slide-up animation
}

for (const sc of SCREENS) {
  test.describe(`bar screen ${sc.name}`, () => {
    test('banner visible, copy lint, no horizontal scroll, no free text, targets @bar', async ({ page }) => {
      await openScreen(page, sc);
      await expect(page.getByTestId('sim-label')).toBeInViewport({ ratio: 1 });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.getByTestId('sim-label')).toBeInViewport({ ratio: 1 });
      expect(lintText(await page.evaluate(() => document.body.innerText), sc.name)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), 'no horizontal scroll').toBeLessThanOrEqual(0);
      expect(await page.locator('input, textarea, select, [contenteditable=true], [contenteditable=""]').count(), 'no free-text input').toBe(0);
      const small = await page.$$eval('button, a[href], [role=button], [role=checkbox], [role=radio], [role=switch]', (els) =>
        els.filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && !e.matches('.sr-only:not(:focus)') && getComputedStyle(e).visibility !== 'hidden' && (r.width < 43.5 || r.height < 43.5);
        }).map((e) => `${(e.textContent || '').trim().slice(0, 30)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
      expect(small, 'bar targets at least 44 x 44').toEqual([]);
    });
    test('axe: zero serious or critical @bar', async ({ page }) => {
      await openScreen(page, sc);
      const r = await new AxeBuilder({ page }).analyze();
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      expect(bad).toEqual([]);
    });
  });
}

test.describe('M2 layout (Riley 6, Piper A)', () => {
  test('A2 Guest asked / I offered and Rebook at least 56; Book ride and Book at least 64 @bar', async ({ page }) => {
    await tonight(page);
    for (const id of ['ask-4471', 'offer-4471', 'rebook-4476']) expect((await page.getByTestId(id).boundingBox())!.height, id).toBeGreaterThanOrEqual(56);
    const br = (await bookRide(page).boundingBox())!;
    expect(br.height).toBeGreaterThanOrEqual(wide(page) ? 44 : 64);
    if (!wide(page)) {
      const vp = page.viewportSize()!;
      const bar = (await page.getByTestId('bar-tabbar').boundingBox())!;
      expect(bar.height).toBeGreaterThanOrEqual(56);
      expect(bar.y + bar.height).toBeLessThanOrEqual(vp.height + 0.5);
      expect(br.y + br.height).toBeLessThanOrEqual(bar.y + 0.5); // sticky Book sits above the tab bar
    }
    await page.getByTestId('ask-4471').tap();
    expect((await page.getByTestId('b3-book').boundingBox())!.height).toBeGreaterThanOrEqual(64);
    expect((await page.getByTestId('b3-saw').boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  test('A3 B3 with a quote: $21.00, cap sentence, checkbox and Book visible without scrolling @bar', async ({ page }) => {
    test.skip(page.viewportSize()!.height < 844 && !wide(page), 'baseline is 390x844 and up; SE covered by A4');
    await tonight(page);
    await page.getByTestId('ask-4471').tap();
    await expect(page.getByTestId('b3-quote')).toHaveText('$21.00');
    await expect(page.getByTestId('b3-cap')).toHaveText('Final fare may differ by up to $4.20.');
    for (const id of ['b3-quote', 'b3-cap', 'b3-saw', 'b3-book']) await expect(page.getByTestId(id), id).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('A4 B3 on any size: Book stays sticky above the home indicator while the sheet scrolls @bar', async ({ page }) => {
    await tonight(page);
    await page.getByTestId('offer-4475').tap();
    await page.getByTestId('b3-mode-staff').tap();
    await page.getByTestId('b3-dest-3100-clarendon-blvd').tap();
    for (const y of [0, 10_000]) {
      await page.evaluate((v) => { window.scrollTo(0, v); document.querySelector('.bdrawer')?.scrollTo(0, v); }, y);
      await expect(page.getByTestId('b3-book')).toBeInViewport({ ratio: 1 });
    }
  });
});

test.describe('M2 booking rules (Piper B)', () => {
  test('B1 tab card to booked ride in 2 taps once the guest saw the price @bar', async ({ page }) => {
    await tonight(page);
    const t = tapper(page);
    await t.tap('ask-4471');
    await expect(page.getByTestId('b3-saw')).toHaveAttribute('aria-checked', 'true');
    await t.tap('b3-book');
    await expect(page.locator('[data-screen=booked]')).toBeVisible();
    expect(t.count).toBe(2);
    const s = await state(page);
    const ride = s.bar.rides.find((r: any) => r.tab === '4471');
    expect(ride.entryPoint).toBe('guest_request');
    expect(s.bookings.some((b: any) => b.rideId === ride.id)).toBe(true);
  });

  test('B2 Book disabled until a quote exists AND Guest saw the price; each alone @bar', async ({ page }) => {
    await tonight(page);
    await page.getByTestId('offer-4475').tap();
    await page.getByTestId('b3-mode-staff').tap();
    const book = page.getByTestId('b3-book');
    // neither
    await expect(book).toBeDisabled();
    await expect(page.getByTestId('b3-helper')).toHaveText('Waiting for a price.');
    // tick alone (no quote): the box does not tick, Book stays disabled
    await page.getByTestId('b3-saw').tap({ force: true });
    await expect(page.getByTestId('b3-saw')).toHaveAttribute('aria-checked', 'false');
    await expect(book).toBeDisabled();
    // quote alone
    await page.getByTestId('b3-dest-3100-clarendon-blvd').tap();
    await expect(page.getByTestId('b3-quote')).toHaveText('$21.00');
    await expect(page.getByTestId('b3-saw')).toHaveAttribute('aria-checked', 'false');
    await expect(book).toBeDisabled();
    await expect(page.getByTestId('b3-helper')).toHaveText('Check "Guest saw the price" first.');
    // both
    await page.getByTestId('b3-saw').tap();
    await expect(book).toBeEnabled();
    // untick again
    await page.getByTestId('b3-saw').tap();
    await expect(book).toBeDisabled();
    await book.tap({ force: true });
    expect((await state(page)).bar.rides.filter((r: any) => r.tab === '4475')).toHaveLength(0);
    // disabled Book is shown normally (no faded opacity)
    expect(await book.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  });

  test('B3/B4 B2 cannot proceed without an entry point; the one tapped is stored @bar', async ({ page }) => {
    for (const [btn, ep, pill] of [['b2-offer', 'staff_offer', 'I offered'], ['b2-ask', 'guest_request', 'Guest asked']] as const) {
      await tonight(page);
      await bookRide(page).tap();
      await expect(page.getByTestId('b2-need-ep')).toBeVisible();
      await expect(page.getByTestId('b2-tab-4475')).toBeDisabled();
      await page.getByTestId('b2-tab-4475').tap({ force: true });
      await expect(page.locator('[data-screen=b2]')).toBeVisible();
      expect((await state(page)).bar.draft).toBeNull();
      await page.getByTestId(btn).tap();
      await page.getByTestId('b2-tab-4475').tap();
      await expect(page.getByTestId('b3-ep')).toHaveText(pill);
      expect((await state(page)).bar.draft.ep).toBe(ep);
      await page.getByTestId('b3-mode-staff').tap();
      await page.getByTestId('b3-dest-3100-clarendon-blvd').tap();
      await page.getByTestId('b3-saw').tap();
      await page.getByTestId('b3-book').tap();
      const r = (await state(page)).bar.rides.find((x: any) => x.tab === '4475');
      expect(r.entryPoint).toBe(ep);
      const keys = Object.keys(r).join(' ');
      expect(keys).not.toMatch(/reason|note|drink|condition/i);
    }
  });

  test('B5 nothing books on its own: a minute of open tabs adds no rides @bar', async ({ page }) => {
    await page.clock.install();
    await tonight(page);
    const before = (await state(page)).bar.rides.length;
    await page.clock.runFor(60_000);
    const s = await state(page);
    expect(s.bar.rides.length).toBe(before);
    expect(s.bookings).toHaveLength(0);
    expect(s.ride).toBeNull();
  });

  test('B6 double tap Book creates one ride @bar', async ({ page }) => {
    await tonight(page);
    await page.getByTestId('ask-4471').tap();
    const book = page.getByTestId('b3-book');
    await Promise.all([book.tap(), book.tap().catch(() => {})]);
    await expect(page.locator('[data-screen=booked]')).toBeVisible();
    const s = await state(page);
    expect(s.bar.rides.filter((r: any) => r.tab === '4471')).toHaveLength(1);
    expect(s.bookings).toHaveLength(1);
  });

  test('B7 price change before booking disables Book until re-seen ($23.50, cap $4.70) @bar', async ({ page }) => {
    await tonight(page);
    await page.getByTestId('ask-4471').tap();
    await expect(page.getByTestId('b3-book')).toBeEnabled();
    await page.getByTestId('b3-demo-e2').tap();
    await expect(page.getByTestId('b3-quote')).toHaveText('$23.50');
    await expect(page.getByTestId('b3-cap')).toHaveText('Final fare may differ by up to $4.70.');
    await expect(page.getByTestId('b3-price-changed')).toContainText('$21.00');
    await expect(page.getByTestId('b3-book')).toBeDisabled();
    await page.getByTestId('b3-saw').tap();
    await page.getByTestId('b3-book').tap();
    const r = (await state(page)).bar.rides.find((x: any) => x.tab === '4471');
    expect(r).toMatchObject({ quoteCents: 2350, capCents: 470 });
  });
});

test.describe('M2 handoff and live rides (Piper C)', () => {
  test('C1 same phone: booking Table 7 on B3 shows the same ride in the guest flow @bar', async ({ page }) => {
    await tonight(page);
    await page.getByTestId('ask-4468').tap();
    await expect(page.getByTestId('b3-book')).toBeDisabled();
    await page.getByTestId('b3-sim-reply').tap();
    await page.getByTestId('b3-book').tap();
    await expect(page.locator('[data-screen=booked]')).toBeVisible();
    await page.getByTestId('menu-btn').tap();
    await page.getByTestId('menu-guest').tap();
    await expect(page.locator('[data-screen=home]')).toBeVisible();
    await expect(page.getByTestId('active-headline')).toBeVisible();
    const s = await state(page);
    expect(s.role).toBe('guest');
    expect(s.ride).toMatchObject({ tab: '4468', entryPoint: 'guest_request', quoteCents: 2100 });
    expect(s.ride.pending).toBeFalsy();
  });

  test('C2 QR before booking carries tab, entry point and quote; after booking adds bookedAt; a second phone shows the same ride @bar', async ({ page, browser }) => {
    await tonight(page);
    await page.getByTestId('offer-4475').tap();
    await page.getByTestId('b3-mode-qr').tap();
    await expect(page.getByTestId('b3-qr').locator('svg')).toBeVisible();
    const pre = decode((await page.getByTestId('b3-qr-link').getAttribute('href'))!);
    expect(pre).toMatchObject({ tab: '4475', ep: 'staff_offer', q: 2100 });
    expect(pre.at).toBeUndefined();
    await page.getByTestId('b3-sim-reply').tap();
    await page.getByTestId('b3-book').tap();
    const href = (await page.getByTestId('booked-link').getAttribute('href'))!;
    await expect(page.getByTestId('booked-qr').locator('svg')).toBeVisible();
    const h = decode(href);
    const ride = (await state(page)).bar.rides.find((x: any) => x.tab === '4475');
    expect(h).toMatchObject({ tab: '4475', ep: 'staff_offer', q: 2100, at: ride.bookedAt });
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    const p2 = await ctx2.newPage();
    await p2.goto(href.replace(/^https?:\/\/[^/]+/, 'http://127.0.0.1:4173'));
    await expect(p2.locator('[data-screen=P4], [data-screen=P5]')).toBeVisible();
    const s2 = await p2.evaluate(() => (window as any).__ridenite.store.getState());
    expect(s2.ride).toMatchObject({ tab: '4475', entryPoint: 'staff_offer', quoteCents: 2100, bookedAt: ride.bookedAt });
    const [st1, st2] = await Promise.all([
      page.evaluate((id) => { const s = (window as any).__ridenite.store; return s.stageOf(s.barRides().find((r: any) => r.id === id)); }, ride.id),
      p2.evaluate(() => { const s = (window as any).__ridenite.store; return s.stageOf(s.getState().ride); }),
    ]);
    expect(st2).toBe(st1);
    await ctx2.close();
  });

  test('C3 B4 status chips advance; B4n "Car 2 min away" appears @bar', async ({ page }) => {
    await page.clock.install();
    await tonight(page);
    await page.getByTestId('ask-4471').tap();
    await page.getByTestId('b3-book').tap();
    await page.getByTestId('booked-live').tap();
    await expect(page.getByTestId('chip-4471')).toHaveText('Requested');
    await page.clock.runFor(8_500);
    await expect(page.getByTestId('chip-4471')).toContainText('Driver on the way');
    await page.clock.runFor(22_000);
    await expect(page.getByTestId('chip-4471')).toHaveText('2 min away');
    await expect(page.getByTestId('b4n-chip').filter({ hasText: 'Bar 3' })).toHaveText('Car 2 min away, Bar 3');
    await page.clock.runFor(15_000);
    await expect(page.getByTestId('chip-4471')).toHaveText('Arrived');
    await expect(page.getByTestId('b4n-chip').filter({ hasText: 'Bar 3' })).toHaveCount(0);
  });

  test('C3a legal status copy: "Ride requested" until the driver accepts, then "Ride booked. Fare on tab" @bar', async ({ page }) => {
    await page.clock.install();
    await tonight(page);
    await page.getByTestId('ask-4471').tap();
    await page.getByTestId('b3-book').tap();
    await expect(page.getByTestId('booked-title')).toContainText('Ride requested');
    await expect(page.getByTestId('booked-headline')).toHaveText('Ride requested. Finding a driver.');
    await expect(page.getByText(/Ride booked/)).toHaveCount(0);
    await page.clock.runFor(8_500);
    await expect(page.getByTestId('booked-title')).toContainText('Ride booked');
    await expect(page.getByTestId('booked-headline')).toHaveText('Ride booked. Fare on tab #4471.');
    await expect(page.getByText('Tab closed. Ride booked.')).toHaveCount(0);
    await nav(page, '/b/tab?tab=4471');
    await expect(page.getByTestId('b6-ride-headline')).toHaveText('Ride booked. Fare on tab #4471.');
  });

  test('C3b completed rides leave the board 10 minutes after completion @bar', async ({ page }) => {
    await page.clock.install();
    await open(page, '/b/live');
    await expect(page.getByTestId('ride-card-4472')).toBeVisible();
    await page.clock.runFor(60_000);
    await expect(page.getByTestId('chip-4472')).toHaveText('Completed');
    await page.clock.runFor(10 * 60_000 + 1_000);
    await expect(page.getByTestId('ride-card-4472')).toHaveCount(0);
  });

  test('C4 driver declined: banner with one-tap Rebook; rebook works (B4 and Tonight) @bar', async ({ page }) => {
    await open(page, '/b/live');
    const banner = page.getByTestId('decline-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toHaveAttribute('role', 'alert');
    expect((await page.getByTestId('b4-rebook-4476').boundingBox())!.height).toBeGreaterThanOrEqual(56);
    await page.getByTestId('b4-rebook-4476').tap();
    await expect(banner).toHaveCount(0);
    await expect(page.getByTestId('chip-4476')).toHaveText('Requested');
    // Tonight card path
    await tonight(page);
    await page.getByTestId('rebook-4476').tap();
    await expect(page.getByTestId('status-4476')).toHaveText('Requested');
  });

  test('C5 B9 plate card from Live; B10 quiet request with venue procedure first @bar', async ({ page }) => {
    await open(page, '/b/live');
    await page.getByTestId('b4-plate-4472').tap();
    await expect(page.getByTestId('b9-plate')).toHaveText('T555031C');
    const plate = (await page.getByTestId('b9-plate').boundingBox())!;
    expect(plate.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(await page.getByTestId('b9-plate').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
    await page.getByTestId('b9-done').tap();
    await tonight(page);
    await expect(page.getByTestId('quiet-banner')).toHaveAttribute('role', 'status');
    await page.getByTestId('quiet-open').tap();
    const proc = (await page.getByTestId('b10-procedure').boundingBox())!;
    const book = (await page.getByTestId('b10-book').boundingBox())!;
    expect(proc.y + proc.height).toBeLessThanOrEqual(book.y);
    expect(book.height).toBeGreaterThanOrEqual(64);
    await page.getByTestId('b10-side').tap();
    await expect(page.getByTestId('b10-side')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('b10-book').tap();
    await expect(page.getByTestId('b3-ep')).toHaveText('Guest asked');
    await expect(page.getByTestId('b3-guest')).toContainText('side door');
  });

  test('C5b Mark seen clears the banner; a guest quiet request reaches the bar @bar', async ({ page }) => {
    await open(page, '/b/quiet');
    await page.getByTestId('b10-seen').tap();
    await expect(page.locator('[data-screen=b1]')).toBeVisible();
    await expect(page.getByTestId('quiet-banner')).toHaveCount(0);
    await store(page, "s.sendQuietRequest('Table 7')");
    await expect(page.getByTestId('quiet-banner')).toContainText('Table 7');
  });
});

async function bookMaya(page: Page, accept = true) {
  await page.clock.install();
  await tonight(page);
  await page.getByTestId('ask-4468').tap();
  await page.getByTestId('b3-sim-reply').tap();
  await page.getByTestId('b3-book').tap();
  await expect(page.locator('[data-screen=booked]')).toBeVisible();
  if (accept) await page.clock.runFor(8_500); // driver accepts; lines post to the tab now
}

test.describe('M2 tab detail B6 (Piper D)', () => {
  test('D1 to D5 ride lines on Table 7 ($49.00 tab) @bar', async ({ page }) => {
    await bookMaya(page, false);
    await nav(page, '/b/tab?tab=4468');
    // finding a driver: nothing on the tab yet
    await expect(page.getByTestId('b6-not-yet')).toBeVisible();
    await expect(page.getByTestId('b6-ride_quote')).toHaveCount(0);
    await expect(page.getByTestId('b6-record')).toHaveCount(0);
    await page.clock.runFor(8_500);
    const q = page.getByTestId('b6-ride_quote');
    await expect(q).toContainText('Courtesy car, quoted fare');
    await expect(q).toContainText('$21.00');
    await expect(page.getByTestId('b6-ride_adjustment')).toHaveCount(0);
    await expect(page.getByTestId('b6-tip-base')).toContainText('$49.00');
    await page.getByTestId('b6-finish').tap();
    // higher (default)
    await expect(page.getByTestId('b6-ride_adjustment')).toContainText('Ride fare adjustment (final fare $24.60, quoted $21.00)');
    await expect(page.getByTestId('b6-ride_adjustment')).toContainText('+$3.60');
    await expect(page.getByTestId('b6-ride_quote')).toContainText('$21.00');
    await expect(page.getByTestId('b6-total')).toContainText('$78.99');
    // lower
    await page.getByTestId('b6-scen-lower').tap();
    await expect(page.getByTestId('b6-ride_credit')).toContainText('-$2.10');
    await expect(page.getByTestId('b6-total')).toContainText('$73.29');
    // over cap
    await page.getByTestId('b6-scen-over').tap();
    await expect(page.getByTestId('b6-ride_adjustment')).toContainText('+$4.20');
    await expect(page.getByTestId('b6-ride_held')).toContainText('$2.20');
    await expect(page.getByTestId('b6-ride_held')).toContainText('not charged to the bar');
    await expect(page.getByTestId('b6-total')).toContainText('$79.59');
    await expect(page.getByTestId('b6-tip-base')).toContainText('$49.00');
  });

  test('D6 Close tab now and Hold for morning both work @bar', async ({ page }) => {
    await open(page, '/b/tab?tab=4471');
    for (const id of ['b6-close', 'b6-hold']) expect((await page.getByTestId(id).boundingBox())!.height).toBeGreaterThanOrEqual(56);
    await page.getByTestId('b6-close').tap();
    await expect(page.getByTestId('b6-closed')).toHaveText('Tab closed.');
    expect((await state(page)).bar.tabs.find((t: any) => t.tab === '4471').close).toBe('closed');
    await nav(page, '/b/tab?tab=4475');
    await page.getByTestId('b6-hold').tap();
    await expect(page.getByTestId('b6-closed')).toContainText('Held for morning checkout');
    expect((await state(page)).bar.tabs.find((t: any) => t.tab === '4475').close).toBe('held');
  });

  test('D7 staff booking reads "Booked by staff, price shown to guest", never "Confirmed by guest" @bar', async ({ page }) => {
    await page.clock.install();
    await tonight(page);
    await page.getByTestId('offer-4475').tap();
    await page.getByTestId('b3-mode-staff').tap();
    await page.getByTestId('b3-dest-3100-clarendon-blvd').tap();
    await page.getByTestId('b3-saw').tap();
    await page.getByTestId('b3-book').tap();
    await page.clock.runFor(8_500);
    await nav(page, '/b/tab?tab=4475');
    const rec = page.getByTestId('b6-record');
    await expect(rec).toContainText(/Booked by staff, price shown to guest, \d{1,2}:\d{2} [AP]M/);
    await expect(rec).toContainText('Quote $21.00, may differ by up to $4.20');
    await expect(rec).not.toContainText('Confirmed by guest');
    const c = (await state(page)).confirmations.find((x: any) => x.tab === '4475');
    expect(c).toMatchObject({ by: 'staff', method: 'staff_saw_price', quoteCents: 2100, capCents: 420 });
  });

  test('D7 guest said yes on their phone: "Confirmed by guest" @bar', async ({ page }) => {
    await bookMaya(page);
    await nav(page, '/b/tab?tab=4468');
    await expect(page.getByTestId('b6-record')).toContainText(/^.*Confirmed by guest, \d{1,2}:\d{2} [AP]M/);
  });

  test('D7 guest slide on their own phone shows on B6 only after the 10 s undo; undone leaves nothing @bar', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await slide(page);
    await nav(page, '/b/tab?tab=4468');
    await expect(page.getByTestId('b6-ride_quote')).toHaveCount(0);
    await expect(page.getByTestId('b6-record')).toHaveCount(0);
    await page.clock.runFor(10_500);
    await expect(page.getByTestId('b6-record')).toHaveCount(0); // logged, but shown only once a driver accepts
    await page.clock.runFor(8_000);
    await expect(page.getByTestId('b6-record')).toContainText('Confirmed by guest');
    // undone path
    await fresh(page, '/g/p3');
    await slide(page);
    await page.clock.runFor(2_000);
    await page.getByTestId('undo').tap();
    await page.clock.runFor(10_500);
    await nav(page, '/b/tab?tab=4468');
    await expect(page.getByTestId('b6-ride_quote')).toHaveCount(0);
    await expect(page.getByTestId('b6-record')).toHaveCount(0);
  });
});

test.describe('M2 settings and reset (Piper E)', () => {
  test('E1 price display, receipt and tab line name change what the guest sees @bar', async ({ page }) => {
    await open(page, '/b/settings');
    await page.getByTestId('set-line-RideNite Ride').tap();
    await page.getByTestId('set-receipt-detailed').tap();
    await page.getByTestId('set-price-venue_perk').tap();
    await nav(page, '/g/p9');
    await expect(page.getByTestId('ride-line')).toContainText('RideNite Ride, quoted fare');
    await nav(page, '/g/m1');
    await expect(page.getByTestId('m1-subject')).toHaveText('Your receipt from Maison Cheryl: tab and RideNite Ride ride');
    await nav(page, '/g/p3');
    await expect(page.getByTestId('perk-line')).toContainText('first $10.00 on us');
    await nav(page, '/b/settings');
    await page.getByTestId('set-receipt-neutral').tap();
    await page.getByTestId('set-price-fare_on_tab').tap();
    await nav(page, '/g/m1');
    await expect(page.getByTestId('m1-subject')).toHaveText('Your receipt from Maison Cheryl');
    await nav(page, '/g/p3');
    await expect(page.getByTestId('perk-line')).toHaveCount(0);
  });

  test('E2 Reset demo data returns to seed @bar', async ({ page }) => {
    await bookMaya(page);
    await nav(page, '/b/settings');
    await page.getByTestId('set-receipt-detailed').tap();
    await page.getByTestId('b8-reset').tap();
    await page.getByTestId('b8-reset-confirm').tap();
    await expect(page.locator('[data-screen=b0]')).toBeVisible();
    const s = await state(page);
    expect(s.ride).toBeNull();
    expect(s.bar.settings.receipt).toBe('neutral');
    expect(s.bar.rides).toHaveLength(3);
    expect(s.bookings).toHaveLength(0);
  });

  test('B0 shows once per load; role switcher from the guest menu @bar', async ({ page }) => {
    await open(page, '/g/home');
    await page.getByTestId('menu-btn').tap();
    await page.getByTestId('menu-bar').tap();
    await expect(page.locator('[data-screen=b0]')).toBeVisible();
    await page.getByTestId('b0-tonight').tap();
    await expect(page.locator('[data-screen=b1]')).toBeVisible();
    expect((await state(page)).role).toBe('bartender');
    await nav(page, '/b');
    await expect(page.locator('[data-screen=b1]')).toBeVisible();
  });
});

test.describe('iPad layout (UI spec 7)', () => {
  test('left nav, card grid and booking sheet as a 520 px drawer over Tonight @bar', async ({ page }) => {
    test.skip(!wide(page), 'tablet only');
    await tonight(page);
    const nav = (await page.getByTestId('bar-tabbar').boundingBox())!;
    expect(nav.x).toBeLessThan(10);
    expect(nav.height).toBeGreaterThan(nav.width);
    await expect(page.getByTestId('bar-book-top')).toBeVisible();
    const a = (await page.getByTestId('tab-card-4471').boundingBox())!;
    const cards = await page.locator('[data-testid^=tab-card-]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
    expect(cards.filter((y) => y === Math.round(a.y)).length).toBeGreaterThan(1);
    await page.getByTestId('ask-4471').tap();
    const drawer = (await page.locator('.bdrawer').boundingBox())!;
    expect(Math.round(drawer.width)).toBe(520);
    expect(Math.round(drawer.x + drawer.width)).toBe(1024);
    await expect(page.locator('[data-screen=b1]')).toBeAttached();
    await expect(page.getByTestId('b3-book')).toBeInViewport({ ratio: 1 });
  });
});
