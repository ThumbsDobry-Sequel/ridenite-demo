import { expect, test } from '@playwright/test';
import { nav, open, slide, store } from './helpers';

/** Round 2 (Piper, Riley, Quinn, Oct 11): addresses, drinks wording, stable IDs, credits, header, chip, seed, trip time. */

const SAT = new Date('2026-10-11T03:30:50Z'); // Sat Oct 10, 11:30:50 PM ET

test('opaque header: solid page color, no blur, 1px divider; scrolled rows never show through', async ({ page }) => {
  await page.clock.install({ time: SAT });
  await open(page, '/g/p9');
  const h = page.getByTestId('sim-banner');
  const css = await h.evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, bf: c.backdropFilter || (c as any).webkitBackdropFilter, bw: c.borderBottomWidth, pos: c.position }; });
  const bg = await page.evaluate(() => { const d = document.createElement('div'); d.style.background = 'var(--bg)'; document.querySelector('[data-testid=sim-banner]')!.parentElement!.append(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; });
  expect(css.bg).toBe(bg);
  expect(css.bg).not.toMatch(/rgba\(.*,\s*0?\.\d+\)/);
  expect(css.bf === 'none' || !css.bf).toBe(true);
  expect(css.bw).toBe('1px');
  expect(css.pos).toBe('sticky');
  await page.evaluate(() => window.scrollTo(0, 500));
  const hb = (await h.boundingBox())!;
  expect(hb.y).toBeLessThanOrEqual(0.5);
  // the topmost element at a point just under the pill and the Menu button is the header itself
  for (const x of [40, hb.width - 40]) {
    const inHeader = await page.evaluate(([px, py]) => !!document.elementFromPoint(px, py)?.closest('[data-testid=sim-banner]'), [x, hb.y + hb.height - 2]);
    expect(inHeader).toBe(true);
  }
});

test("g02: selected 'Just me' is neutral (text border on surface-2), the slide is the only amber", async ({ page }) => {
  await open(page, '/g/p3');
  const just = page.getByTestId('riders').getByRole('button', { name: 'Just me' });
  await expect(just).toHaveAttribute('aria-pressed', 'true');
  const c = await just.evaluate((e) => { const s = getComputedStyle(e); return { b: s.borderTopColor, bg: s.backgroundColor }; });
  const tok = await page.evaluate(() => Object.fromEntries(['--text', '--surface-2', '--primary'].map((v) => { const d = document.createElement('div'); d.style.color = `var(${v})`; document.querySelector('main')!.append(d); const x = getComputedStyle(d).color; d.remove(); return [v, x]; })));
  expect(c.b).toBe(tok['--text']);
  expect(c.bg).toBe(tok['--surface-2']);
  expect(c.b).not.toBe(tok['--primary']);
});

test('bartender Tonight: the seeded Table/Bar 9 ride reads Ride booked, never Driver declined', async ({ page }) => {
  await open(page, '/b/tonight');
  await expect(page.locator('body')).not.toContainText('Driver declined');
  await nav(page, '/b/live');
  await expect(page.locator('body')).not.toContainText('Driver declined');
  await expect(page.getByTestId('decline-banner')).toHaveCount(0);
  await nav(page, '/b/history');
  await expect(page.locator('body')).not.toContainText('Driver declined');
});

test('stable ride ID: the standard night shows RN-7Q4K2M on P9 and M1, night and morning', async ({ page }) => {
  await page.clock.install({ time: SAT });
  await open(page, '/g/p3');
  await slide(page);
  await page.clock.runFor(10_000 + 61_000);
  await page.clock.fastForward(14 * 60_000);
  await nav(page, '/g/p9');
  await expect(page.getByTestId('ride-id')).toContainText('RN-7Q4K2M');
  await nav(page, '/g/m1');
  await expect(page.locator('main')).toContainText('RN-7Q4K2M');
  await page.clock.fastForward('10:00:00'); // Sunday morning: same ID
  await nav(page, '/g/m1');
  await expect(page.locator('main')).toContainText('RN-7Q4K2M');
});

test('believable trip: pickup 11:32, P6 14 min / arrive about 11:46 PM, drop-off 11:46 on P7 and P9; Demo: next status keeps it', async ({ page }) => {
  await page.clock.install({ time: SAT });
  await open(page, '/g/p3');
  await slide(page);
  await page.clock.runFor(10_000 + 61_000);
  await nav(page, '/g/p6');
  await expect(page.getByTestId('p6-eta')).toHaveText('14 min');
  await expect(page.getByTestId('p6-arrive')).toHaveText('arrive about 11:46 PM');
  await page.getByTestId('demo-next').tap();
  await nav(page, '/g/p7');
  await expect(page.locator('main')).toContainText('11:46 PM');
  await nav(page, '/g/p9');
  await expect(page.locator('.tl li').filter({ hasText: 'Picked up' })).toContainText('11:32 PM');
  await expect(page.locator('.tl li').filter({ hasText: 'Dropped off' })).toContainText('11:46 PM');
});

test('E8 is the Fri Oct 9 traffic ride RN-NHMCXN ($3.10 over the cap); no goes to its receipt, yes posts it', async ({ page }) => {
  await page.clock.install({ time: SAT });
  await open(page, '/g/e8');
  await expect(page.getByTestId('e8-ride')).toContainText('Night of Fri, Oct 9');
  await expect(page.getByTestId('e8-ride')).toContainText('RN-NHMCXN');
  await expect(page.getByTestId('e8-over')).toHaveText('$3.10');
  await page.getByTestId('e8-no').tap();
  await expect(page.locator('[data-screen=sample-traffic]')).toBeVisible();
  await expect(page.getByTestId('ride-id')).toContainText('RN-NHMCXN');
  await expect(page.getByTestId('ride-subtotal')).toHaveText('$25.20');
  await nav(page, '/g/e8');
  await page.getByTestId('e8-yes').tap();
  await expect(page.getByTestId('ride-subtotal')).toHaveText('$28.30');
  await expect(page.getByTestId('max-approved')).toHaveCount(0);
});

test('owner credits reconcile: o02 and o05 tie to RN-NHMCXN $3.10; statement subtotals sum to the total; every line names a seeded ride', async ({ page }) => {
  await page.clock.install({ time: SAT });
  await open(page, '/o/summary');
  await expect(page.getByTestId('summary-night')).toContainText('night of Fri, Oct 9');
  await expect(page.getByTestId('summary-quote-credit')).toHaveCount(1);
  await expect(page.getByTestId('summary-quote-credit')).toContainText('RN-NHMCXN');
  await expect(page.getByTestId('summary-quote-credit')).toContainText('-$3.10');
  await expect(page.locator('main')).not.toContainText('-$2.10');
  await nav(page, '/o/statement');
  const cents = (t: string) => { const m = t.match(/(-?)\$(\d+\.\d{2})/)!; return (m[1] ? -1 : 1) * Math.round(parseFloat(m[2]) * 100); };
  const fee = (await page.getByTestId('fee-return-line').allInnerTexts()).map(cents);
  const qc = (await page.getByTestId('quote-credit-line').allInnerTexts()).map(cents);
  expect(qc).toEqual([-310]);
  expect(cents(await page.getByTestId('fee-returns-subtotal').innerText())).toBe(fee.reduce((a, b) => a + b, 0));
  expect(cents(await page.getByTestId('quote-credits-subtotal').innerText())).toBe(-310);
  expect(cents(await page.getByTestId('credits-total').innerText())).toBe(fee.reduce((a, b) => a + b, 0) - 310);
  const rides = (await page.getByTestId('statement-ride').allInnerTexts()).join('\n');
  for (const l of [...await page.getByTestId('fee-return-line').allInnerTexts(), ...await page.getByTestId('quote-credit-line').allInnerTexts()]) {
    const id = l.match(/RN-[0-9A-Z]{6}/)![0];
    expect(rides).toContain(id);
  }
});

test('no street address and no drinks wording on guest, staff, email and receipt screens', async ({ page }) => {
  await page.clock.install({ time: SAT });
  await open(page, '/g/home');
  const street = /\b\d{2,5} (?:[NSEW] )?[A-Z][a-z]+(?: [A-Z][a-z]+)? (?:St|Blvd|Ave|Dr|Rd|Pike)\b|\b(VA|DC) \d{5}\b/;
  for (const r of ['/g/home', '/g/p2t?loc=1', '/g/p3', '/g/p9', '/g/m1', '/g/m2', '/g/inbox', '/g/sample-traffic', '/b/tonight', '/b/live', '/b/history', '/b/tab?tab=4468', '/o/statement']) {
    await nav(page, r);
    const t = await page.locator('body').innerText();
    expect(t, r).not.toMatch(street);
    expect(t, r).not.toMatch(/\bdrinks?\b/i);
  }
  await open(page, '/b/tonight');
  await store(page, "s.barStartDraft('4475','staff_offer')");
  await nav(page, '/b/sheet?tab=4475');
  await page.getByTestId('b3-mode-staff').tap();
  await expect(page.getByTestId('b3-dests')).toContainText('Lyon Village area');
  const t = await page.locator('body').innerText();
  expect(t).not.toMatch(street);
  await nav(page, '/g/m1');
  await expect(page.locator('main')).toContainText('Maison Cheryl, Clarendon area.');
});
