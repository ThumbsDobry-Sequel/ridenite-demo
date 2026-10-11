import { test, expect } from '@playwright/test';

/** /pitch/demo/ (Sample Venue export): sample times and IDs are pinned, whatever the browser clock says. */
for (const fake of ['2026-10-11T12:00:00Z', '2026-12-03T20:15:00Z']) { // Sun 8:00 AM ET; a Thursday evening weeks later
  test(`pitch demo pins the story times with the browser clock at ${fake}`, async ({ page }) => {
    await page.clock.install({ time: new Date(fake) });
    await page.goto('/pitch/demo/#/g/p9');
    await page.locator('[data-screen=P9]').waitFor();
    await expect(page.getByTestId('confirm-record')).toHaveText('Confirmed by guest, 11:26 PM (sample data)');
    await expect(page.getByTestId('ride-route')).toHaveText('Clarendon area to Westover area, picked up 11:32 PM');
    await expect(page.getByTestId('ride-line-amt')).toHaveText('$24.60');
    await expect(page.getByTestId('night-heading')).toHaveText('Saturday night');
    await page.goto('/pitch/demo/#/g/sample-traffic');
    await expect(page.getByTestId('ride-id')).toContainText('RN-NHMCXN');
  });
}
