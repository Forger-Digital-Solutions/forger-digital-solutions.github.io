import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { projects } from '../../src/data/projects';

/**
 * Release-critical site coverage for the CI deployment gate (Operation Digital Forge).
 *
 * Certifies the six institutional primary navigation pillars, mobile menu aria
 * contract, interactive EcosystemGraph keyboard inspection, Forged archive
 * integrity flow (exact full SHA display, Copy SHA, Download ZIP), all 7
 * flagship ecosystem pages, every preserved legacy project detail route, and
 * WCAG 2.2 AA accessibility smoke checks.
 */

test.describe('Site release-critical surfaces', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('A. primary navigation reaches every institutional pillar', async ({ page }) => {
    test.setTimeout(90_000);
    const navTargets = [
      { label: 'Models', href: '/models/', marker: 'main h1' },
      { label: 'Products', href: '/products/', marker: 'main h1' },
      { label: 'Solutions', href: '/solutions/', marker: 'main h1' },
      { label: 'Research', href: '/research/', marker: 'main h1' },
      { label: 'Developers', href: '/developers/', marker: 'main h1' },
      { label: 'Studio', href: '/studio/', marker: 'main h1' },
      { label: 'Company', href: '/company/', marker: 'main h1' },
    ];

    for (const target of navTargets) {
      await page.goto('/');
      const link = page.locator('.nav-group__link', { hasText: target.label }).first();
      await expect(link).toHaveAttribute('href', target.href);
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${target.href.replace(/\/$/, '')}/?$`));
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

  test('C. interactive ecosystem graph nodes are keyboard-inspectable and update live inspector', async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem('fds_support_dismissed_at', String(Date.now())); } catch { /* ignore */ }
    });
    await page.goto('/company/');

    const graph = page.locator('.eco-arch');
    await expect(graph).toBeVisible();
    const nodes = graph.locator('.eco-node');
    await expect(nodes).toHaveCount(7);

    const hackNode = graph.locator('.eco-node[data-eco-id="hackmanite"]');
    await hackNode.focus();
    await expect(hackNode).toBeFocused();
    await hackNode.click();
    await expect(hackNode).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#eco-inspector [data-field="name"]')).toHaveText('Hackmanite');
    await expect(page.locator('#eco-inspector [data-field="cta"]')).toHaveAttribute('href', '/models/hackmanite/');

    const stateLinesNode = graph.locator('.eco-node[data-eco-id="state-lines"]');
    await stateLinesNode.click();
    await expect(page.locator('#eco-inspector [data-field="name"]')).toHaveText('State Lines');
    await expect(page.locator('#eco-inspector [data-field="cta"]')).toHaveAttribute('href', '/studio/state-lines/');
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

  test('E. every flagship ecosystem page and preserved legacy project route renders', async ({ page }) => {
    test.setTimeout(90_000);
    const flagshipRoutes = [
      { path: '/models/alexandrite/', text: 'Alexandrite' },
      { path: '/models/hackmanite/', text: 'Hackmanite' },
      { path: '/models/cinnabar/', text: 'Cinnabar' },
      { path: '/products/jaspilite/', text: 'Jaspilite' },
      { path: '/products/battleverse/', text: 'BattleVerse' },
      { path: '/products/battleverse/arena/', text: 'BattleVerse Arena' },
      { path: '/products/battleverse/creator-studio/', text: 'Creator Studio' },
      { path: '/solutions/', text: 'Personalized AI workforces' },
      { path: '/solutions/studio-intelligence-hub/', text: 'Studio Intelligence Hub' },
      { path: '/solutions/gaming-studios/', text: 'Gaming Studios' },
      { path: '/solutions/enterprise-private-ai/', text: 'Enterprise' },
      { path: '/research/project-forge/', text: 'Project Forge' },
      { path: '/studio/state-lines/', text: 'State Lines' },
      { path: '/evaluations/', text: 'Evaluations' },
      { path: '/trust/', text: 'Trust' },
      { path: '/docs/', text: 'Documentation' },
      { path: '/downloads/', text: 'Downloads' },
    ];

    for (const item of flagshipRoutes) {
      await page.goto(item.path);
      await expect(page.locator('main h1').first(), `${item.path} heading`).toBeVisible();
      await expect(page.locator('main')).toContainText(item.text);
    }

    for (const project of projects) {
      await page.goto(`/projects/${project.slug}`);
      await expect(page.locator('main h1').first(), `${project.name} page heading`).toBeVisible();
      await expect(page.locator('main')).toContainText(project.name);
    }
  });

  test('F. accessibility smoke on flagship and portfolio pages', async ({ page }) => {
    test.setTimeout(90_000);
    for (const path of ['/solutions/studio-intelligence-hub/', '/models/', '/projects', '/docs/']) {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('iframe')
        .analyze();

      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );
      expect(criticalViolations, `Critical/Serious a11y issues on ${path}`).toEqual([]);
    }
  });
});
