import { test, expect, type Page } from '@playwright/test';

/**
 * /pitch/demo/ (Sample Venue export): the whole export runs on the pinned story clock (Sat 11:52 PM ET start), so
 * sample times read confirmed 11:26 PM, picked up 11:32 PM whatever the browser clock says. Runs at 390 and 375.
 */
const times = async (page: Page) => (await page.locator('main').innerText()).match(/\b\d{1,2}:\d{2} [AP]M\b/g) ?? [];
for (const fake of ['2026-10-11T12:00:00Z', '2026-12-03T20:15:00Z']) { // Sun 8:00 AM ET; a Thursday afternoon weeks later
  test(`pitch demo: pinned story times on p9, night summary, morning email and sample traffic (browser clock ${fake})`, async ({ page }) => {
    await page.clock.install({ time: new Date(fake) });
    await page.goto('/pitch/demo/#/g/p9');
    await page.locator('[data-screen=P9]').waitFor();
    await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:26 PM');
    await expect(page.getByTestId('ride-route')).toHaveText('Clarendon area to Westover area, picked up 11:32 PM');
    await expect(page.getByTestId('night-heading')).toHaveText('Saturday night');
    for (const t of await times(page)) expect(t, 'live-clock time on /g/p9').toMatch(/^((6|7|8|9|10|11):\d\d PM|11:00 AM)$/);
    for (const r of ['/g/m1', '/g/sample-traffic', '/g/sample-traffic?ok=1', '/g/inbox', '/g/m2']) {
      await page.goto(`/pitch/demo/#${r}`); await page.waitForTimeout(300);
      const ts = await times(page);
      for (const t of ts) expect(t, `live-clock time on ${r}`).toMatch(/^((6|7|8|9|10|11):\d\d PM|11:00 AM)$/);
    }
    await page.goto('/pitch/demo/#/g/m1'); await page.waitForTimeout(300);
    await expect(page.getByTestId('ride-item')).toContainText('picked up 11:32 PM, $24.60');
    await page.goto('/pitch/demo/#/g/sample-traffic'); await page.waitForTimeout(300);
    await expect(page.getByTestId('ride-id')).toContainText('RN-NHMCXN');
    await page.goto('/pitch/demo/#/g/sample-traffic?ok=1'); await page.waitForTimeout(300);
    await expect(page.locator('main')).toContainText('Adds the $3.10 over the cap you approved.');
  });
}

/** Team lead (Oct 11): with no stored confirm record (fresh storage), the pitch export's fallback reads the story time, untagged. */
test('pitch demo: fresh storage, browser clock 8:00 AM ET: g10/g12/g18 and /g/p9 and /g/p10 read "Confirmed by guest, 11:26 PM"', async ({ browser, viewport, baseURL }) => {
  for (const route of ['/g/p9', '/g/inbox', '/g/m1']) {
    const ctx = await browser.newContext({ viewport, baseURL }); // fresh storage, no confirm record, same width as the project
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-10-11T12:00:00Z') });
    await page.goto(`/pitch/demo/#${route}`);
    await page.locator('[data-screen]').first().waitFor();
    await page.goto('/pitch/demo/#/g/p9'); // night summary (g10/g12) and morning review (g18) are the P9 screen
    await page.locator('[data-screen=P9]').waitFor();
    const rec = page.getByTestId('confirm-record');
    await expect(rec).toHaveText('Confirmed by guest, 11:26 PM');
    await expect(page.locator('main')).not.toContainText('(sample data)');
    await expect(page.locator('main')).not.toContainText('10:04');
    // P10 (Something's wrong) reaches the same fallback
    await page.goto('/pitch/demo/#/g/p10');
    await page.locator('[data-screen=P10]').waitFor();
    await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:26 PM');
    await expect(page.locator('main')).not.toContainText('(sample data)');
    await expect(page.locator('main')).not.toContainText('10:04');
    await ctx.close();
  }
});
