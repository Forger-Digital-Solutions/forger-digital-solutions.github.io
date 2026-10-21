import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { projects } from '../../src/data/projects';

/**
 * R4.1 release-critical site coverage for the CI deployment gate.
 *
 * R4's e2e suite was heavily Kayla-focused; the surfaces here — site
 * navigation, the mobile menu aria contract, ecosystem keyboard inspection,
 * the Forged archive integrity flow (full SHA display, Copy SHA, Download
 * ZIP), and every current project detail route — receive browser coverage.
 */

test.describe('Site release-critical surfaces', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('A. primary navigation reaches every release-critical page', async ({ page }) => {
    const navTargets = [
      { label: 'Products', href: '/projects', marker: 'main' },
      { label: 'CodeForge', href: '/projects/codeforge', marker: 'main' },
      { label: 'Forge Control', href: '/projects/forge-control', marker: 'main' },
      { label: 'Dead Trails West', href: '/projects/dead-trails-west', marker: 'main' },
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

  test('C. portfolio map links and product relationships are keyboard-inspectable', async ({ page }) => {
    await page.goto('/');

    const map = page.locator('.portfolio-map');
    await expect(map).toBeVisible();
    const links = map.locator('a[href^="/projects/"]');
    await expect(links).toHaveCount(projects.length + 1);
    const inspectable = map.locator('a[href="/projects/codeforge"]').first();
    await inspectable.focus();
    await expect(inspectable).toBeFocused();
    await expect(map.locator('a[href="/projects/codeforge#forge-aaa"]')).toContainText('CodeForge architecture');
    await expect(map.locator('a[href="/projects/forge-control"]')).toContainText('Forge Control');
    await expect(map.locator('a[href="/projects/dead-trails-west"]')).toContainText('Dead Trails West');
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

  test('E. every current portfolio project detail page renders', async ({ page }) => {
    for (const project of projects) {
      await page.goto(`/projects/${project.slug}`);
      await expect(page.locator('main h1').first(), `${project.name} page heading`).toBeVisible();
      await expect(page.locator('main')).toContainText(project.name);
    }
  });

  test('F. accessibility smoke on the current portfolio page', async ({ page }) => {
    await page.goto('/projects');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('iframe')
      .analyze();

    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations, 'Critical/Serious a11y issues on /projects').toEqual([]);
  });
});
