import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ROUTES, open } from './helpers';
// @ts-expect-error plain JS module
import { lintText } from '../../scripts/copy-lint.mjs';

test('M0 smoke: noindex, PWA head tags, banner and fictional-data note', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('meta[name=viewport]')).toHaveAttribute('content', /viewport-fit=cover/);
  await expect(page.locator('link[rel=manifest]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('link[rel=apple-touch-icon]')).toHaveAttribute('sizes', '180x180');
  await expect(page.locator('meta[name=apple-mobile-web-app-status-bar-style]')).toHaveAttribute('content', 'black-translucent');
  await expect(page.getByTestId('sim-label')).toHaveText('SIMULATED DEMO');
  await expect(page.getByText('Fictional data only', { exact: false })).toBeAttached();
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ short_name: 'RideNite', display: 'standalone', start_url: '/', scope: '/' });
  const inputMin = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(inputMin).toBeGreaterThanOrEqual(16);
});

for (const route of ROUTES) {
  test.describe(`route ${route}`, () => {
    test('renders with the banner visible, unclipped; rendered copy passes lint', async ({ page }) => {
      await open(page, route);
      await expect(page.locator('main')).toBeVisible();
      const label = (await page.getByTestId('sim-label').boundingBox())!;
      expect(label.y).toBeGreaterThanOrEqual(0);
      expect(label.height).toBeGreaterThan(10);
      await expect(page.getByTestId('sim-label')).toBeInViewport({ ratio: 1 });
      // not covered by anything (menu button, sheets): left, middle and right hit-test to the label
      const covered = await page.getByTestId('sim-label').evaluate((el) => {
        const r = el.getBoundingClientRect();
        const y = r.top + r.height / 2; // pill shape: probe along the middle, inset by the corner radius
        const pts = [[r.left + r.height / 2, y], [r.left + r.width / 2, y], [r.right - r.height / 2, y]];
        return pts.filter(([x, y]) => { const hit = document.elementFromPoint(x, y); return !hit || !el.contains(hit); }).length;
      });
      expect(covered, 'SIMULATED DEMO label is not covered').toBe(0);
      // still visible after scrolling to the bottom (sticky)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.getByTestId('sim-label')).toBeInViewport({ ratio: 1 });
      const text = await page.evaluate(() => document.body.innerText);
      expect(lintText(text, route)).toEqual([]);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, 'no horizontal scroll').toBeLessThanOrEqual(0);
    });

    test('every tap target is at least 56 x 56', async ({ page }) => {
      await open(page, route);
      const small = await page.$$eval('button, a[href], input, select, textarea, [role=button]', (els) =>
        els.filter((e) => {
          const r = e.getBoundingClientRect();
          const st = getComputedStyle(e);
          return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && !e.matches('.sr-only:not(:focus)') && (r.width < 55.5 || r.height < 55.5);
        }).map((e) => `${e.tagName} "${(e.textContent || (e as HTMLElement).getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
      expect(small).toEqual([]);
    });

    test('axe: zero serious or critical issues', async ({ page }) => {
      await open(page, route);
      await page.waitForTimeout(250);
      const res = await new AxeBuilder({ page }).analyze();
      const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`);
      expect(bad).toEqual([]);
    });
  });
}
