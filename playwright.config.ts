import { defineConfig } from '@playwright/test';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const phone = (width: number, height: number) => ({
  browserName: 'webkit' as const,
  viewport: { width, height },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: UA,
});

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45_000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'off', serviceWorkers: 'block' },
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [
    { name: 'iphone-390x844', use: phone(390, 844) },
    { name: 'iphone-se-375x667', use: phone(375, 667) },
    { name: 'iphone-430x932', use: phone(430, 932), grep: /@sizes/ },
  ],
});
