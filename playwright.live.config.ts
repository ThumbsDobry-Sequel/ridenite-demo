import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** Live check (round 3): the round 3 spec against the deployed demo at 390x844. */
export default defineConfig({
  ...base,
  webServer: undefined,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: '../qa/live-verify-oct11-r3/results.json' }]],
  use: { ...base.use, baseURL: process.env.LIVE_URL || 'https://ridenite-demo-8ymee.ondigitalocean.app' },
  projects: [base.projects![0]],
  testMatch: /round3-oct11\.spec\.ts/,
});
