import { expect, test } from '@playwright/test';
import { nav, open, slide, state, store } from './helpers';

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
        // inline spans wrap: probe the middle of every line box
        return Array.from(el.getClientRects()).every((r) => {
          const h = document.elementFromPoint(r.left + Math.min(r.width / 2, 20), r.top + r.height / 2);
          return !!h && (el.contains(h) || h.contains(el));
        });
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

test('confirm record: logged when the undo ends, shown with the fare line only at pickup (H31, D7)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-10T03:42:00Z') }); // 11:42 PM ET
  await open(page, '/g/p3');
  await slide(page);
  // not logged during the undo window (the slide itself is noted)
  const s0 = await state(page);
  expect(s0.confirmations).toHaveLength(0);
  expect(s0.slides).toHaveLength(1);
  await page.evaluate(() => { location.hash = '/g/p9'; });
  await expect(page.getByTestId('confirm-record')).toHaveCount(0);
  await expect(page.getByTestId('no-ride-line')).toBeVisible();
  await page.clock.runFor(10_500);
  // logged at the end of the undo, with the slide time and on-screen quote and cap; still nothing on the tab
  const s1 = await state(page);
  expect(s1.confirmations).toHaveLength(1);
  expect(s1.confirmations[0]).toMatchObject({ quoteCents: 2100, capCents: 420, by: 'guest', at: s0.slides[0].at });
  await expect(page.getByTestId('confirm-record')).toHaveCount(0);
  await expect(page.getByTestId('ride-line')).toHaveCount(0);
  await page.clock.runFor(8_000); // driver accepts: still nothing on the tab
  await expect(page.getByTestId('ride-line')).toHaveCount(0);
  await expect(page.getByTestId('confirm-record')).toHaveCount(0);
  await page.clock.fastForward(352_000); // picked up: record and fare line together
  await expect(page.getByTestId('ride-line')).toBeVisible();
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
  await page.clock.runFor(10_500); await page.clock.fastForward(360_000);
  await page.evaluate(() => { const s = (window as any).__ridenite.store; s.setPriceMovesOnRefresh(true); s.refreshQuote(); });
  expect((await state(page)).quoteCents).toBe(2350);
  await page.evaluate(() => { location.hash = '/g/p9'; });
  await expect(page.getByTestId('confirm-record-amounts')).toHaveText('Quote $21.00, may differ by up to $4.20, as shown at the time.');
});

test('slide after a 5 min re-quote records the new quote and cap', async ({ page }) => {
  await page.clock.install();
  await open(page, '/g/p3');
  await page.evaluate(() => (window as any).__ridenite.store.setPriceMovesOnRefresh(true));
  await page.clock.fastForward(301_000);
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
  await page.clock.runFor(10_500); await page.clock.fastForward(360_000);
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

test('dispute record falls back to the sample night, labeled sample data (times relative to now)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-10T03:42:00Z') }); // 11:42 PM ET; sample booking 34 min earlier
  await open(page, '/g/p9');
  await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:16 PM (sample data)');
});

test.describe('Confirm Cancel (founder decision 9:30, Piper H4/H5)', () => {
  test('no Back on Confirm; 56px Cancel sits directly under the slider @sizes', async ({ page }) => {
    await open(page, '/g/p3');
    await expect(page.locator('[data-screen=P3] .back-btn')).toHaveCount(0);
    await expect(page.locator('[data-screen=P3]').getByRole('button', { name: /^back$/i })).toHaveCount(0);
    const cancel = page.locator('[data-testid=cancel]:visible');
    await expect(cancel).toHaveCount(1);
    await expect(cancel).toBeInViewport({ ratio: 1 });
    const c = (await cancel.boundingBox())!;
    const t = (await page.getByTestId('confirm').boundingBox())!;
    expect(c.height).toBeGreaterThanOrEqual(56);
    expect(c.y).toBeGreaterThan(t.y + t.height - 1);
    expect(c.y - (t.y + t.height)).toBeLessThanOrEqual(16);
  });

  test('H4: Cancel returns home with nothing booked and no record', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await page.getByTestId('cancel').tap();
    await expect(page.locator('[data-screen=home]')).toBeVisible();
    await expect(page.getByTestId('toast')).toContainText('Nothing was booked');
    await page.clock.runFor(15_000);
    const s = await state(page);
    expect(s.ride).toBeNull();
    expect(s.bookings).toHaveLength(0);
    expect(s.confirmations).toHaveLength(0);
    expect(s.consents).toHaveLength(0);
  });

  test('H5: a partial slide then Cancel books nothing', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await slide(page, 'confirm', 0.5);
    await page.getByTestId('cancel').tap();
    await page.clock.runFor(15_000);
    const s = await state(page);
    expect(s.ride).toBeNull();
    expect(s.confirmations).toHaveLength(0);
    await expect(page.locator('[data-screen=home]')).toBeVisible();
  });

  test('price and cap line are full-strength text; only the slider glows', async ({ page }) => {
    await open(page, '/g/p3');
    const colors = await page.evaluate(() => {
      const text = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
      const probe = document.createElement('span'); probe.style.color = text; document.body.appendChild(probe);
      const want = getComputedStyle(probe).color; probe.remove();
      const c = (id: string) => getComputedStyle(document.querySelector(`[data-testid=${id}]`)!);
      return { want, quote: c('quote').color, cap: c('cap-line').color, quoteShadow: c('quote').boxShadow, capOpacity: c('cap-line').opacity };
    });
    expect(colors.quote).toBe(colors.want);
    expect(colors.cap).toBe(colors.want);
    expect(colors.capOpacity).toBe('1');
    expect(colors.quoteShadow).toBe('none');
  });
});

test.describe('Status and charge timing (SCOPE "Ride status and charge timing")', () => {
  test('undo "Requesting your ride...", no accept during undo, then "Ride requested. Finding a driver.", then "Ride booked. Fare goes on your tab at pickup."', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await slide(page);
    await expect(page.getByTestId('status-requesting')).toHaveText('Requesting your ride...');
    await page.clock.runFor(9_500);
    expect(await page.evaluate(() => { const s = (window as any).__ridenite.store; return s.stageOf(s.getState().ride); })).toBe('pending');
    await expect(page.getByText(/Ride booked/)).toHaveCount(0);
    await page.clock.runFor(1_000);
    await expect(page.getByTestId('status-requested')).toHaveText('Ride requested. Finding a driver.');
    await expect(page.getByTestId('status-requested-fare')).toHaveText("$21.00 goes on your tab when you're picked up. Final fare may differ by up to $4.20.");
    const head = (await page.getByTestId('status-requested').boundingBox())!;
    const fare = (await page.getByTestId('status-requested-fare').boundingBox())!;
    expect(fare.y).toBeGreaterThanOrEqual(head.y + head.height - 1);
    await expect(page.getByText(/Ride booked/)).toHaveCount(0);
    await page.clock.runFor(8_000);
    await expect(page.locator('[data-screen=P5]')).toBeVisible();
    await expect(page.getByTestId('status-booked')).toHaveText('Ride booked.');
    await expect(page.getByTestId('status-booked-fare')).toHaveText('Fare goes on your tab at pickup.');
    const st = (await page.getByTestId('status-booked').boundingBox())!;
    const eta = (await page.getByTestId('eta').boundingBox())!;
    expect(eta.y).toBeGreaterThan(st.y); // then the ETA card
    await expect(page.getByText('Tab closed', { exact: false })).toHaveCount(0);
    await page.evaluate(() => { location.hash = '/g/home'; });
    await expect(page.getByTestId('home-booked')).toHaveText('Ride booked. Fare goes on your tab at pickup.');
  });

  test('requested line uses the live quote and cap ($23.50, $4.70)', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await page.evaluate(() => { const s = (window as any).__ridenite.store; s.setForceStaleQuote(true); });
    await slide(page); // stale: refreshes to the new price, no booking
    await expect(page.getByTestId('quote')).toHaveText('$23.50');
    await page.clock.runFor(1_000);
    await slide(page);
    await page.clock.runFor(10_500);
    await expect(page.getByTestId('status-requested-fare')).toHaveText("$23.50 goes on your tab when you're picked up. Final fare may differ by up to $4.70.");
  });

  test('charge at pickup: no ride line while finding a driver or with the car on the way; tagline only after pickup', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-11T02:30:00Z') }) // Sat Oct 10, 10:30 PM ET;
    await open(page, '/g/p3');
    await slide(page);
    await page.clock.runFor(10_500);
    await page.evaluate(() => { location.hash = '/g/p9'; });
    await expect(page.getByTestId('ride-line')).toHaveCount(0);
    await expect(page.getByTestId('total')).toHaveText('$64.19');
    await page.clock.runFor(8_000); // accepted
    await expect(page.getByTestId('ride-line')).toHaveCount(0);
    await expect(page.getByTestId('total')).toHaveText('$64.19');
    await expect(page.getByTestId('night-tagline')).toHaveCount(0);
    await page.clock.fastForward(352_000); // 60 s after the request was placed (undo end): picked up
    await expect(page.getByTestId('ride-line')).toBeVisible();
    await expect(page.getByTestId('confirm-record')).toContainText('Confirmed by guest');
    // check still open (Harper 23:11): never "Tab closed." before the POS closes the check
    await expect(page.getByTestId('night-tagline')).toHaveText('Saturday, Oct 10. Ride home is on your tab.');
  });

  test('driver accepts then cancels: E6, nothing charged; receipt reads "Requested by guest, 11:42 PM. Driver cancelled. Not charged."', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-10T03:42:00Z') });
    await open(page, '/g/p3');
    await slide(page);
    await page.clock.runFor(18_500);
    await expect(page.getByTestId('status-booked')).toBeVisible();
    await nav(page, '/g/demo');
    await store(page, 's.driverCancel()'); await page.evaluate(() => { location.hash = '/g/e6'; });
    await expect(page.locator('[data-screen=E6]')).toBeVisible();
    await expect(page.locator('main')).toContainText('Your driver cancelled. Nothing was added to your tab.');
    await nav(page, '/g/p9');
    await expect(page.getByTestId('ride-line')).toHaveCount(0);
    await expect(page.getByTestId('confirm-record')).toHaveCount(0);
    await expect(page.getByTestId('no-driver-record')).toHaveText('Requested by guest, 11:42 PM. Driver cancelled. Not charged.');
    await expect(page.getByTestId('total')).toHaveText('$64.19');
    await expect(page.getByTestId('night-tagline')).toHaveCount(0);
  });

  test('hold copy uses the computed date, never today or tomorrow', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-10T03:42:00Z') }); // Fri 11:42 PM ET, night of Fri Oct 9, tab opened 7:42 PM
    await open(page, '/g/p9');
    await expect(page.getByTestId('hold-line')).toContainText("it's charged Sat, Oct 10 at 11:00 AM.");
    await expect(page.getByTestId('hold-line')).not.toContainText(/today|tomorrow/i);
    await nav(page, '/g/m1');
    await expect(page.locator('main')).toContainText("it's charged Sat, Oct 10 at 11:00 AM.");
  });

  test('morning: Harper ride-question copy exactly; no "aren\'t charged until the bar replies"; bar tab questions to the bar', async ({ page }) => {
    const copy = "Ride charge look wrong? Tap here. We'll start on it with Maison Cheryl today. If it's wrong, Maison Cheryl refunds it to your card, and we'll text you when that's done. Your bank may take a few business days to show it.";
    await open(page, '/g/p9');
    await expect(page.getByTestId('ride-question')).toHaveText(copy);
    await expect(page.locator('main')).toContainText('Questions about your bar tab go to Maison Cheryl.');
    await expect(page.locator('main')).not.toContainText("aren't charged");
    await page.getByTestId('ride-question').tap();
    await expect(page.locator('[data-screen=P10]')).toBeVisible();
    await expect(page.locator('main')).not.toContainText("aren't charged");
    await expect(page.locator('main')).toContainText('Questions about your bar tab go to Maison Cheryl.');
    await page.getByText('An amount is wrong').tap();
    await page.getByTestId('send-dispute').tap();
    await expect(page.locator('[data-screen=P11]')).toBeVisible();
    await expect(page.locator('main')).not.toContainText("aren't charged");
    await expect(page.locator('main')).not.toContainText(/refund|pays you back|difference back/i);
    await nav(page, '/g/m1');
    await expect(page.getByTestId('ride-question')).toHaveText(copy);
  });

  test('confirm: "You pay the final fare, never more than $X unless you approve a change." from the live quote and cap', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/p3');
    await expect(page.getByTestId('max-line')).toHaveText("More than that and we'll ask you first. You pay the final fare, never more than $25.20 unless you approve a change.");
    await expect(page.locator('main')).not.toContainText(/refund|difference back/i);
    await page.evaluate(() => { const s = (window as any).__ridenite.store; s.setForceStaleQuote(true); });
    await slide(page); // stale: refreshes to $23.50
    await expect(page.getByTestId('quote')).toHaveText('$23.50');
    await expect(page.getByTestId('max-line')).toHaveText("More than that and we'll ask you first. You pay the final fare, never more than $28.20 unless you approve a change.");
  });

  test('no driver: "No driver found yet.", nothing charged; receipt reads "Requested by guest, 11:42 PM. No driver found. Not charged."', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-10T03:42:00Z') });
    await open(page, '/g/demo');
    await page.getByTestId('force-no-driver').tap();
    await nav(page, '/g/p3');
    await slide(page);
    await page.clock.runFor(10_500 + 20_000);
    await expect(page.locator('[data-screen=E1]')).toBeVisible();
    await expect(page.getByTestId('no-driver-title')).toHaveText('No driver found yet.');
    await expect(page.getByTestId('ask-staff-car')).toHaveClass(/btn--primary/);
    await expect(page.getByTestId('keep-looking')).toHaveClass(/btn--secondary/);
    await nav(page, '/g/p9');
    await expect(page.getByTestId('ride-line')).toHaveCount(0);
    await expect(page.getByTestId('confirm-record')).toHaveCount(0);
    await expect(page.getByTestId('no-driver-record')).toHaveText('Requested by guest, 11:42 PM. No driver found. Not charged.');
    await expect(page.getByTestId('total')).toHaveText('$64.19');
    await expect(page.getByTestId('night-tagline')).toHaveCount(0);
  });

  test('Keep looking within 5 minutes searches again and a driver accepts', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/demo');
    await page.getByTestId('force-no-driver').tap();
    await nav(page, '/g/p3');
    await slide(page);
    await page.clock.runFor(31_000);
    await page.getByTestId('keep-looking').tap();
    await expect(page.getByTestId('status-requested')).toBeVisible();
    await page.clock.runFor(8_500);
    await expect(page.getByTestId('status-booked')).toHaveText('Ride booked.');
    await expect(page.getByTestId('status-booked-fare')).toHaveText('Fare goes on your tab at pickup.');
  });

  test('stale quote: Keep looking shows the new price and requires a new slide; never rebooks silently', async ({ page }) => {
    await page.clock.install();
    await open(page, '/g/demo');
    await page.getByTestId('force-no-driver').tap();
    await nav(page, '/g/p3');
    await slide(page);
    await page.clock.runFor(31_000);
    await nav(page, '/g/demo');
    await page.getByTestId('force-stale').tap();
    await nav(page, '/g/e1');
    await page.getByTestId('keep-looking').tap();
    await expect(page.locator('[data-screen=P3]')).toBeVisible();
    await expect(page.getByTestId('stale-banner')).toBeVisible();
    await expect(page.getByTestId('quote')).toHaveText('$23.50');
    await expect(page.getByTestId('cap-line')).toContainText('$4.70');
    const s = await state(page);
    expect(s.ride).toBeNull();
    expect(s.bookings).toHaveLength(1); // only the first request
    await page.clock.runFor(60_000);
    expect((await state(page)).ride).toBeNull();
    await slide(page);
    await page.clock.runFor(10_500);
    expect((await state(page)).ride.quoteCents).toBe(2350);
  });

  test('tagline only on the morning receipt under the total, and only when a ride was booked', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-11T05:15:00Z') }); // Sun Oct 11, 1:15 AM ET: still the night of Sat Oct 10
    await open(page, '/g/home');
    await expect(page.getByText('Tab closed', { exact: false })).toHaveCount(0);
    await page.evaluate(() => (window as any).__ridenite.store.unlinkTab());
    await expect(page.getByText('Tab closed', { exact: false })).toHaveCount(0);
    await page.getByTestId('menu-btn').tap();
    await expect(page.getByTestId('menu-sheet')).not.toContainText('Tab closed');
    await open(page, '/g/p9');
    await expect(page.getByTestId('night-tagline')).toHaveText('Saturday, Oct 10. Ride home is on your tab.');
    // the line sits right before the ride line
    const tag = (await page.getByTestId('night-tagline').boundingBox())!;
    const line = (await page.getByTestId('ride-item').boundingBox())!;
    expect(line.y).toBeGreaterThanOrEqual(tag.y + tag.height - 1);
    expect(await page.getByTestId('night-tagline-row').evaluate((e) => (e.nextElementSibling as HTMLElement | null)?.dataset.testid)).toBe('ride-item');
    await nav(page, '/g/m1');
    await expect(page.getByTestId('night-tagline')).toHaveText('Saturday, Oct 10. Ride home is on your tab.');
  });

  test('"Tab closed." only after the check closes: guest pays, or the bartender closes the tab', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-11T02:30:00Z') });
    await open(page, '/g/p9');
    await expect(page.getByTestId('night-tagline')).toHaveText('Saturday, Oct 10. Ride home is on your tab.');
    await page.evaluate(() => (window as any).__ridenite.store.pay());
    await nav(page, '/g/p9');
    await expect(page.getByTestId('night-tagline')).toHaveText('Saturday, Oct 10. Tab closed. Ride home included: $24.60.');
    await nav(page, '/g/m1');
    await expect(page.getByTestId('night-tagline')).toHaveText('Saturday, Oct 10. Tab closed. Ride home included: $24.60.');
    await open(page, '/g/p9'); // fresh state
    await page.evaluate(() => { const s = (window as any).__ridenite.store; s.barCloseTab(s.getState().linkedTab.tab, 'closed'); });
    await nav(page, '/g/p9');
    await expect(page.getByTestId('night-tagline')).toHaveText('Saturday, Oct 10. Tab closed. Ride home included: $24.60.');
  });
});

test('slider at rest (README rev 04.1): 76 pt thumb 24 px in, 6 pt vertical inset, lit fill to the thumb edge then a 10 px fade to surface-2', async ({ page }) => {
  await open(page, '/g/p3');
  const track = (await page.getByTestId('confirm').boundingBox())!;
  const fill = (await page.locator('[data-testid=confirm] .slide__fill').boundingBox())!;
  const thumb = (await page.getByTestId('confirm-thumb').boundingBox())!;
  expect(Math.round(thumb.width)).toBe(76);
  expect(Math.round(track.height)).toBe(88);
  expect(Math.abs(thumb.y - track.y - 6)).toBeLessThanOrEqual(1.5);
  const border = await page.getByTestId('confirm').evaluate((e) => parseFloat(getComputedStyle(e).borderLeftWidth));
  expect(Math.abs(thumb.x - (track.x + border) - 24)).toBeLessThanOrEqual(1);
  // fill ends 10 px past the thumb's right edge (the fade), never further
  expect(Math.abs(fill.x + fill.width - (thumb.x + thumb.width) - 10)).toBeLessThanOrEqual(1);
  const bg = await page.locator('[data-testid=confirm] .slide__fill').evaluate((e) => getComputedStyle(e).backgroundImage);
  expect(bg).toContain('rgb(255, 200, 61)');   // #FFC83D
  expect(bg).toContain('rgb(255, 186, 69)');   // #FFBA45 at 100 px
  expect(bg).toContain('rgba(255, 169, 77, 0.4)');
  expect(bg).toContain('rgb(42, 50, 67)');     // --surface-2 at 110 px
  expect(bg).toContain('100px'); expect(bg).toContain('104px'); expect(bg).toContain('110px');
  expect(await page.getByTestId('confirm-thumb').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(255, 212, 94)'); // #FFD45E
});

test('morning receipt itemized ride line: areas, pickup time and the final ride total ($27.40 in the P9 scenario)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T02:30:00Z') }); // Sat 10:30 PM ET; sample pickup 26 min earlier
  await open(page, '/g/p9');
  await page.evaluate(() => { const s = (window as any).__ridenite.store; s.setFareScenario('over'); s.setOverCapAnswer('yes'); });
  const want = 'RideNite car home, Clarendon area to Westover area, picked up 10:10 PM, $27.40';
  await expect(page.getByTestId('ride-item')).toContainText(want);
  await expect(page.getByTestId('total')).toHaveText('$91.59');
  // the itemized fare equals the ride lines on the tab: quote + adjustment
  const amts = await page.locator('[data-testid=ride-line] .amt, [data-testid=adj-line] .amt, [data-testid=stop-line] .amt').allInnerTexts();
  const cents = amts.map((t) => Math.round(Math.abs(parseFloat(t.replace(/[^0-9.]/g, ''))) * 100) * (/[-\u2212]/.test(t) ? -1 : 1));
  expect(cents.reduce((a, b) => a + b, 0)).toBe(2740);
  // areas, never full street addresses
  await expect(page.getByTestId('ride-item')).not.toContainText('655 N Harrison');
  await expect(page.getByTestId('ride-item')).not.toContainText('Wilson Blvd');
  await nav(page, '/g/m1');
  await expect(page.getByTestId('ride-item')).toContainText(want);
});

test('no itemized ride line before pickup or without a ride', async ({ page }) => {
  await page.clock.install();
  await open(page, '/g/p3');
  await slide(page);
  await page.clock.runFor(18_500); // accepted, not picked up
  await page.evaluate(() => { location.hash = '/g/p9'; });
  await expect(page.getByTestId('ride-item')).toHaveCount(0);
  await expect(page.getByTestId('night-tagline')).toHaveCount(0);
});

for (const [label, iso] of [['Sat 10:52 PM', '2026-10-11T02:52:00Z'], ['Sun 9:30 AM', '2026-10-11T13:30:00Z']] as const) {
  test(`morning heading at ${label} ET reads "Night of Sat, Oct 10" (never "Last night")`, async ({ page }) => {
    await page.clock.install({ time: new Date(iso) });
    await open(page, '/g/p9');
    await expect(page.getByTestId('night-heading')).toHaveText('Night of Sat, Oct 10');
    await expect(page.locator('h1')).not.toContainText('Last night');
  });
}

test('morning receipt split: Bar sales $64.19 + RideNite rides $27.40 = $91.59 (over-cap approved), each section with its own question', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T02:30:00Z') });
  await open(page, '/g/p9');
  await page.evaluate(() => { const s = (window as any).__ridenite.store; s.setFareScenario('over'); s.setOverCapAnswer('yes'); });
  const cents = async (id: string) => Math.round(parseFloat((await page.getByTestId(id).innerText()).replace(/[^0-9.]/g, '')) * 100);
  await expect(page.getByTestId('bar-subtotal')).toHaveText('$64.19');
  await expect(page.getByTestId('ride-subtotal')).toHaveText('$27.40');
  await expect(page.getByTestId('total')).toHaveText('$91.59');
  expect([await cents('bar-subtotal'), await cents('ride-subtotal'), await cents('total')]).toEqual([6419, 2740, 9159]);
  expect((await cents('bar-subtotal')) + (await cents('ride-subtotal'))).toBe(await cents('total'));
  const bar = page.getByTestId('bar-section'), ride = page.getByTestId('ride-section');
  // tax and tip live in bar sales only
  await expect(bar.getByTestId('tax')).toBeVisible();
  await expect(bar.getByTestId('tip-amt')).toBeVisible();
  await expect(ride.getByTestId('tax')).toHaveCount(0);
  await expect(ride.getByTestId('tip-amt')).toHaveCount(0);
  // ride lines: quote, adjustment within the cap, approved stop
  await expect(ride.getByTestId('ride-line').locator('.amt')).toHaveText('$21.00');
  await expect(ride.getByTestId('adj-line').locator('.amt')).toHaveText('+$4.20');
  await expect(ride.getByTestId('stop-line').locator('.amt')).toHaveText('+$2.20');
  await expect(ride.getByTestId('ride-id')).toContainText(/Ride ID RN-[0-9A-Z]{6}/);
  // each section has its own question path
  await expect(bar.getByTestId('bar-question')).toHaveText('Questions about your bar tab go to Maison Cheryl.');
  await expect(ride.getByTestId('ride-question')).toContainText('Ride charge look wrong? Tap here.');
  await ride.getByTestId('ride-question').tap();
  await expect(page).toHaveURL(/#\/g\/p10$/);
  // M1 email carries the same split
  await nav(page, '/g/m1');
  await expect(page.getByTestId('bar-subtotal')).toHaveText('$64.19');
  await expect(page.getByTestId('ride-subtotal')).toHaveText('$27.40');
  await expect(page.getByTestId('total')).toHaveText('$91.59');
  await expect(page.getByTestId('ride-section').getByTestId('ride-id')).toContainText(/Ride ID RN-[0-9A-Z]{6}/);
  await expect(page.getByTestId('bar-section').getByTestId('bar-question')).toBeVisible();
  await expect(page.getByTestId('ride-section').getByTestId('ride-question')).toBeVisible();
});

test('morning receipt split, standard sample night (no stop): $64.19 + $24.60 = $88.79 in cents', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T02:30:00Z') });
  await open(page, '/g/p9');
  const cents = async (id: string) => Math.round(parseFloat((await page.getByTestId(id).innerText()).replace(/[^0-9.]/g, '')) * 100);
  expect(await cents('bar-subtotal')).toBe(6419);
  expect(await cents('ride-subtotal')).toBe(2460);
  expect(await cents('total')).toBe(8879);
  expect((await cents('bar-subtotal')) + (await cents('ride-subtotal'))).toBe(await cents('total'));
  await expect(page.getByTestId('stop-line')).toHaveCount(0);
});
