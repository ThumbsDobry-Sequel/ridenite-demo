import { expect, test } from '@playwright/test';
import { nav, open, slide, store } from './helpers';

/** Oct 11 investor-video fixes (Quinn, Nico, Piper): copy, items, night date, ETA, tagline size. */

test('no safe/unsafe copy on the table QR page or the bartender add-ride sheet', async ({ page }) => {
  await open(page, '/g/p1');
  await expect(page.locator('body')).not.toContainText(/\bsafe\b|unsafe/i);
  await expect(page.locator('main')).toContainText('Need to get home? Ask staff for a car.');
  await open(page, '/b/tonight');
  await store(page, "s.barStartDraft('4471','guest_request')");
  await page.evaluate(() => { location.hash = '/b/sheet?tab=4471'; });
  await expect(page.getByTestId('b3-help')).toHaveText('Venue procedure');
  await expect(page.locator('body')).not.toContainText(/\bsafe\b|unsafe/i);
});

test('demo tab carries food and neutral items only; bar sales stay $64.19', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T03:30:00Z') });
  await open(page, '/g/p9');
  const body = page.locator('body');
  for (const w of ['Old Fashioned', 'House Beer', 'Pear Necessities']) await expect(body).not.toContainText(w);
  await expect(page.getByTestId('bar-subtotal')).toHaveText('$64.19');
  await expect(page.locator('main')).toContainText('Dinner for two');
  await expect(page.locator('main')).toContainText('Table snacks');
});

test('same night: guest home says "Tonight\'s receipt", never "Last night\'s"', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T03:30:00Z') }); // Sat 11:30 PM ET
  await open(page, '/g/home');
  await expect(page.getByTestId('receipt-card')).toContainText("Tonight's receipt");
  await expect(page.getByTestId('receipt-card')).toContainText('Sat Oct 10');
  await expect(page.locator('body')).not.toContainText("Last night's receipt");
});

test('ride times agree: P6 arrive time = P7 drop-off = P9 drop-off; Sunday morning still names Saturday; tagline >= 17 pt', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T03:25:50Z') }); // Sat 11:25:50 PM ET (booked 11:26)
  await open(page, '/g/p3');
  await slide(page);
  await page.clock.runFor(10_500); await page.clock.fastForward(361_000); // undo window, then picked up (+6 min)
  await nav(page, '/g/p6');
  const arrive = (await page.getByTestId('p6-arrive').innerText()).replace('arrive about ', '').trim();
  await expect(page.getByTestId('p6-eta')).toHaveText('14 min');
  await expect(page.getByTestId('p6-arrive')).toHaveText('arrive about 11:46 PM');
  await page.clock.fastForward(14 * 60_000);
  await nav(page, '/g/p7');
  await expect(page.locator('body')).toContainText(arrive);
  await store(page, "s.barCloseTab(s.getState().linkedTab.tab, 'closed')");
  await nav(page, '/g/p9');
  await expect(page.locator('.tl li').filter({ hasText: 'Dropped off' })).toContainText(arrive);
  await expect(page.getByTestId('night-tagline')).toHaveText('Saturday, Oct 10. Tab closed. Ride home included: $24.60.');
  const px = await page.getByTestId('night-tagline').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(px).toBeGreaterThanOrEqual(17);
  await page.clock.fastForward('09:30:00'); // Sun ~9:00 AM ET
  await nav(page, '/g/m1');
  await expect(page.getByTestId('night-tagline')).toHaveText('Saturday, Oct 10. Tab closed. Ride home included: $24.60.');
  expect(await page.getByTestId('night-tagline').evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(17);
  await expect(page.locator('main')).toContainText("Here's last night's tab");
  await nav(page, '/g/home');
  await expect(page.getByTestId('receipt-card')).toContainText("Last night's receipt");
  await nav(page, '/g/m2');
  await expect(page.locator('main')).toContainText('It will go on your tab at Maison Cheryl at pickup.');
  await expect(page.locator('main')).not.toContainText('Sun 11:');
});

test('guest ride screens, SMS and receipts are area-only; pickup at the venue front door; bar-of-record E7 line', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T03:30:50Z') });
  await open(page, '/g/home');
  await expect(page.locator('main')).toContainText('Ask staff, then confirm the price.');
  await expect(page.getByTestId('ride-home')).toContainText('To Westover area');
  const street = /\d{2,} [NS]? ?[A-Z][a-z]+ (St|Blvd|Dr|Pike|Rd|Ave)\b|Fillmore|Harrison/;
  for (const r of ['/g/home', '/g/p2t?loc=1', '/g/p3', '/g/p5', '/g/e3', '/g/p6', '/g/p7', '/g/p9', '/g/m1', '/g/m2', '/b/tonight', '/b/live', '/b/history', '/b/sheet?tab=4475']) {
    await nav(page, r);
    const t = await page.locator('main').innerText();
    // the venue's own business address in the receipt footer is not a ride location
    expect(t, r).not.toMatch(street);
    expect(t, r).not.toMatch(/\b(VA|DC) \d{5}\b|Wilson Blvd/);
  }
  await nav(page, '/g/p5');
  await expect(page.locator('main')).toContainText('Pickup at front door, Maison Cheryl');
  await nav(page, '/g/p9');
  await expect(page.locator('.tl')).toContainText('Dropped off. Fare on your tab.');
  await nav(page, '/g/e8');
  await expect(page.locator('main')).toContainText('If you say no, it is not charged.');
  await expect(page.locator('body')).not.toContainText('settles the rest');
  await expect(page.locator('body')).not.toContainText('pays nothing extra');
});

test('over cap, guest declined: receipt says the approved maximum only; owner statement shows the quote adjustment credit with Sample data', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T02:30:00Z') });
  await open(page, '/g/p9');
  await store(page, "s.setFareScenario('over'); s.setOverCapAnswer('no')");
  await nav(page, '/g/p9');
  await expect(page.getByTestId('max-approved')).toHaveText("Ride home: $25.20. That's the most you approved, so the final fare can't add more.");
  await expect(page.getByTestId('ride-subtotal')).toHaveText('$25.20');
  const money = /\b(absorb\w*|cover(s|ed)?|pays|settles?|reimburs\w*|protection|guarantee\w*|insured)\b/i;
  await expect(page.locator('main')).not.toContainText(money);
  await nav(page, '/g/m1');
  await expect(page.getByTestId('max-approved')).toHaveText("Ride home: $25.20. That's the most you approved, so the final fare can't add more.");
  await expect(page.locator('main')).not.toContainText(money);
  await nav(page, '/g/e8t');
  await expect(page.locator('main')).toContainText('If you say no, it is not charged.');
  await expect(page.locator('main')).not.toContainText(money);
  await nav(page, '/o/statement');
  await expect(page.getByTestId('quote-credit-line')).toContainText(/^Quote adjustment credit, ride RN-NHMCXN, Oct 9: -\$3\.10 Sample data$/);
  await expect(page.getByTestId('quote-credit-footnote')).toHaveText("When a ride's final fare is above the guest's approved cap and the guest declines the difference, we credit the difference against our fees, up to $10 per ride. Credits apply to future invoices and aren't paid in cash.");
  for (const l of await page.getByTestId('fee-return-line').allInnerTexts()) expect(l).toMatch(/ride RN-[A-Z0-9]{6},/);
});

test('standard night unchanged: $64.19 + $24.60 = $88.79, no over-cap lines', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T03:30:00Z') });
  await open(page, '/g/p9');
  await expect(page.getByTestId('bar-subtotal')).toHaveText('$64.19');
  await expect(page.getByTestId('ride-subtotal')).toHaveText('$24.60');
  await expect(page.getByTestId('total')).toHaveText('$88.79');
  await expect(page.getByTestId('max-approved')).toHaveCount(0);
});

/* E7 add a stop: a new quote approved on the guest's own phone, before pickup or during the trip. */
async function rideAt(page: import('@playwright/test').Page, stage: 'en_route' | 'picked_up') {
  await page.clock.install({ time: new Date('2026-10-11T03:30:50Z') });
  await open(page, '/g/p3');
  await slide(page);
  await page.clock.runFor(10_000 + 9_000); if (stage !== 'en_route') await page.clock.fastForward(352_000);
  await nav(page, stage === 'en_route' ? '/g/p5' : '/g/p6');
}
const approveSlide = async (page: import('@playwright/test').Page) => slide(page, 'e7-approve');

for (const stage of ['en_route', 'picked_up'] as const) {
  const when = stage === 'en_route' ? 'before pickup' : 'during the trip';
  test(`add a stop ${when}, approve: new quote $24.00, cap $4.80, never more than $28.80; no declined amount or credit`, async ({ page }) => {
    await rideAt(page, stage);
    await page.getByTestId('add-stop').tap();
    await expect(page.locator('h1')).toHaveText('Add this stop?');
    await expect(page.getByTestId('e7-quote')).toHaveText('New quote: $24.00. Final fare may differ by up to $4.80. Never more than $28.80 unless you approve a change.');
    // the slider is the only amber control on the screen
    await expect(page.locator('main .btn--primary')).toHaveCount(0);
    await approveSlide(page);
    await expect(page.locator(`[data-screen=${stage === 'en_route' ? 'P5' : 'P6'}]`)).toBeVisible();
    const r = await page.evaluate(() => (window as any).__ridenite.store.getState().ride);
    expect(r).toMatchObject({ quoteCents: 2400, capCents: 480, originalQuoteCents: 2100, stopDeltaCents: 300 });
    await page.clock.fastForward(15 * 60_000);
    await nav(page, '/g/p9');
    // final fare $24.60 + $3.00 = $27.60, within the new $28.80 maximum: quote $24.00 + adjustment $3.60
    await expect(page.getByTestId('ride-subtotal')).toHaveText('$27.60');
    await expect(page.getByTestId('held-line')).toHaveCount(0);
    await expect(page.getByTestId('max-approved')).toHaveCount(0);
  });
  test(`add a stop ${when}, keep my original trip: original destination and cap, nothing added`, async ({ page }) => {
    await rideAt(page, stage);
    const before = await page.evaluate(() => (window as any).__ridenite.store.getState().ride);
    await page.getByTestId('add-stop').tap();
    await page.getByTestId('e7-keep').tap();
    await expect(page.locator(`[data-screen=${stage === 'en_route' ? 'P5' : 'P6'}]`)).toBeVisible();
    const after = await page.evaluate(() => (window as any).__ridenite.store.getState().ride);
    expect(after).toMatchObject({ quoteCents: 2100, capCents: 420, dest: before.dest });
    expect(after.stopDeltaCents).toBeUndefined();
    await page.clock.fastForward(15 * 60_000);
    await nav(page, '/g/p9');
    await expect(page.getByTestId('ride-subtotal')).toHaveText('$24.60');
    await expect(page.getByTestId('total')).toHaveText('$88.79');
  });
}

test('separate traffic-overage sample ride: own tab and total, $21.00 quote, receipt caps at $25.20; statement credits the declined $3.10 with the same RN- ride ID', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T03:30:00Z') });
  await open(page, '/g/demo');
  await page.getByTestId('sample-traffic').tap();
  await expect(page.getByTestId('sample-traffic-tab')).toContainText('tab #4479');
  await expect(page.getByTestId('sample-traffic-tab')).toContainText('Sample data');
  await expect(page.getByTestId('max-approved')).toHaveText("Ride home: $25.20. That's the most you approved, so the final fare can't add more.");
  await expect(page.getByTestId('ride-subtotal')).toHaveText('$25.20');
  await expect(page.getByTestId('bar-subtotal')).toHaveText('$26.20');
  await expect(page.getByTestId('total')).toHaveText('$51.40');
  await expect(page.locator('main')).toContainText('$21.00');
  const id = (await page.getByTestId('ride-id').innerText()).replace('Ride ID ', '').trim();
  expect(id).toMatch(/^RN-[A-Z0-9]{6}$/);
  await nav(page, '/o/statement');
  await expect(page.getByTestId('quote-credit-line')).toContainText(`Quote adjustment credit, ride ${id}, Oct 9: -$3.10`);
  await expect(page.getByTestId('quote-credit-line')).toContainText('Sample data');
  // the standard night is untouched
  await nav(page, '/g/p9');
  await expect(page.getByTestId('total')).toHaveText('$88.79');
});
