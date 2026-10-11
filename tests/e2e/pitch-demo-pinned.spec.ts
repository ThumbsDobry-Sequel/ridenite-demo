import { test, expect, type Page } from '@playwright/test';

/**
 * /pitch/demo/ (Sample Venue export): the whole export runs on the pinned story clock (Sat 11:46 PM ET start), so
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
    for (const t of await times(page)) expect(t, 'live-clock time on /g/p9').toMatch(/^(7:26 PM|11:26 PM|11:32 PM|11:46 PM|11:00 AM)$/);
    for (const r of ['/g/m1', '/g/sample-traffic', '/g/sample-traffic?ok=1', '/g/inbox', '/g/m2']) {
      await page.goto(`/pitch/demo/#${r}`); await page.waitForTimeout(300);
      const ts = await times(page);
      for (const t of ts) expect(t, `live-clock time on ${r}`).toMatch(/^(7:26 PM|11:26 PM|11:32 PM|11:46 PM|11:00 AM)$/);
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

/** Team lead (Oct 11, 5:42): exact story times on first load with fresh storage, under the real clock, a faked 8:00 AM and a December afternoon. */
for (const [label, fake] of [['real clock', null], ['8:00 AM ET', '2026-10-11T12:00:00Z'], ['December afternoon', '2026-12-15T19:30:00Z']] as const) {
  test(`pitch demo fresh storage (${label}): exact story times on /g/p9 and untagged fallback on /g/p9 and /g/p10`, async ({ browser, viewport, baseURL }) => {
    const ctx = await browser.newContext({ viewport, baseURL });
    const page = await ctx.newPage();
    if (fake) await page.clock.install({ time: new Date(fake) });
    await page.goto('/pitch/demo/#/g/p9');
    await page.locator('[data-screen=P9]').waitFor();
    const body = page.locator('body');
    await expect(body).toContainText('Sat 11:46 PM'); // header
    await expect(body).toContainText('7:26 PM'); // tab opened
    await expect(body).not.toContainText('7:52 PM');
    await expect(body).not.toContainText('11:52');
    await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:26 PM'); // booked
    await expect(page.getByTestId('ride-route')).toHaveText('Clarendon area to Westover area, picked up 11:32 PM'); // pickup
    await expect(page.locator('main')).toContainText('11:46 PM'); // drop-off
    await expect(page.getByTestId('night-tagline')).toHaveText('Saturday night. Tab closed. Ride home added: $24.60.'); // Nico, Oct 11
    await expect(page.locator('main')).not.toContainText('(sample data)');
    await page.goto('/pitch/demo/#/g/p10');
    await page.locator('[data-screen=P10]').waitFor();
    await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:26 PM');
    await expect(page.locator('main')).not.toContainText('(sample data)');
    await ctx.close();
  });
}

/** Nico (Oct 11, 5:48): no drift. Load, advance the fake clock 26 minutes, check, reload, check: same exact strings. */
test('pitch demo: story times fixed; now restarts at Sat 11:46:00 PM (within 5 s) on every load, after 26 min open or reload', async ({ browser, viewport, baseURL }) => {
  const ctx = await browser.newContext({ viewport, baseURL });
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date('2026-10-11T12:00:00Z') });
  const check = async () => {
    await page.locator('[data-screen=P9]').waitFor();
    const body = page.locator('body');
    await expect(body).toContainText('Sat 11:46 PM');
    await expect(body).toContainText('7:26 PM');
    await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:26 PM');
    await expect(page.getByTestId('ride-route')).toHaveText('Clarendon area to Westover area, picked up 11:32 PM');
    await expect(page.getByTestId('night-tagline')).toHaveText('Saturday night. Tab closed. Ride home added: $24.60.');
    await expect(body).not.toContainText('11:52');
  };
  const atLoad = async () => {
    await check();
    expect(await page.evaluate(() => (window as unknown as { __pinnedStart: number }).__pinnedStart)).toBe(Date.UTC(2026, 9, 11, 3, 46, 0));
    const skew = await page.evaluate(() => Math.abs(Date.now() - (window as unknown as { __pinnedStart: number }).__pinnedStart));
    expect(skew, 'header within 5 s of 11:46:00 PM at load').toBeLessThanOrEqual(5000);
  };
  await page.goto('/pitch/demo/#/g/p9'); await atLoad();
  await page.clock.fastForward('26:00'); // left open 26 min: story times unchanged
  await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:26 PM');
  await expect(page.getByTestId('ride-route')).toHaveText('Clarendon area to Westover area, picked up 11:32 PM');
  await expect(page.locator('body')).toContainText('7:26 PM');
  await page.reload(); await atLoad(); // every load restarts at 11:46:00 PM
  await page.clock.fastForward('20:00'); await page.reload(); await atLoad();
  await ctx.close();
});

/** Nico (Oct 11, 6:05): #/g/m1?morning=1 opens the morning receipt email at Sun 9:00 AM ET; __pinnedStart and the story stay pinned. */
for (const fake of [null, '2026-10-11T12:00:00Z', '2026-12-15T19:30:00Z']) {
  test(`pitch demo: m1?morning=1 reads Sunday morning, 9:00 AM (browser clock ${fake ?? 'real'})`, async ({ browser, viewport, baseURL }) => {
    const ctx = await browser.newContext({ viewport, baseURL });
    const page = await ctx.newPage();
    if (fake) await page.clock.install({ time: new Date(fake) });
    await page.goto('/pitch/demo/#/g/m1?morning=1');
    await page.locator('[data-screen=M1]').waitFor();
    await expect(page.locator('main')).toContainText('Sunday morning, 9:00 AM');
    await expect(page.locator('main')).toContainText('Good morning');
    await expect(page.getByTestId('ride-item')).toContainText('picked up 11:32 PM, $24.60');
    await expect(page.locator('main')).not.toContainText('Saturday night, 11:46 PM');
    expect(await page.evaluate(() => (window as unknown as { __pinnedStart: number }).__pinnedStart)).toBe(1791690360000);
    expect(await page.evaluate(() => (window as unknown as { __pinnedMorning: number }).__pinnedMorning)).toBe(Date.UTC(2026, 9, 11, 13, 0, 0));
    // plain m1 on a fresh load keeps the 11:46 PM start
    const ctx2 = await browser.newContext({ viewport, baseURL }); const p2 = await ctx2.newPage();
    if (fake) await p2.clock.install({ time: new Date(fake) });
    await p2.goto('/pitch/demo/#/g/m1'); await p2.locator('[data-screen=M1]').waitFor();
    expect(await p2.evaluate(() => (window as unknown as { __pinnedMorning: number | null }).__pinnedMorning)).toBeNull();
    await ctx.close(); await ctx2.close();
  });
}
