import { expect, test } from '@playwright/test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ROUTES, open, store } from './helpers';

/**
 * Copy snapshot (Nico 22:40): every Maison Cheryl screen renders the same text after venue words moved into
 * venue.config.ts. Fixed clock so dates and times are stable. Regenerate only for an intended copy change:
 * UPDATE_COPY=1 npx playwright test copy-snapshot --project=iphone-390x844
 */
const GOLDEN = 'tests/golden/copy-snapshot.json';
const BAR: [string, string, string?][] = [
  ['B0', '/b'], ['B1', '/b/tonight'], ['B2', '/b/book'],
  ['B3', '/b/sheet?tab=4471', "s.barStartDraft('4471','guest_request')"],
  ['B3 staff', '/b/sheet?tab=4475', "s.barStartDraft('4475','staff_offer'); s.barSetMode('staff')"],
  ['Booked', '/b/booked?ride=r-4472-seed'], ['B4', '/b/live'], ['B5', '/b/history'], ['B6', '/b/tab?tab=4472'],
  ['B8', '/b/settings'], ['B9', '/b/plate?tab=4472'], ['B10', '/b/quiet'], ['More', '/b/more'],
];

test('every screen renders the snapshot copy (Maison Cheryl, fixed clock)', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone-390x844', 'one size is enough for copy');
  test.setTimeout(180_000);
  const got: Record<string, string> = {};
  const norm = (t: string) => t.replace(/Build [^\n]*/g, '').replace(/[ \t]+/g, ' ').trim();
  for (const r of ROUTES) {
    await page.goto('about:blank');
    await page.clock.install({ time: new Date('2026-10-11T02:30:00Z') });
    await open(page, r);
    await page.waitForTimeout(200);
    got[r] = norm(await page.locator('body').innerText());
  }
  for (const [name, path, prep] of BAR) {
    await page.goto('about:blank');
    await page.clock.install({ time: new Date('2026-10-11T02:30:00Z') });
    await open(page, '/b/tonight');
    if (prep) await store(page, prep);
    await page.evaluate((h) => { location.hash = h; }, path);
    await page.waitForTimeout(250);
    got[`bar:${name}`] = norm(await page.locator('body').innerText());
  }
  if (process.env.UPDATE_COPY || !existsSync(GOLDEN)) { writeFileSync(GOLDEN, JSON.stringify(got, null, 1)); return; }
  const want = JSON.parse(readFileSync(GOLDEN, 'utf8')) as Record<string, string>;
  for (const k of Object.keys(want)) expect(got[k], k).toBe(want[k]);
});
