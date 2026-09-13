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
 *
 * R4.2H-R2: the previous settle() was defeated by the site's global
 * `scroll-behavior: smooth` — stepped programmatic scrolls lagged behind the
 * loop, lower sections never intersected the viewport, their scroll-reveal
 * (`.is-revealed`) never fired, and full-page captures certified large blank
 * regions. settle() now sweeps with instant behavior, waits until every
 * reveal target has actually revealed (and its 0.7s transition finished), and
 * each capture FAILS if any reveal target is still hidden, so an unrevealed
 * section can no longer be silently certified as a blank region.
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

// Keep in sync with the revealTargets query in src/layouts/BaseLayout.astro.
const REVEAL_SELECTOR = '.page-section, .page-head, .doc, .spage-hero, .hw-hero, .ci-hero, .lab-hero, .about-wrap';

async function settle(page: import('@playwright/test').Page) {
  // Scroll through the page once so lazy-loaded imagery (product visuals,
  // the ForgerEMS facade poster) is requested and every scroll-reveal
  // observer fires. `behavior: 'instant'` bypasses the site's global
  // `scroll-behavior: smooth`, which would otherwise lag behind this sweep.
  await page.evaluate(async (revealSelector) => {
    const total = () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const step = Math.max(window.innerHeight - 40, 200);
    for (let y = 0; y <= total(); y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 140));
    }
    // Every reveal target must have actually revealed before capture.
    const deadline = Date.now() + 10_000;
    let unrevealed: Element[] = [];
    while (Date.now() < deadline) {
      unrevealed = Array.from(document.querySelectorAll(revealSelector))
        .filter((el) => !el.classList.contains('is-revealed'));
      if (unrevealed.length === 0) break;
      await new Promise((r) => setTimeout(r, 120));
    }
    // Let the 0.7s reveal transition (opacity/transform) finish so the
    // full-page capture shows settled, fully opaque sections.
    await new Promise((r) => setTimeout(r, 900));
    window.scrollTo({ top: 0, behavior: 'instant' });
    await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {})));
  }, REVEAL_SELECTOR);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState('networkidle');
}

async function expectRevealed(page: import('@playwright/test').Page, label: string) {
  const unrevealed = await page.evaluate((revealSelector) =>
    Array.from(document.querySelectorAll(revealSelector))
      .filter((el) => !el.classList.contains('is-revealed'))
      .map((el) => (el.id ? `#${el.id}` : el.className || el.tagName)),
  REVEAL_SELECTOR);
  expect(
    unrevealed,
    `${label}: ${unrevealed.length} scroll-reveal section(s) never revealed and would be certified as blank regions: ${unrevealed.join(', ')}`,
  ).toEqual([]);
}

test.describe('Visual certification captures', () => {
  test.beforeAll(() => {
    mkdirSync(CAPTURES_DIR, { recursive: true });
  });

  for (const cert of CAPTURE_PAGES) {
    for (const width of CERTIFICATION_WIDTHS) {
      test(`capture ${cert.name} at ${width}px`, async ({ page }) => {
        // Pre-seed the support-dialog dismissal so the 60% scroll trigger in
        // settle() cannot open the modal over the page being certified; the
        // dialog's own behavior is covered by support-dialog.spec.ts.
        await page.addInitScript(() => {
          try { window.localStorage.setItem('fds_support_dismissed_at', String(Date.now())); } catch { /* ignore */ }
        });
        await page.setViewportSize({ width, height: Math.round(width * (844 / 390)) });
        await page.goto(cert.path, { waitUntil: 'networkidle' });
        await expect(page.locator('main')).toBeVisible();
        await settle(page);
        await expectRevealed(page, `${cert.path} @ ${width}px`);
        await page.screenshot({ path: resolve(CAPTURES_DIR, `${cert.name}-${width}.png`), fullPage: true, animations: 'disabled' });
      });
    }
  }

  for (const path of REDUCED_MOTION_PAGES) {
    test(`capture ${path} with reduced motion at 1440px`, async ({ page }) => {
      await page.addInitScript(() => {
        try { window.localStorage.setItem('fds_support_dismissed_at', String(Date.now())); } catch { /* ignore */ }
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('main')).toBeVisible();
      await settle(page);
      await expectRevealed(page, `${path} @ 1440px reduced motion`);
      const name = path === '/' ? 'homepage' : 'gems';
      await page.screenshot({ path: resolve(CAPTURES_DIR, `${name}-1440-reduced-motion.png`), fullPage: true, animations: 'disabled' });
    });
  }
});
