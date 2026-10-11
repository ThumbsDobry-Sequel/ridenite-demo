// M2 bartender screenshots (WebKit). Usage: W=390 H=844 node scripts/shots-m2.mjs [outdir] [suffix]
import { webkit } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || '../shots/m2';
const sfx = process.argv[3] || '';
mkdirSync(out, { recursive: true });
const size = { width: Number(process.env.W || 390), height: Number(process.env.H || 844) };
const port = 4175 + Math.floor(Math.random() * 100);
const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await webkit.launch();
const tablet = size.width >= 768;
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2, isMobile: !tablet, hasTouch: true });
const page = await ctx.newPage();
const st = (fn) => page.evaluate(fn);
const shot = async (name, hash, prep) => {
  if (hash) await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(300);
  if (prep) await prep();
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${out}/${name}${sfx}.png`, fullPage: !!process.env.FULL });
  console.log('shot', name + sfx);
};
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const want = (n) => !only.length || only.includes(n);
await page.goto(`http://127.0.0.1:${port}/#/b`);
await page.waitForTimeout(500);
if (want('B0')) await shot('B0', null);
await page.click('[data-testid=b0-tonight]');
if (want('B1')) await shot('B1', '#/b/tonight');
if (want('B2')) await shot('B2', '#/b/book', async () => { await page.click('[data-testid=b2-ask]'); });
// B3 with a quote (Dev K. answered on his phone)
await page.evaluate(() => { location.hash = '#/b/tonight'; });
await page.waitForTimeout(300);
await page.click('[data-testid=ask-4471]');
if (want('B3')) await shot('B3', null);
await page.click('[data-testid=b3-sim-reply]').catch(() => {});
if (want('B3-qr')) {
  await st(() => { const s = window.__ridenite.store; s.barStartDraft('4475', 'staff_offer'); });
  await shot('B3-qr', '#/b/sheet?tab=4475', async () => { await page.click('[data-testid=b3-mode-qr]'); });
  await shot('B3-staff', null, async () => { await page.click('[data-testid=b3-mode-staff]'); await page.click('[data-testid^=b3-dest-]'); });
  await st(() => window.__ridenite.store.barStartDraft('4471', 'guest_request'));
  await page.evaluate(() => { location.hash = '#/b/sheet?tab=4471'; });
}
await page.waitForTimeout(300);
await page.click('[data-testid=b3-book]');
if (want('Booked')) await shot('Booked', null);
if (want('B4')) await shot('B4', '#/b/live', async () => {
  await st(() => { const s = window.__ridenite.store; const r = s.barRides().find((x) => x.tab === '4474'); s.getState().bar.rides.find((x) => x.id === r.id).bookedAt = Date.now() - 31000; s.barWelcome(); });
});
if (want('B6')) await shot('B6', '#/b/tab?tab=4468', async () => {
  await st(() => { const s = window.__ridenite.store; s.barStartDraft('4468', 'guest_request'); s.barSimulateGuestReply('4468'); const r = s.barBook(); s.barFinishRide(r.ride.id); });
});
if (want('B9')) await shot('B9', '#/b/plate?tab=4474');
if (want('B10')) await shot('B10', '#/b/quiet');
if (want('B8')) await shot('B8', '#/b/settings');
if (want('B5')) await shot('B5', '#/b/history');
if (want('More')) await shot('More', '#/b/more');
await browser.close();
server.kill();
