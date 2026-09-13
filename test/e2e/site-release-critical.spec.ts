import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * R4.1 release-critical site coverage for the CI deployment gate.
 *
 * R4's e2e suite was heavily Kayla-focused; the surfaces here — site
 * navigation, the mobile menu aria contract, ecosystem keyboard inspection,
 * the Forged archive integrity flow (full SHA display, Copy SHA, Download
 * ZIP), and the GEMS mobile/desktop diagram switch — only had static unit
 * coverage, so browser-level regressions could deploy unchecked.
 */

test.describe('Site release-critical surfaces', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('A. primary navigation reaches every release-critical page', async ({ page }) => {
    const navTargets = [
      { label: 'Products', href: '/projects', marker: 'main' },
      { label: 'AI Research', href: '/projects/gems-training-grounds', marker: 'picture' },
      { label: 'Releases', href: '/forged', marker: '.product-card' },
      { label: 'Engineering', href: '/lab', marker: 'main' },
      { label: 'Company', href: '/about', marker: 'main' },
    ];

    for (const target of navTargets) {
      await page.goto('/');
      const link = page.locator('.nav-links a', { hasText: target.label }).first();
      await expect(link).toHaveAttribute('href', target.href);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${target.href}$`));
      await expect(page.locator(target.marker).first()).toBeVisible();
    }
  });

  test('B. mobile menu toggles with the correct aria-expanded state', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuButton = page.locator('.mobile-menu-btn');
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(menuButton).toHaveAttribute('aria-controls', 'site-navigation');

    const nav = page.locator('#site-navigation');
    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toHaveClass(/active/);
    await expect(nav).toBeVisible();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(nav).not.toHaveClass(/active/);
  });

  test('C. ecosystem nodes are visible and keyboard-inspectable', async ({ page }) => {
    await page.goto('/');

    const diagram = page.locator('.one-eco__diagram');
    await expect(diagram).toBeVisible();

    // Tier nodes (CodeForge foundation + GEMS intelligence) and the
    // specialized-domain rail render with their connection lines.
    expect(await page.locator('.eco-node').count()).toBeGreaterThanOrEqual(2);
    expect(await page.locator('.eco-domain').count()).toBeGreaterThanOrEqual(4);
    expect(await page.locator('.eco-line').count()).toBeGreaterThanOrEqual(2);

    // Each tier node is reachable by keyboard, and focus reveals its role text.
    const inspectable = page.locator('.eco-node[tabindex="0"]').first();
    await inspectable.focus();
    await expect(inspectable).toBeFocused();
    await expect(inspectable.locator('.eco-node__role')).toBeVisible();

    // Rail domains are keyboard-inspectable too.
    const domain = page.locator('.eco-domain[tabindex="0"]').first();
    await domain.focus();
    await expect(domain).toBeFocused();
    await expect(domain.locator('.eco-node__role')).toBeVisible();

    // Links inside the diagram keep working navigation.
    const codeforgeNode = page.locator('a.eco-node[href="/projects/codeforge"]');
    await expect(codeforgeNode).toBeVisible();
  });

  test('D. Forged archive flow: exact full SHA, Copy SHA, Download ZIP', async ({ page, request }) => {
    await page.goto('/forged');

    const shaCode = page.locator('.archive-card__sha').first();
    const sha = await shaCode.textContent();
    expect(sha).toMatch(/^[0-9a-f]{64}$/);
    expect(sha).toBe('a6e16d0056deebeeb8d8b99f7228f5fed43c380722e97012e45b26d5c6fe3208');

    // Copy SHA must put the exact full SHA on the clipboard — no truncation.
    const copyButton = page.locator('.archive-copy').first();
    await copyButton.click();
    await expect(copyButton).toHaveText(/Copied ✓/);
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(sha);

    // The published ZIP must resolve with archive bytes.
    const zip = await request.get('/downloads/codeforge/CodeForge-source-6b0770b.zip');
    expect(zip.status()).toBe(200);
    expect(zip.headers()['content-type']).toMatch(/zip/);
  });

  test('E. GEMS diagram switches between mobile and desktop compositions', async ({ page }) => {
    const picture = page.locator('picture', { has: page.locator('source[srcset*="gems-training-grounds-family-mobile"]') }).first();

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/projects/gems-training-grounds');
    await expect(picture).toBeVisible();
    await expect(picture.locator('source')).toHaveAttribute('media', '(max-width: 640px)');
    const desktopSrc = await picture.locator('img').getAttribute('src');
    expect(desktopSrc).toContain('gems-training-grounds-family.svg');

    await page.setViewportSize({ width: 390, height: 844 });
    const currentSrc = await picture.locator('img').evaluate((img) => (img as HTMLImageElement).currentSrc);
    expect(currentSrc).toContain('gems-training-grounds-family-mobile.svg');

    // The narrow composition must not introduce horizontal overflow.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('F. accessibility smoke on the GEMS project page', async ({ page }) => {
    await page.goto('/projects/gems-training-grounds');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('iframe')
      .analyze();

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations, 'Critical/Serious a11y issues on /projects/gems-training-grounds').toEqual([]);
  });
});
