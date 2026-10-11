import { expect, test } from '@playwright/test';
import { inViewport, nav, open, state, store, slide } from './helpers';

const BELONG = "Card, keys, phone, jacket, bag. Check with staff if they're holding your card.";

test('storage is empty after reload (memory-only demo)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { localStorage.setItem('ridenite.demo', '{"stale":true}'); sessionStorage.setItem('ridenite.x', '1'); });
  await page.getByTestId('ride-home').tap();
  await slide(page);
  await page.reload();
  await expect(page.getByTestId('sim-banner')).toBeVisible();
  const keys = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].filter((k) => k.startsWith('ridenite')));
  expect(keys).toEqual([]);
});

test('reload mid-ride resets to a fresh demo, nothing booked', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('ride-home').tap();
  await slide(page);
  await store(page, 's.getState().ride.bookedAt = Date.now() - 1; s.tick()');
  expect((await state(page)).bookings).toHaveLength(1);
  await page.reload();
  await expect(page.getByTestId('ride-home')).toBeVisible();
  const s = await state(page);
  expect(s.ride).toBeNull();
  expect(s.bookings).toHaveLength(0);
});

test('cold table QR link on a first visit (empty storage) links the tab; refresh stays linked', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/#/v?tab=5120&seat=Table%2012');
  await expect(page.getByTestId('ride-home')).toBeVisible();
  expect((await state(page)).linkedTab).toMatchObject({ tab: '5120', seat: 'Table 12' });
  await store(page, 's.unlinkTab()');
  await page.reload();
  await expect(page.getByTestId('ride-home')).toBeVisible();
  expect((await state(page)).linkedTab).toMatchObject({ tab: '5120' });
  await page.getByTestId('ride-home').tap();
  await slide(page);
  await expect(page.getByTestId('undo')).toBeVisible();
  expect((await state(page)).ride.tab).toBe('5120');
  await ctx.close();
});

test('unlinked home: Ask staff for a car, Scan table QR, Safari line; never books', async ({ page }) => {
  await open(page, '/g/demo');
  await page.getByTestId('unlink').tap();
  await nav(page, '/g/home');
  await expect(page.getByTestId('ride-home')).toHaveCount(0);
  await expect(page.getByTestId('ask-staff-home')).toBeVisible();
  await expect(page.getByTestId('scan-qr')).toBeVisible();
  await expect(page.getByTestId('not-linked')).toHaveText('Booked from a table QR? Open it in Safari to see your ride.');
  await page.getByTestId('ask-staff-home').tap();
  await expect(page.locator('[data-screen=P3w]')).toBeVisible();
  expect((await state(page)).ride).toBeNull();
  // store guard as well
  expect(await store(page, "return s.createRide('x').refused")).toBe('no_tab');
  await nav(page, '/g/home');
  await page.getByTestId('scan-qr').tap();
  await page.getByTestId('simulate-scan').tap();
  await expect(page.getByTestId('ride-home')).toBeVisible();
});

test('reload with no params: back to the seeded linked tab (unlink toggle is memory only)', async ({ page }) => {
  await open(page, '/g/demo');
  await page.getByTestId('unlink').tap();
  await page.reload();
  expect((await state(page)).linkedTab?.tab).toBe('4468');
});

test('first-time guest: Where to, suggestions from first keystroke, Confirm, booked', async ({ page }) => {
  await page.clock.install();
  await open(page, '/g/demo');
  await page.getByTestId('forget-home').tap();
  await nav(page, '/g/home');
  await page.getByTestId('ride-home').tap();
  await expect(page.locator('[data-screen=P2]')).toBeVisible();
  await expect(page.getByTestId('dest-voice')).toHaveCount(0); // P2v removed for v1
  await page.getByTestId('dest-type').tap();
  await page.getByTestId('addr-input').pressSequentially('w');
  await expect(page.getByTestId('suggest-0')).toBeVisible();
  await page.getByTestId('addr-input').pressSequentially('estovr');
  await expect(page.getByTestId('suggest-0')).toContainText('Westover area');
  await page.getByTestId('suggest-0').tap();
  await expect(page.getByTestId('confirm-dest')).toContainText('Westover area');
  await slide(page);
  await page.clock.runFor(10_500);
  expect((await state(page)).bookings).toHaveLength(1);
});

test('Use my location is simulated: no geolocation call, labeled sample', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__geoCalled = false;
    const g = navigator.geolocation;
    if (g) { g.getCurrentPosition = () => { (window as any).__geoCalled = true; }; g.watchPosition = () => { (window as any).__geoCalled = true; return 0; }; }
  });
  await open(page, '/g/p2t');
  await page.getByTestId('use-location').tap();
  await expect(page.getByTestId('sim-location')).toContainText('Sample location (simulated)');
  await expect(page.getByTestId('suggest-0')).toContainText('Courthouse area');
  expect(await page.evaluate(() => (window as any).__geoCalled)).toBe(false);
});

test('belongings: card on the way, Got it dismisses, nudge at 2 min, car-here reminder on reopen', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByTestId('ride-home').tap();
  await slide(page);
  await page.clock.runFor(10_500);
  const card = page.getByTestId('belongings-card');
  await expect(card).toContainText('Do you have everything?');
  await expect(card).toContainText(BELONG);
  await expect(page.getByTestId('belongings-ok')).toBeVisible();
  expect((await page.getByTestId('belongings-ok').boundingBox())!.height).toBeGreaterThanOrEqual(56);
  await page.getByTestId('belongings-ok').tap();
  await expect(card).toHaveCount(0);
  await page.clock.runFor(8_000); // en_route: stays dismissed
  await expect(page.locator('[data-screen=P5]')).toBeVisible();
  await expect(page.getByTestId('belongings-card')).toHaveCount(0);
  await page.clock.fastForward(233_000); // near (2 min before the 6 min pickup)
  await expect(page.locator('[data-screen=P5w]')).toBeVisible();
  await expect(page.getByText('Driver is 2 minutes away.')).toBeVisible();
  await expect(page.getByTestId('belongings-nudge')).toContainText(BELONG);
  await page.getByTestId('belongings-ok').tap();
  await expect(page.getByTestId('belongings-nudge')).toHaveCount(0);
  await page.clock.fastForward(90_000); // arrived: reopen home reflects current state
  await nav(page, '/g/home');
  await expect(page.getByTestId('active-headline')).toHaveText('Your car is here.');
  await expect(page.getByTestId('belongings-card')).toContainText('Your car is here');
  await expect(page.getByText('2 min away')).toHaveCount(0);
});

test('belongings card sits below plate and Help on P5 and never covers them @sizes', async ({ page }) => {
  await page.goto('/');
  await store(page, "s.createRide('x'); s.getState().ride.bookedAt = Date.now() - 1; s.tick(); s.releaseHold('en_route')");
  await nav(page, '/g/p5');
  const plate = (await page.locator('.plate').first().boundingBox())!;
  const help = (await page.getByRole('button', { name: 'Help' }).boundingBox())!;
  const card = (await page.getByTestId('belongings-card').boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(plate.y + plate.height);
  expect(card.y).toBeGreaterThanOrEqual(help.y + help.height);
  expect((await inViewport(page, 'belongings-card')).box).toBeTruthy();
});

test('E1 to E8 (except E6, removed from the demo, Quinn Oct 11) reachable from the fault panel; each starts fresh', async ({ page }) => {
  const expectText: Record<string, RegExp> = {
    E1: /No driver found yet\.[\s\S]*Nothing was added to your tab\./,
    E2: /The price changed before your car was booked\. Nothing was added to your tab\./,
    E3: /Your car is here/,
    E4: /Your tab here is already closed\. Nothing was added to it\./,
    E5: /Your ride is still booked/,
    E7: /Add this stop\?[\s\S]*New quote: \$24\.00\. Final fare may differ by up to \$4\.80\. Never more than \$28\.80 unless you approve a change\./,
    E8: /Your ride came to \$28\.30\.[\s\S]*Ride ID RN-NHMCXN/,
  };
  await open(page, '/g/demo');
  for (const id of Object.keys(expectText)) {
    await nav(page, '/g/demo');
    await page.getByTestId(`fault-${id}`).tap();
    await expect(page.locator(`[data-screen=${id}]`)).toBeVisible();
    await expect(page.locator('main')).toContainText(expectText[id]);
    await expect(page.getByTestId('sim-banner')).toBeInViewport();
  }
  await nav(page, '/g/demo');
  await page.getByTestId('fault-E8').tap();
  await expect(page.getByTestId('e8-added')).toHaveText('+$4.20');
  await expect(page.getByTestId('e8-over')).toHaveText('$3.10');
  await expect(page.getByTestId('e8-ride')).toContainText('Night of Fri, Oct 9');
  // needs-OK line is neutral, not amber/warning
  const bg = await page.getByTestId('needs-ok').evaluate((e) => getComputedStyle(e).backgroundColor);
  const warn = await page.evaluate(() => { const d = document.createElement('div'); d.style.background = 'var(--warning)'; document.body.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; });
  const prim = await page.evaluate(() => { const d = document.createElement('div'); d.style.background = 'var(--primary)'; document.body.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; });
  expect([warn, prim]).not.toContain(bg);
  await expect(page.getByTestId('needs-ok').locator('svg')).toHaveCount(1);
});

test('P9 totals for every fare scenario, instant tip recompute, tip excludes ride', async ({ page }) => {
  await open(page, '/g/p9');
  const total = page.getByTestId('total');
  await expect(total).toHaveText('$88.79');
  await expect(page.getByTestId('ride-line').locator('th')).toContainText(/^RideNite car home(?!,)/);
  await expect(page.getByTestId('ride-line-amt')).toHaveText('$24.60');
  await expect(page.getByTestId('adj-line')).toHaveCount(0);
  await page.getByTestId('tip-18').tap();
  await expect(total).toHaveText('$87.81');
  await expect(page.getByTestId('tip-amt')).toHaveText('$8.82');
  await page.getByTestId('tip-0').tap();
  await expect(total).toHaveText('$78.99');
  await page.getByTestId('tip-20').tap();
  await expect(page.getByText('Tip is on food and items ($49.00), not the ride.')).toBeVisible();
  for (const [scen, want] of [['lower', '$83.09'], ['over', '$89.39'], ['higher', '$88.79']] as const) {
    await nav(page, '/g/demo');
    await page.getByTestId(`scen-${scen}`).tap();
    await nav(page, '/g/p9');
    await expect(total).toHaveText(want);
  }
  await nav(page, '/g/demo');
  await page.getByTestId('scen-over').tap();
  await nav(page, '/g/e8t');
  await page.getByTestId('e8-yes').tap();
  await expect(total).toHaveText('$91.59'); // confirmed by the product lead; POS 3b row corrected
  await nav(page, '/g/e8t');
  await page.getByTestId('e8-no').tap();
  await expect(total).toHaveText('$89.39');
});

test('E2 accepted: $23.50 quote, $4.70 cap, morning total $88.79', async ({ page }) => {
  await page.clock.install();
  await open(page, '/g/demo');
  await page.getByTestId('fault-E2').tap();
  await expect(page.locator('main')).toContainText('$4.70');
  await slide(page, 'e2-yes');
  await page.clock.runFor(10_500);
  expect((await state(page)).ride).toMatchObject({ quoteCents: 2350, capCents: 470 });
  await page.clock.fastForward(360_000); // picked up; fare posts to the tab
  await nav(page, '/g/p9');
  await expect(page.getByTestId('total')).toHaveText('$88.79');
});

test('second phone: handoff link with bookedAt shows the same ride state', async ({ page, browser }) => {
  await page.goto('/');
  await store(page, "s.createRide('x'); s.getState().ride.bookedAt = Date.now() - 20000; s.tick()");
  await nav(page, '/g/demo');
  const href = await page.getByTestId('second-phone-link').getAttribute('href');
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p2 = await ctx2.newPage();
  await p2.goto('/' + href);
  await expect(p2.locator('[data-screen=P5]')).toBeVisible();
  await ctx2.close();
});

test('long press on SIMULATED DEMO opens reset; menu shows build stamp and resets in one tap', async ({ page }) => {
  await page.goto('/');
  await store(page, "s.createRide('x')");
  const label = page.getByTestId('sim-label');
  const b = (await label.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  await expect(page.getByTestId('reset-sheet')).toBeVisible();
  await page.getByTestId('reset-confirm').tap();
  expect((await state(page)).ride).toBeNull();
  await store(page, "s.createRide('x')");
  await page.getByTestId('menu-btn').tap();
  await expect(page.getByTestId('build-stamp')).toContainText(/Version 0\.1\.0\+[0-9a-f]{8} · built .* ET/);
  await page.getByTestId('menu-reset').tap();
  expect((await state(page)).ride).toBeNull();
});

test('owner preview: label on every screen, every number tagged Sample data', async ({ page }) => {
  for (const r of ['/o', '/o/summary', '/o/limits', '/o/bar']) {
    await open(page, r);
    await expect(page.getByTestId('owner-label')).toHaveText('Demo screen, sample data');
  }
  for (const r of ['/o/summary', '/o/limits', '/o/bar']) {
    await nav(page, r);
    const untagged = await page.$$eval('main p, main span, main b', (els) =>
      els.filter((e) => /\d/.test(e.textContent ?? '') && e.children.length === 0 && !e.closest('.kv__v, .callout, .row, [data-testid=two-taps]') && !/Fri night|night of|Table|tab #/.test(e.textContent ?? '')).map((e) => e.textContent));
    expect(untagged).toEqual([]);
    const numbers = await page.locator('.kv__v, [data-testid=two-taps], .callout:has(.sample-tag)').count();
    const tags = await page.locator('.sample-tag').count();
    expect(tags).toBeGreaterThanOrEqual(numbers);
  }
  await expect(page.getByTestId('two-taps')).toContainText('Booked in 2 taps');
});
