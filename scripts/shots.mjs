// Screenshots of key screens at 390x844 (WebKit, iPhone emulation). Usage: npm run shots [outdir]
import { webkit } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] || '../shots/m1';
mkdirSync(out, { recursive: true });
const size = { width: Number(process.env.W || 390), height: Number(process.env.H || 844) };
const server = spawn('npx', ['vite', 'preview', '--port', '4174', '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
const browser = await webkit.launch();
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const base = 'http://127.0.0.1:4174/';
const shot = async (name, hash, prep) => {
  // hash-only navigation: a page.goto to the same URL reloads, which starts a fresh demo
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(300);
  if (prep) await prep();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: !!process.env.FULL });
  console.log('shot', name);
};
await page.goto(base);
await page.evaluate(() => localStorage.clear());
await shot('home', '#/g/home');
await shot('P1', '#/g/p1');
await shot('P2', '#/g/p2');
await shot('P2t', '#/g/p2t', async () => { await page.fill('#addr', '655 harison'); });
await shot('P2t-location', '#/g/p2t', async () => { await page.fill('#addr', ''); await page.click('[data-testid=use-location]'); });
await shot('P3-confirm', '#/g/p3');
{ // hold and slide (M2 confirm): drag the thumb past 70%
  const t = await page.locator('[data-testid=confirm]').boundingBox();
  const b = await page.locator('[data-testid=confirm-thumb]').boundingBox();
  const inset = b.x - t.x, travel = t.width - b.width - inset * 2;
  const x0 = b.x + b.width / 2, y = b.y + b.height / 2;
  await page.mouse.move(x0, y); await page.mouse.down();
  await page.mouse.move(x0 + travel * 0.95, y, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(400);
}
await shot('P4-undo', '#/g/p4');
await page.evaluate(() => { const s = window.__ridenite.store; const r = s.getState().ride; s.getState().ride.bookedAt = Date.now() - 1; s.tick(); });
await shot('P4-requested', '#/g/p4');
await page.evaluate(() => window.__ridenite.store.advanceRide());
await shot('P5', '#/g/p5');
await page.evaluate(() => window.__ridenite.store.advanceRide());
await shot('P5w', '#/g/p5w');
await shot('home-active', '#/g/home');
await page.evaluate(() => window.__ridenite.store.applyFault('E1'));
await shot('E1', '#/g/e1');
await page.evaluate(() => window.__ridenite.store.resetDemoData());
await shot('P9', '#/g/p9');
await page.evaluate(() => window.__ridenite.store.applyFault('E7'));
await shot('E7', '#/g/e7');
await page.evaluate(() => window.__ridenite.store.resetDemoData());
await shot('menu', '#/g/home', async () => { await page.click('[data-testid=menu-btn]'); });
await page.reload();
await page.evaluate(() => window.__ridenite.store.unlinkTab());
await shot('home-unlinked', '#/g/home');
await page.evaluate(() => window.__ridenite.store.resetDemoData());
await shot('owner-summary', '#/o/summary');
await shot('owner-bar', '#/o/bar');
await browser.close();
server.kill();
