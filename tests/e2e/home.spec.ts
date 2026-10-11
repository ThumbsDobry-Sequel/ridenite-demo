import { expect, test } from '@playwright/test';
import { inViewport, nav, open, state, store, tapper, slide } from './helpers';

test.describe('home @sizes', () => {
  test('Ride home is the biggest tappable element, >= 88px, fully in view on load', async ({ page }) => {
    await page.goto('/');
    const btn = page.getByTestId('ride-home');
    await expect(btn).toBeVisible();
    const { box, inside } = await inViewport(page, 'ride-home');
    expect(inside).toBe(true);
    expect(box.height).toBeGreaterThanOrEqual(88);
    const areas = await page.$$eval('button, a[href], input, select, [role=button]', (els) =>
      els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => {
        const r = e.getBoundingClientRect();
        return { id: (e as HTMLElement).dataset.testid ?? e.textContent?.trim(), area: r.width * r.height };
      }));
    const max = areas.reduce((a, b) => (b.area > a.area ? b : a));
    expect(max.id).toBe('ride-home');
    // pinned in the bottom third, just above the safe area (Riley p1-home-v2)
    const vp = page.viewportSize()!;
    expect(box.y + box.height).toBeGreaterThan(vp.height * (2 / 3));
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
    expect(box.height).toBeGreaterThanOrEqual(132);
    // width flexes to 16px gutters
    expect(Math.round(box.x)).toBe(16);
    expect(Math.round(vp.width - (box.x + box.width))).toBe(16);
    // guest Menu button is 56px
    const menu = (await page.getByTestId('menu-btn').boundingBox())!;
    expect(menu.height).toBeGreaterThanOrEqual(56);
    // stays pinned when the page scrolls
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const after = (await btn.boundingBox())!;
    expect(after.y + after.height).toBeGreaterThan(vp.height * (2 / 3));
    expect(after.y + after.height).toBeLessThanOrEqual(vp.height);
  });

  test('no other control is amber (primary) on home', async ({ page }) => {
    await page.goto('/');
    const primaries = await page.$$eval('button, a[href]', (els) => {
      const amber = getComputedStyle(document.querySelector('[data-testid=ride-home]')!).backgroundColor;
      return els.filter((e) => getComputedStyle(e).backgroundColor === amber).map((e) => (e as HTMLElement).dataset.testid ?? e.textContent);
    });
    expect(primaries).toEqual(['ride-home']);
  });

  test('launch to booked: one tap on Ride home plus one slide', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    const t = tapper(page);
    await t.tap('ride-home');
    await slide(page);
    await expect(page.getByTestId('undo')).toBeVisible();
    await page.clock.runFor(10_500);
    await expect(page.locator('[data-screen=P4]')).toBeVisible();
    expect(t.count).toBe(1); // one tap, then the slide
    expect((await state(page)).bookings).toHaveLength(1);
  });

  test('Undo is outlined, 88px, visible the full 10 s with a countdown; undo leaves nothing booked', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.getByTestId('ride-home').tap();
    await slide(page);
    const undo = page.getByTestId('undo');
    await expect(undo).toBeVisible();
    expect((await undo.boundingBox())!.height).toBeGreaterThanOrEqual(88);
    expect((await inViewport(page, 'undo')).inside).toBe(true);
    // Vera rev 03 undo copy
    await expect(page.getByTestId('status-requesting')).toHaveText('Requesting your ride...');
    await expect(page.getByTestId('undo-quote')).toHaveText('$21.00 quote to Westover area.');
    await expect(page.getByTestId('undo-line-1')).toHaveText('Nothing is requested yet.');
    await expect(page.getByTestId('undo-line-2')).toHaveText('We request your ride when the timer ends.');
    await expect(page.getByText('Requesting in a moment.')).toHaveCount(0);
    await expect(page.getByTestId('undo-countdown')).toHaveText('10');
    await page.clock.runFor(5_000);
    await expect(page.getByTestId('undo-countdown')).toHaveText('5');
    await page.clock.runFor(2_000);
    await expect(page.getByTestId('undo-soon')).toHaveText('Requesting in a moment.');
    await page.clock.runFor(2_000);
    await expect(undo).toBeVisible();
    await undo.tap();
    await expect(page.getByTestId('ride-home')).toBeVisible();
    await expect(page.getByTestId('toast')).toContainText('Nothing was booked');
    await page.clock.runFor(20_000);
    const s = await state(page);
    expect(s.ride).toBeNull();
    expect(s.bookings).toHaveLength(0);
  });

  test('backgrounding past the deadline books exactly once (visibilitychange)', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await slide(page);
    await page.clock.fastForward(30_000);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.clock.runFor(1_000);
    expect((await state(page)).bookings).toHaveLength(1);
  });

  test('no duplicate rides: Ride home hidden while a ride is active, back after completion', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.getByTestId('ride-home').tap();
    await slide(page);
    await page.getByTestId('menu-btn').tap();
    await page.getByRole('button', { name: 'Home', exact: true }).tap();
    await expect(page.getByTestId('ride-home')).toHaveCount(0);
    await expect(page.getByTestId('ride-card')).toBeVisible();
    for (const ms of [11_000, 10_000, 25_000, 15_000, 15_000]) {
      await page.clock.runFor(ms);
      await nav(page, '/g/home');
      await expect(page.getByTestId('ride-home')).toHaveCount(0);
    }
    await page.clock.fastForward(15 * 60_000); // complete (14 min trip, Oct 11)
    await page.clock.runFor(1_000);
    await nav(page, '/g/home');
    await expect(page.getByTestId('ride-home')).toBeVisible();
    // direct store guard
    expect(await store(page, "return s.getState().bookings.length")).toBe(1);
  });

  test('Confirm shows destination, $21.00 and the $4.20 line without scrolling, above sticky actions @sizes', async ({ page }) => {
    await open(page, '/g/p3');
    await expect(page.getByTestId('quote')).toHaveText('$21.00');
    await expect(page.getByTestId('cap-line')).toContainText('$4.20');
    const actions = await page.locator('.sticky-actions').boundingBox();
    for (const id of ['confirm-dest', 'riders', 'quote', 'cap-line', 'tab-line', 'confirm']) {
      expect((await inViewport(page, id)).inside, `${id} in viewport`).toBe(true);
    }
    const cancel = page.locator('[data-testid=cancel]:visible');
    await expect(cancel).toHaveCount(1);
    await expect(cancel).toBeInViewport({ ratio: 1 });
    expect((await cancel.boundingBox())!.height).toBeGreaterThanOrEqual(56);
    // Who's riding sits in the top card, above the price
    const riders = (await page.getByTestId('riders').boundingBox())!;
    expect(riders.y + riders.height).toBeLessThanOrEqual((await page.getByTestId('quote').boundingBox())!.y);
    const cap = (await page.getByTestId('cap-line').boundingBox())!;
    expect(cap.y + cap.height).toBeLessThanOrEqual(actions!.y + 1);
    expect((await page.getByTestId('confirm').boundingBox())!.height).toBeGreaterThanOrEqual(88);
  });

  test('Confirm: only the Pickup card may scroll behind the pinned slider @sizes', async ({ page }) => {
    await open(page, '/g/p3');
    const straddling = await page.evaluate(() => {
      const foot = document.querySelector('[data-screen=P3] .sticky-actions')!.getBoundingClientRect();
      const els = Array.from(document.querySelectorAll('main p, main h1, main h2, main h3, main button, main a, main .seg, main .card, main .banner'))
        .filter((e) => !e.closest('.sticky-actions') && !e.closest('.pickup-card') && (e as HTMLElement).offsetParent !== null);
      return els.filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.top < foot.top - 0.5 && r.bottom > foot.top + 0.5; })
        .map((e) => `${e.tagName}.${e.className} "${(e.textContent ?? '').trim().slice(0, 30)}"`);
    });
    expect(straddling).toEqual([]);
  });

  test('taps on the slider never book (two fast taps from home)', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.getByTestId('ride-home').tap();
    await page.clock.runFor(100);
    await page.getByTestId('confirm-thumb').tap();
    await page.getByTestId('confirm-thumb').tap();
    await page.getByTestId('confirm').tap();
    await page.clock.runFor(15_000);
    const s = await state(page);
    expect(s.ride).toBeNull();
    expect(s.bookings).toHaveLength(0);
    await expect(page.locator('[data-screen=P3]')).toBeVisible();
  });

  test('quote older than 5 minutes refreshes before booking and needs Confirm again', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await store(page, 's.setPriceMovesOnRefresh(true)');
    await page.clock.fastForward(301_000);
    await slide(page);
    await expect(page.getByText('The price was updated')).toBeVisible();
    await expect(page.getByTestId('quote')).toHaveText('$23.50');
    await expect(page.getByTestId('cap-line')).toContainText('$4.70');
    expect((await state(page)).ride).toBeNull();
    await page.clock.runFor(1_000);
    await slide(page);
    await expect(page.getByTestId('undo')).toBeVisible();
    expect((await state(page)).ride.quoteCents).toBe(2350);
  });

  test('200% text: no horizontal scroll and Ride home still reachable', async ({ page }) => {
    await page.goto('/');
    await page.addStyleTag({ content: 'html{font-size:200% !important}' });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over).toBeLessThanOrEqual(0);
    await page.getByTestId('ride-home').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('ride-home')).toBeInViewport();
    const fits = await page.getByTestId('ride-home').evaluate((b) => b.scrollWidth <= b.clientWidth + 1);
    expect(fits).toBe(true);
  });
});
