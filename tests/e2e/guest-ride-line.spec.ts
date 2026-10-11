import { test, expect, type Page } from '@playwright/test';

/**
 * Oct 11 regression guard (Quinn): every guest receipt / ride-row state reads "RideNite car home" at the FINAL fare
 * charged and never "quoted fare" (the bartender POS / B6 line only). Screens: g10-g12 night summary (P9),
 * g15-g17 morning email (M1), g18 morning review (P9), g20 over-cap your-OK (E8), g21 sample traffic receipt,
 * o02 owner summary, o05 owner statement, plus every fare scenario of the P9 receipt.
 */
const NIGHT = new Date('2026-10-11T02:30:00Z');   // Sat 10:30 PM ET, sample ride done
const MORNING = new Date('2026-10-11T13:00:00Z'); // Sun 9:00 AM ET
async function at(page: Page, when: Date, route: string, setup?: string) {
  await page.clock.install({ time: when });
  await page.goto(`/#${route}`);
  await page.locator('[data-screen]').first().waitFor();
  if (setup) await page.evaluate(setup);
}
const noQuotedFare = async (page: Page) => expect(page.locator('main')).not.toContainText(/quoted fare/i);
const guestRows = (page: Page) => page.locator('[data-testid=ride-section] td.amt');

const P9_SCENARIOS: [string, string, string, string][] = [
  ['higher (sample night)', "s.setFareScenario('higher')", '$24.60', '$88.79'],
  ['lower (credit)', "s.setFareScenario('lower')", '$18.90', '$83.09'],
  ['equal', "s.setFareScenario('equal')", '$21.00', '$85.19'],
  ['over the cap, approved', "s.setFareScenario('over'); s.setOverCapAnswer('yes')", '$27.40', '$91.59'],
  ['over the cap, declined (capped)', "s.setFareScenario('over'); s.setOverCapAnswer('no')", '$25.20', '$89.39'],
];
const cents = (s: string) => Math.round(parseFloat(s.replace(/[^0-9.]/g, '')) * 100) * (/[-\u2212]/.test(s) ? -1 : 1);

test.describe('guest ride row: "RideNite car home" at the final fare, never "quoted fare"', () => {
  // Team lead (Oct 11): g10/g12 (night summary) and g18 (morning review) carry exactly ONE guest ride row in every
  // fare scenario; the ride rows add up to the RideNite rides subtotal; bar subtotal + rides subtotal = total; no sideways scroll.
  for (const [label, setup, amt, total] of P9_SCENARIOS) {
    for (const [shot, when] of [['g10/g12 night', NIGHT], ['g18 morning', MORNING]] as const) {
      test(`${shot}, ${label}: one ride row ${amt}; rows = subtotal; $64.19 + ${amt} = ${total}`, async ({ page }) => {
        await at(page, when, '/g/p9', `(() => { const s = window.__ridenite.store; ${setup}; })()`);
        const rows = page.locator('[data-testid=ride-section] tr[data-kind=ride]');
        await expect(rows).toHaveCount(1);
        await expect(page.getByTestId('ride-section').getByText('RideNite car home', { exact: true })).toHaveCount(1);
        const rowCents = (await rows.locator('td.amt').allInnerTexts()).map(cents).reduce((a, b) => a + b, 0);
        await expect(page.getByTestId('ride-subtotal')).toHaveText(amt);
        expect(rowCents).toBe(cents(await page.getByTestId('ride-subtotal').innerText()));
        await expect(page.getByTestId('bar-subtotal')).toHaveText('$64.19');
        await expect(page.getByTestId('total')).toHaveText(total);
        expect(cents(await page.getByTestId('bar-subtotal').innerText()) + rowCents).toBe(cents(total));
        await expect(page.getByTestId('confirm-record-amounts')).toHaveText('Quote $21.00, may differ by up to $4.20, as shown at the time.');
        const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        expect(sw[0]).toBeLessThanOrEqual(sw[1]);
        const id = page.getByTestId('ride-detail').locator('.ride-id');
        expect(await id.evaluate((e) => e.getClientRects().length)).toBe(1);
      });
    }
  }

  for (const [label, setup, amt] of P9_SCENARIOS) {
    test(`g10/g18 P9 receipt, ${label}: row ${amt}`, async ({ page }) => {
      await at(page, NIGHT, '/g/p9', `(() => { const s = window.__ridenite.store; ${setup}; })()`);
      await noQuotedFare(page);
      await expect(page.getByTestId('ride-line').locator('th')).toContainText(/^RideNite car home(?!,)/);
      await expect(page.getByTestId('ride-line-amt')).toHaveText(amt);
      await expect(page.getByTestId('ride-subtotal')).toHaveText(amt);
      if (amt !== '$21.00') for (const a of await guestRows(page).allInnerTexts()) expect(a).not.toBe('$21.00');
    });
  }

  test('g10-g12 night summary and g18 morning review: $64.19 + $24.60 = $88.79', async ({ page }) => {
    for (const when of [NIGHT, MORNING]) {
      await page.clock.install({ time: when });
      await page.goto('/#/g/p9'); await page.locator('[data-screen=P9]').waitFor();
      await noQuotedFare(page);
      await expect(page.getByTestId('ride-line-amt')).toHaveText('$24.60');
      await expect(page.getByTestId('bar-subtotal')).toHaveText('$64.19');
      await expect(page.getByTestId('total')).toHaveText('$88.79');
      for (const a of await guestRows(page).allInnerTexts()) expect(a).not.toBe('$21.00');
    }
  });

  test('g15-g17 morning email (M1): ride row $24.60, total $88.79', async ({ page }) => {
    await at(page, MORNING, '/g/m1');
    await noQuotedFare(page);
    await expect(page.getByTestId('ride-item').locator('th')).toContainText(/^RideNite car home, /);
    await expect(page.getByTestId('ride-item').locator('.amt')).toHaveText('$24.60');
    await expect(page.getByTestId('total')).toHaveText('$88.79');
    for (const a of await guestRows(page).allInnerTexts()) expect(a).not.toBe('$21.00');
  });

  for (const r of ['/g/inbox', '/g/m2']) {
    test(`morning ${r}: no "quoted fare"`, async ({ page }) => { await at(page, MORNING, r); await noQuotedFare(page); });
  }

  test('g20 over-cap your OK (E8): final fare $28.30 shown, no "quoted fare"', async ({ page }) => {
    await at(page, NIGHT, '/g/e8');
    await noQuotedFare(page);
    await expect(page.locator('main')).toContainText('Your ride came to $28.30.');
  });

  test('g21 sample traffic receipt: declined row $25.20 (capped); approved row $28.30 (final)', async ({ page }) => {
    await at(page, NIGHT, '/g/sample-traffic');
    await noQuotedFare(page);
    await expect(page.getByTestId('ride-line').locator('th')).toContainText(/^RideNite car home(?!,)/);
    await expect(page.getByTestId('ride-line-amt')).toHaveText('$25.20');
    await expect(page.getByTestId('max-approved')).toBeVisible();
    for (const a of await page.locator('table td.amt').allInnerTexts()) expect(a).not.toBe('$21.00');
    await page.goto('/#/g/sample-traffic?ok=1'); await page.waitForTimeout(200);
    await noQuotedFare(page);
    await expect(page.getByTestId('ride-line-amt')).toHaveText('$28.30');
  });

  test('o02 owner summary and o05 statement: no "quoted fare"; statement ride lines at final fares', async ({ page }) => {
    await at(page, NIGHT, '/o/summary');
    await noQuotedFare(page);
    await page.goto('/#/o/statement'); await page.locator('[data-testid=statement-ride]').first().waitFor();
    await noQuotedFare(page);
    await expect(page.locator('main')).toContainText('ride line $24.60');
  });
});
