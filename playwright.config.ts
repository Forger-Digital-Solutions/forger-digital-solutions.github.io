import { defineConfig, devices } from '@playwright/test';

/**
 * Browser regression suite for the Kayla widget.
 *
 * Phase 6 found two defects that no unit test could have caught — a focus trap
 * that let Tab escape an open dialog, and Astro-scoped CSS that never applied
 * to any runtime-created element — because both only exist once a real browser
 * has laid the page out. Those are exactly what this suite guards.
 *
 * Deliberately minimal: one browser, the dev server the repo already has, and
 * the API intercepted rather than a live backend, so no test touches
 * production or spends the shared model allowance.
 */
export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'off',
    screenshot: 'off'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    // Playwright spawns this without a shell and the child does not inherit a
    // usable PATH on Windows, so neither `npm` nor a bare `node` resolves.
    // process.execPath is the absolute binary already running this config.
    command: `"${process.execPath}" ./node_modules/astro/bin/astro.mjs dev --port 4321`,
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
