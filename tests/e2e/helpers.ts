import { expect, type Page } from '@playwright/test';

export const ROUTES = [
  '/g/home', '/g/p1', '/g/p1h', '/g/p3w', '/g/p12', '/g/p12s', '/g/p2', '/g/p2t', '/g/p3',
  '/g/p4', '/g/p5', '/g/p5w', '/g/e3', '/g/p6', '/g/p7', '/g/p8', '/g/p13', '/g/p13f',
  '/g/e1', '/g/e2', '/g/e4', '/g/e5', '/g/e6', '/g/e7', '/g/inbox', '/g/m1', '/g/m2', '/g/p9', '/g/p10', '/g/p11',
  '/g/demo', '/o', '/o/summary', '/o/limits', '/o/bar',
];

export async function open(page: Page, hash: string) {
  await page.goto(`/#${hash}${hash.includes('?') ? '&' : '?'}preview=1`);
  await expect(page.getByTestId('sim-banner')).toBeVisible();
}

export const state = (page: Page) => page.evaluate(() => (window as any).__ridenite.store.getState());
export const store = (page: Page, fn: string) => page.evaluate((f) => { const s = (window as any).__ridenite.store; return new Function('s', f)(s); }, fn);

/** Tap counter: counts every real tap the test performs in the app. */
export function tapper(page: Page) {
  let n = 0;
  return {
    async tap(testId: string) { n++; await page.getByTestId(testId).tap(); },
    get count() { return n; },
  };
}

export async function inViewport(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  const vp = page.viewportSize()!;
  expect(box, `${testId} has a box`).not.toBeNull();
  return { box: box!, inside: box!.y >= 0 && box!.x >= 0 && box!.y + box!.height <= vp.height + 0.5 && box!.x + box!.width <= vp.width + 0.5 };
}

/** Same-document navigation (no reload; a reload would start a fresh demo). */
export async function nav(page: Page, hash: string) {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await expect(page.getByTestId('sim-banner')).toBeVisible();
}

/** Hold-and-slide confirm: drag the thumb `fraction` of its travel and release. */
export async function slide(page: Page, testId = 'confirm', fraction = 0.95, opts: { release?: boolean } = {}) {
  const thumb = page.getByTestId(`${testId}-thumb`);
  await expect(thumb).toBeVisible();
  const t = (await page.getByTestId(testId).boundingBox())!;
  const b = (await thumb.boundingBox())!;
  const inset = b.x - t.x;
  const travel = t.width - b.width - inset * 2;
  const x0 = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  await page.mouse.move(x0 + travel * fraction, y, { steps: 12 });
  if (opts.release !== false) await page.mouse.up();
}
