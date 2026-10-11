import { expect, test, type Page } from '@playwright/test';
import { nav, open, slide } from './helpers';

/** Round 3 (Riley, Quinn, Oct 11): one story source. Slide 11:26:05 PM ET, booked 11:26, pickup 11:32 (6 min), drop-off 11:46. */

const SLIDE = new Date('2026-10-11T03:26:05Z'); // Sat Oct 10, 11:26:05 PM ET
const body = (p: Page) => p.locator('main').first().innerText();
const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };

async function bookAt1126(page: Page) {
  await page.clock.install({ time: SLIDE });
  await open(page, '/g/home');
  await page.getByTestId('ride-home').tap();
  await page.locator('[data-screen=P3]').waitFor();
  await slide(page);
  await page.getByTestId('undo').waitFor();
  await page.clock.runFor(10_600);
  await page.clock.runFor(8_400);
  await page.locator('[data-screen=P5]').waitFor();
}

test('one source: booked 11:26 and "6 min" everywhere; pickup 11:32, drop-off 11:46; Demo: next status keeps the clock consistent', async ({ page }) => {
  await bookAt1126(page);
  await expect(page.getByTestId('eta')).toHaveText('6 min');
  // Demo: next status, step by step: the phone clock jumps to each stage, never backwards
  const clock = () => page.evaluate(() => Date.now());
  let last = await clock();
  for (const scr of ['P5w', 'E3', 'P6', 'P7']) {
    await page.getByTestId('demo-next').first().tap();
    await page.locator(`[data-screen=${scr}]`).first().waitFor();
    const t = await clock();
    expect(t, scr).toBeGreaterThan(last);
    last = t;
    if (scr === 'P6') {
      const p6 = await body(page);
      expect(p6).toContain('Picked up 11:32 PM');
      expect(p6).toContain('arrive about 11:46 PM');
      expect(p6).toContain('14 min');
    }
  }
  await page.locator('[data-screen=P7]').waitFor();
  expect(await body(page)).toContain('11:46 PM');
  // P9 header time is never earlier than drop-off
  await nav(page, '/g/p9');
  const p9 = await body(page);
  const head = p9.match(/Sat (\d{1,2}:\d{2}) PM/)!;
  expect(toMin(head[1])).toBeGreaterThanOrEqual(toMin('11:46'));
  expect(p9).toMatch(/11:26 PM\nRide home booked/);
  expect(p9).toMatch(/11:32 PM\nPicked up/);
  expect(p9).toMatch(/11:46 PM\nDropped off/);
  await nav(page, '/g/p10');
  expect(await body(page)).toContain('Confirmed by guest, 11:26 PM');
  // bartender views on this phone (same ride)
  await nav(page, '/b/tab?tab=4468'); await page.getByTestId('b6-close').waitFor();
  expect(await body(page)).toContain('11:26 PM');
  await nav(page, '/b/history'); await page.locator('[data-screen=b5]').waitFor();
  expect(await body(page)).toContain('11:26 PM · tab #4468');
  // next morning: text and receipt
  await page.clock.fastForward(new Date('2026-10-11T13:00:20Z').getTime() - (await clock()));
  await nav(page, '/g/m2'); await page.locator('[data-screen=M2]').waitFor();
  const m2 = await body(page);
  expect(m2).toContain('Sat 11:26 PM');
  expect(m2).toContain('about 6 min');
  await nav(page, '/g/m1'); await page.locator('[data-screen=M1]').waitFor();
  const m1 = await body(page);
  expect(m1).toContain('11:32 PM');
});

test('g14: driver and plate only after a driver accepts; the requested text names neither', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T13:00:20Z') });
  await open(page, '/g/m2');
  const bubbles = await page.locator('.bubble').allInnerTexts();
  const req = bubbles.find((b) => /requested/.test(b))!;
  expect(req).not.toMatch(/XLT-5012|Luis|Camry|plate/);
  expect(bubbles.findIndex((b) => /XLT-5012/.test(b))).toBeGreaterThan(bubbles.indexOf(req));
});

test('bartender: B3 and B4 say 6 min; B5 history has varied times, fares and statuses, never three on the way; no declined path in the demo panel', async ({ page }) => {
  await page.clock.install({ time: SLIDE });
  await open(page, '/b/live');
  expect(await body(page)).toContain('6 min');
  await nav(page, '/b/history'); await page.locator('[data-screen=b5]').waitFor();
  const rows = await page.getByTestId('hist-row').allInnerTexts();
  expect(rows.length).toBeGreaterThanOrEqual(7);
  const times = rows.map((r) => r.match(/(\d{1,2}:\d{2}) PM/)![1]);
  expect(new Set(times).size).toBe(times.length);
  const fares = rows.map((r) => r.match(/\$\d+\.\d{2}/)![0]);
  expect(new Set(fares).size).toBeGreaterThanOrEqual(5);
  expect(rows.filter((r) => /Driver on the way/.test(r)).length).toBeLessThanOrEqual(1);
  expect(rows.join('\n')).not.toContain('Driver declined');
  await open(page, '/g/demo');
  await expect(page.getByTestId('force-driver-cancel')).toHaveCount(0);
  await expect(page.getByTestId('fault-E6')).toHaveCount(0);
});

test('b08/b09: the tab bar is opaque; rows never show through', async ({ page }) => {
  await open(page, '/b/history');
  const css = await page.locator('.btabbar').evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, bf: c.backdropFilter || (c as any).webkitBackdropFilter }; });
  expect(css.bg).not.toMatch(/rgba\(.*,\s*0?\.\d+\)|transparent/);
  expect(css.bf === 'none' || !css.bf).toBe(true);
});

for (const vp of [{ width: 390, height: 844 }, { width: 375, height: 667 }]) {
  test(`g02 at ${vp.width}x${vp.height}: pickup line, car line and over-cap line all sit fully above the slider`, async ({ page }) => {
    await page.setViewportSize(vp);
    await open(page, '/g/p3');
    const top = (await page.locator('.sticky-actions--slide').boundingBox())!.y;
    for (const id of ['pickup-line', 'max-line', ...(vp.height > 700 ? ['car-line'] : [])]) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y + b.height, id).toBeLessThanOrEqual(top);
    }
    await expect(page.getByTestId('pickup-line')).toHaveText('Front door, Maison Cheryl');
    if (vp.width <= 380) {
      // SE g02 (Riley): ETA folded into the pickup line, no separate car card, cap lines clear of the slider
      await expect(page.getByTestId('eta-fold')).toBeVisible();
      await expect(page.getByTestId('eta-fold')).toHaveText(', about 6 min');
      await expect(page.getByTestId('pickup-card')).toBeHidden();
      for (const id of ['cap-line', 'max-line']) { const b = (await page.getByTestId(id).boundingBox())!; expect(b.y + b.height, id).toBeLessThanOrEqual(top); }
    } else {
      await expect(page.getByTestId('eta-fold')).toBeHidden();
      await expect(page.getByTestId('car-line')).toHaveText('Car: Partner car, about 6 min');
    }
  });
}

test('P3 slide button stays at 20,620 353x88 in the 393x852 video viewport', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await open(page, '/g/p3');
  const b = (await page.getByTestId('confirm').boundingBox())!;
  expect([b.x, b.y, b.width, b.height].map(Math.round)).toEqual([20, 620, 353, 88]);
});
