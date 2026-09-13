import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * R4.1 visual certification evidence — CI only.
 *
 * Produces a representative, independently reviewable screenshot set for the
 * release audit: the release-critical pages at the certification widths, plus
 * reduced-motion variants for the pages whose surfaces animate. The full
 * automated responsive assertions live in fds-r2-visual-commerce.spec.ts (H)
 * and site-release-critical.spec.ts (E); this spec documents what the certified
 * release actually looked like. Output goes to shots-ci/ and is uploaded as a
 * short-retention CI artifact — never committed.
 */
test.skip(process.env.CI !== 'true', 'Visual certification captures run only in CI');

const CAPTURES_DIR = resolve('shots-ci');
const CERTIFICATION_WIDTHS = [390, 768, 1440, 1920];
const CAPTURE_PAGES = [
  { path: '/', name: 'homepage' },
  { path: '/forged', name: 'forged' },
  { path: '/projects/gems-training-grounds', name: 'gems' },
  { path: '/projects/codeforge', name: 'codeforge' },
  { path: '/projects/forgerems', name: 'forgerems' },
  { path: '/about', name: 'about' },
];
const REDUCED_MOTION_PAGES = ['/', '/projects/gems-training-grounds'];

async function settle(page: import('@playwright/test').Page) {
  // Scroll through the page once so lazy-loaded imagery (product visuals,
  // the ForgerEMS facade poster) is requested before the full-page capture.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
}

test.describe('Visual certification captures', () => {
  test.beforeAll(() => {
    mkdirSync(CAPTURES_DIR, { recursive: true });
  });

  for (const cert of CAPTURE_PAGES) {
    for (const width of CERTIFICATION_WIDTHS) {
      test(`capture ${cert.name} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: Math.round(width * (844 / 390)) });
        await page.goto(cert.path, { waitUntil: 'networkidle' });
        await expect(page.locator('main')).toBeVisible();
        await settle(page);
        await page.screenshot({ path: resolve(CAPTURES_DIR, `${cert.name}-${width}.png`), fullPage: true });
      });
    }
  }

  for (const path of REDUCED_MOTION_PAGES) {
    test(`capture ${path} with reduced motion at 1440px`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('main')).toBeVisible();
      await settle(page);
      const name = path === '/' ? 'homepage' : 'gems';
      await page.screenshot({ path: resolve(CAPTURES_DIR, `${name}-1440-reduced-motion.png`), fullPage: true });
    });
  }
});
