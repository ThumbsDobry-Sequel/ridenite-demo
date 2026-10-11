import { test, expect } from '@playwright/test';

/** Oct 11 regression guard: guests see "RideNite car home" at the FINAL fare; "quoted fare" is the POS / B6 line only. */
test.describe('guest ride row never says "quoted fare"', () => {
  for (const route of ['/g/p9', '/g/m1', '/g/sample-traffic', '/g/sample-traffic?ok=1', '/g/inbox', '/g/m2']) {
    test(`${route}: no "quoted fare" anywhere on the guest screen`, async ({ page }) => {
      await page.goto(`/#${route}`);
      await page.locator('[data-screen]').first().waitFor();
      await expect(page.locator('body')).not.toContainText('quoted fare');
    });
  }
  test('P9 receipt (guest row never at the quote $21.00): "RideNite car home" at $24.60, totals $64.19 + $24.60 = $88.79; M1 the same', async ({ page }) => {
    await page.goto('/#/g/p9');
    const row = page.getByTestId('ride-line');
    await expect(row.locator('th')).toContainText(/^RideNite car home(?!,)/);
    await expect(page.getByTestId('ride-line-amt')).toHaveText('$24.60');
    await expect(page.getByTestId('bar-subtotal')).toHaveText('$64.19');
    await expect(page.getByTestId('ride-subtotal')).toHaveText('$24.60');
    await expect(page.getByTestId('total')).toHaveText('$88.79');
    // no guest receipt row may show the quote amount ($21.00) instead of the final fare
    for (const amt of await page.locator('[data-testid=ride-section] td.amt').allInnerTexts()) expect(amt).not.toBe('$21.00');
    await page.goto('/#/g/m1');
    for (const amt of await page.locator('[data-testid=ride-section] td.amt').allInnerTexts()) expect(amt).not.toBe('$21.00');
    await expect(page.getByTestId('ride-item').locator('.amt')).toHaveText('$24.60');
    await expect(page.getByTestId('total')).toHaveText('$88.79');
  });
});
