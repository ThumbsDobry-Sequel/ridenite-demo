import { expect, test } from '@playwright/test';
import { inViewport, nav, open, state, store, tapper } from './helpers';

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
    // thumb reach: the button's center sits in the lower 75% of the screen
    const vp = page.viewportSize()!;
    expect(box.y + box.height / 2).toBeGreaterThan(vp.height * 0.25);
  });

  test('no other control is amber (primary) on home', async ({ page }) => {
    await page.goto('/');
    const primaries = await page.$$eval('button, a[href]', (els) => {
      const amber = getComputedStyle(document.querySelector('[data-testid=ride-home]')!).backgroundColor;
      return els.filter((e) => getComputedStyle(e).backgroundColor === amber).map((e) => (e as HTMLElement).dataset.testid ?? e.textContent);
    });
    expect(primaries).toEqual(['ride-home']);
  });

  test('launch to booked in exactly 2 taps', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    const t = tapper(page);
    await t.tap('ride-home');
    await t.tap('confirm');
    await expect(page.getByTestId('undo')).toBeVisible();
    await page.clock.runFor(10_500);
    await expect(page.locator('[data-screen=P4]')).toBeVisible();
    expect(t.count).toBe(2);
    expect((await state(page)).bookings).toHaveLength(1);
  });

  test('Confirm double tap books once', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await page.getByTestId('confirm').dblclick();
    await page.clock.runFor(11_000);
    await expect(page.locator('[data-screen=P4]')).toBeVisible(); // second tap did not hit Undo
    const s = await state(page);
    expect(s.bookings).toHaveLength(1);
    expect(s.consents).toHaveLength(1);
  });

  test('Undo is outlined, 88px, visible the full 10 s with a countdown; undo leaves nothing booked', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.getByTestId('ride-home').tap();
    await page.getByTestId('confirm').tap();
    const undo = page.getByTestId('undo');
    await expect(undo).toBeVisible();
    expect((await undo.boundingBox())!.height).toBeGreaterThanOrEqual(88);
    expect((await inViewport(page, 'undo')).inside).toBe(true);
    await expect(page.getByText('Nothing is booked yet.', { exact: false })).toBeVisible();
    await expect(page.getByTestId('undo-countdown')).toHaveText('10');
    await page.clock.runFor(5_000);
    await expect(page.getByTestId('undo-countdown')).toHaveText('5');
    await page.clock.runFor(4_000);
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
    await page.getByTestId('confirm').tap();
    await page.clock.fastForward(30_000);
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.clock.runFor(1_000);
    expect((await state(page)).bookings).toHaveLength(1);
  });

  test('no duplicate rides: Ride home hidden while a ride is active, back after completion', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.getByTestId('ride-home').tap();
    await page.getByTestId('confirm').tap();
    await page.getByTestId('menu-btn').tap();
    await page.getByRole('button', { name: 'Home', exact: true }).tap();
    await expect(page.getByTestId('ride-home')).toHaveCount(0);
    await expect(page.getByTestId('ride-card')).toBeVisible();
    for (const ms of [11_000, 10_000, 25_000, 15_000, 15_000]) {
      await page.clock.runFor(ms);
      await nav(page, '/g/home');
      await expect(page.getByTestId('ride-home')).toHaveCount(0);
    }
    await page.clock.runFor(60_000); // complete
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
    for (const id of ['confirm-dest', 'quote', 'cap-line', 'tab-line', 'confirm', 'cancel']) {
      expect((await inViewport(page, id)).inside, `${id} in viewport`).toBe(true);
    }
    const cap = (await page.getByTestId('cap-line').boundingBox())!;
    expect(cap.y + cap.height).toBeLessThanOrEqual(actions!.y + 1);
    expect((await page.getByTestId('confirm').boundingBox())!.height).toBeGreaterThanOrEqual(88);
    expect((await page.getByTestId('cancel').boundingBox())!.height).toBeGreaterThanOrEqual(56);
  });

  test('quote older than 2 minutes refreshes before booking and needs Confirm again', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await store(page, 's.setPriceMovesOnRefresh(true)');
    await page.clock.fastForward(121_000);
    await page.getByTestId('confirm').tap();
    await expect(page.getByText('The price was updated')).toBeVisible();
    await expect(page.getByTestId('quote')).toHaveText('$23.50');
    await expect(page.getByTestId('cap-line')).toContainText('$4.70');
    expect((await state(page)).ride).toBeNull();
    await page.clock.runFor(1_000);
    await page.getByTestId('confirm').tap();
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
