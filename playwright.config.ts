import { defineConfig, devices } from '@playwright/test';

/**
 * Gallery screenshot baseline + axe a11y run against the built preview server.
 * The gallery pins `data-motion='reduce'` and disables the ambient loop so
 * screenshots are deterministic (M0 acceptance criteria).
 */
export default defineConfig({
  testDir: './e2e',
  snapshotDir: './e2e/__screenshots__',
  fullyParallel: true,
  // One preview server serves all specs; too many workers starve the screenshot/axe page.evaluate
  // calls (they time out under contention, not from a real hang). Cap to 2 for reliability.
  workers: 2,
  // The gallery renders every primitive in every state and settles fonts/images; 60s absorbs a
  // cold-build race without masking a real hang.
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    // Always a guaranteed mock-mode build in its own dist-e2e (see scripts/build-e2e.mjs).
    // reuseExistingServer:false so a stale Supabase-mode preview can never be reused — the
    // trap that made e2e hit real rate-limited auth during M7.
    command: 'npm run build:e2e && npm run preview:e2e',
    url: 'http://localhost:3005',
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
