import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

test.use({ serviceWorkers: 'allow' });
// WebKit SW reloads occasionally hang under 4 parallel workers (passes alone every time); one retry.
test.describe.configure({ retries: 1 });

test('service worker: network-first, versioned cache, new version picked up on next reload', async ({ page, browserName }, info) => {
  test.skip(info.project.name !== 'iphone-390x844', 'run once');
  await page.goto('/');
  const ready = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    await navigator.serviceWorker.ready;
    return 'ready';
  });
  test.skip(ready === 'unsupported', `service workers unsupported in ${browserName} here`);
  const v1 = (await (await page.request.get('/version.json')).json()).version as string;
  await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 10_000 }).toContain(`ridenite-${v1}`);

  // Simulate a new deploy: swap dist/sw.js on disk for one with a new version string
  // (page.route cannot intercept service worker script fetches in WebKit). Restored after.
  const file = new URL('../../dist/sw.js', import.meta.url);
  const orig = readFileSync(file, 'utf8');
  writeFileSync(file, orig.split(v1).join('test-v2'));
  try {
    await page.reload(); // navigation triggers the update check (updateViaCache: none)
    await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg?.update(); });
    await page.reload();
  await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 15_000 }).toEqual(expect.arrayContaining(['ridenite-test-v2']));
  await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 15_000 }).not.toContain(`ridenite-${v1}`);
    await page.reload(); // the app still loads under the new worker
    await expect(page.getByTestId('sim-banner')).toBeVisible({ timeout: 10_000 });
    expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toContain('/sw.js');
  } finally {
    writeFileSync(file, orig);
  }
});

// Playwright WebKit's setOffline also fails SW-served navigations ('internal error'), so this
// cannot be verified headless here. Offline is SCOPE M3; verify on a real iPhone.
test.fixme('service worker: app shell still opens offline after one visit', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'iphone-390x844', 'run once');
  await page.goto('/');
  const ok = await page.evaluate(async () => { if (!('serviceWorker' in navigator)) return false; await navigator.serviceWorker.ready; return true; });
  test.skip(!ok, 'service workers unsupported here');
  await page.reload(); // now controlled; assets cached on the way through
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.goto('/?o=1#/g/home'); // real navigation (not hash-only), served by the SW cache
  await expect(page.getByTestId('sim-banner')).toBeVisible();
  await expect(page.getByTestId('ride-home')).toBeVisible();
  await context.setOffline(false);
});
