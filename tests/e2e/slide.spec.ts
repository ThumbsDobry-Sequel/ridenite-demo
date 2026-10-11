import { expect, test } from '@playwright/test';
import { open, slide, state } from './helpers';

const transformX = (page: import('@playwright/test').Page) =>
  page.getByTestId('confirm-thumb').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);

test.describe('hold-and-slide confirm @sizes', () => {
  test('track >= 88px, big thumb inset >= 24px from the screen edge, touch-action none on the track only', async ({ page }) => {
    await open(page, '/g/p3');
    const track = (await page.getByTestId('confirm').boundingBox())!;
    const thumb = (await page.getByTestId('confirm-thumb').boundingBox())!;
    expect(track.height).toBeGreaterThanOrEqual(88);
    expect(thumb.height).toBeGreaterThanOrEqual(64);
    expect(thumb.x).toBeGreaterThanOrEqual(24);
    expect(track.width).toBeGreaterThan(page.viewportSize()!.width * 0.8);
    expect(await page.getByTestId('confirm').evaluate((e) => getComputedStyle(e).touchAction)).toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('main')!).touchAction)).not.toBe('none');
    expect(await page.evaluate(() => getComputedStyle(document.body).touchAction)).not.toBe('none');
  });

  test('partial slide (50%) snaps back and does not book', async ({ page }) => {
    await open(page, '/g/p3');
    await slide(page, 'confirm', 0.5);
    await expect.poll(() => transformX(page)).toBe(0);
    await expect(page.getByTestId('confirm')).toHaveAttribute('data-progress', '0.00');
    expect((await state(page)).ride).toBeNull();
    await expect(page.locator('[data-screen=P3]')).toBeVisible();
  });

  test('slide past ~70% books once; repeat slides and actions do not add a ride', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await slide(page, 'confirm', 0.75);
    await expect(page.getByTestId('undo')).toBeVisible();
    await page.clock.runFor(11_000);
    const s = await state(page);
    expect(s.bookings).toHaveLength(1);
    expect(s.confirmations).toHaveLength(1);
    expect(s.confirmations[0]).toMatchObject({ method: 'slide', by: 'guest', quoteCents: 2100, capCents: 420, entryPoint: 'guest_request' });
  });

  test('quote and cap line stay visible and uncovered while sliding', async ({ page }) => {
    await open(page, '/g/p3');
    await slide(page, 'confirm', 0.6, { release: false });
    for (const id of ['quote', 'cap-line', 'tab-line']) {
      await expect(page.getByTestId(id)).toBeInViewport({ ratio: 1 });
      const hit = await page.getByTestId(id).evaluate((el) => {
        const r = el.getBoundingClientRect();
        const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!h && el.contains(h);
      });
      expect(hit, `${id} not covered`).toBe(true);
    }
    expect(Number(await page.getByTestId('confirm').getAttribute('data-progress'))).toBeGreaterThan(0.4);
    await page.mouse.up();
  });

  test('accessible "Confirm ride" action books directly (VoiceOver / Switch Control / keyboard)', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    const btn = page.getByRole('button', { name: /^Confirm ride/ });
    await expect(btn).toHaveCount(1);
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('undo')).toBeVisible();
    await page.clock.runFor(11_000);
    const s = await state(page);
    expect(s.bookings).toHaveLength(1);
    expect(s.confirmations[0].method).toBe('a11y');
  });

  test('1 s long press on the thumb books, with visible progress', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    const b = (await page.getByTestId('confirm-thumb').boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.clock.runFor(500);
    const mid = Number(await page.getByTestId('confirm').getAttribute('data-progress'));
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.8);
    await expect(page.locator('.slide__ring')).toBeVisible();
    await expect(page.getByTestId('confirm')).toContainText('Keep holding');
    await page.clock.runFor(600);
    await page.mouse.up();
    await expect(page.getByTestId('undo')).toBeVisible();
    await page.clock.runFor(11_000);
    const s = await state(page);
    expect(s.bookings).toHaveLength(1);
    expect(s.confirmations[0].method).toBe('long_press');
  });

  test('releasing a long press early does not book', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    const b = (await page.getByTestId('confirm-thumb').boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.clock.runFor(600);
    await page.mouse.up();
    await page.clock.runFor(2_000);
    expect((await state(page)).ride).toBeNull();
    await expect(page.getByTestId('confirm')).toHaveAttribute('data-progress', '0.00');
  });
});

test('Reduce Motion: early release snaps back instantly, no glow', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await open(page, '/g/p3');
  expect(await page.getByTestId('confirm-thumb').evaluate((e) => getComputedStyle(e).transitionDuration)).toMatch(/^0s/);
  await slide(page, 'confirm', 0.5);
  expect(await transformX(page)).toBe(0);
  expect(await page.getByTestId('confirm').evaluate((e) => getComputedStyle(e).boxShadow)).toBe('none');
  await ctx.close();
});

test('confirm record: none during the undo window, "Confirmed by guest, 11:42 PM" after it ends (H31, D7)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-10T03:42:00Z') }); // 11:42 PM ET
  await open(page, '/g/p3');
  await slide(page);
  // logged immediately with the on-screen quote and cap
  const s0 = await state(page);
  expect(s0.confirmations).toHaveLength(1);
  expect(s0.confirmations[0]).toMatchObject({ quoteCents: 2100, capCents: 420, by: 'guest' });
  await page.evaluate(() => { location.hash = '/g/p9'; });
  await expect(page.getByTestId('confirm-record')).toHaveCount(0);
  await expect(page.getByTestId('no-ride-line')).toBeVisible();
  await page.clock.runFor(10_500);
  await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:42 PM');
  await expect(page.getByTestId('confirm-record-amounts')).toContainText('$21.00');
  await expect(page.getByTestId('confirm-record-amounts')).toContainText('$4.20');
  await page.evaluate(() => { location.hash = '/g/p10'; });
  await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:42 PM');
});

test('undone slide leaves no record line and no charge line', async ({ page }) => {
  await page.clock.install();
  await open(page, '/g/p3');
  await slide(page);
  await page.clock.runFor(2_000);
  await page.getByTestId('undo').tap();
  await page.clock.runFor(20_000);
  await page.evaluate(() => { location.hash = '/g/p9'; });
  await expect(page.getByTestId('confirm-record')).toHaveCount(0);
  await expect(page.getByTestId('ride-line')).toHaveCount(0);
  await expect(page.getByTestId('adj-line')).toHaveCount(0);
  await expect(page.getByTestId('total')).toHaveText('$64.19'); // $49.00 + $5.39 tax + $9.80 tip, no ride
  await page.evaluate(() => { location.hash = '/g/p10'; });
  await expect(page.getByTestId('confirm-record')).toHaveCount(0);
});

test('record keeps the quote snapshot from the slide even if the quote is refreshed later', async ({ page }) => {
  await page.clock.install();
  await open(page, '/g/p3');
  await slide(page);
  await page.clock.runFor(10_500);
  await page.evaluate(() => { const s = (window as any).__ridenite.store; s.setPriceMovesOnRefresh(true); s.refreshQuote(); });
  expect((await state(page)).quoteCents).toBe(2350);
  await page.evaluate(() => { location.hash = '/g/p9'; });
  await expect(page.getByTestId('confirm-record-amounts')).toHaveText('Quote $21.00, may differ by up to $4.20, as shown at the time.');
});

test('slide after a 2 min re-quote records the new quote and cap', async ({ page }) => {
  await page.clock.install();
  await open(page, '/g/p3');
  await page.evaluate(() => (window as any).__ridenite.store.setPriceMovesOnRefresh(true));
  await page.clock.fastForward(121_000);
  await slide(page); // refreshes, shows the new price, does not book
  expect((await state(page)).confirmations).toHaveLength(0);
  await slide(page);
  await page.clock.runFor(10_500);
  expect((await state(page)).confirmations[0]).toMatchObject({ quoteCents: 2350, capCents: 470 });
});

test('staff booking wording: "Booked by staff, price shown to guest, h:mm PM"', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-10T03:42:00Z') });
  await open(page, '/g/home');
  await page.evaluate(() => { const s = (window as any).__ridenite.store; s.createRide('staff', { method: 'staff_saw_price', by: 'staff' }); });
  await page.clock.runFor(10_500);
  await page.evaluate(() => { location.hash = '/g/p9'; });
  await expect(page.getByTestId('confirm-record')).toHaveText('Booked by staff, price shown to guest, 11:42 PM');
  await expect(page.getByTestId('confirm-record')).not.toContainText('Confirmed by guest');
});

test('Undo ignores a finger still down from the confirm; a fresh tap works (H17)', async ({ page }) => {
  await page.clock.install();
  await open(page, '/g/p3');
  const b = (await page.getByTestId('confirm-thumb').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.clock.runFor(1_100); // long press completes while the finger is still down
  await expect(page.getByTestId('undo')).toBeVisible();
  await page.clock.runFor(1_000);
  const u = (await page.getByTestId('undo').boundingBox())!;
  await page.mouse.move(u.x + u.width / 2, u.y + u.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.getByTestId('undo').dispatchEvent('click'); // a click with no fresh pointerdown
  expect((await state(page)).ride).not.toBeNull();
  await page.getByTestId('undo').tap(); // fresh touch
  await expect(page.getByTestId('ride-home')).toBeVisible();
  expect((await state(page)).ride).toBeNull();
});

test('Undo sits right under the countdown card', async ({ page }) => {
  await page.clock.install();
  await open(page, '/g/p3');
  await slide(page);
  const card = (await page.locator('[data-screen=P4-undo] .card').boundingBox())!;
  const undo = (await page.getByTestId('undo').boundingBox())!;
  expect(undo.y).toBeGreaterThanOrEqual(card.y + card.height);
  expect(undo.y - (card.y + card.height)).toBeLessThan(40);
});

test('dispute record falls back to the sample night, labeled sample data', async ({ page }) => {
  await open(page, '/g/p9');
  await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:11 PM (sample data)');
});
