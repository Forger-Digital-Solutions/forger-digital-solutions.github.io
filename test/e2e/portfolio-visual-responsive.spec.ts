import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ecosystemNodes } from '../../src/data/ecosystem';

test.describe('Homepage portfolio visual system', () => {
  test('renders one distinct, linked orbital body for every current project', async ({ page }) => {
    await page.goto('/');
    const ecosystem = page.locator('.fds-ecosystem');
    await ecosystem.scrollIntoViewIfNeeded();
    await expect(ecosystem).toHaveAttribute('data-visual-candidate', 'codeforge-reactor');
    await expect(ecosystem.locator('[data-scaffold-plane]')).toHaveCount(3);
    await expect(ecosystem.locator('.planet-motion[data-planet]')).toHaveCount(ecosystemNodes.length);
    await expect(ecosystem.locator('.tag-motion[data-tag-for]')).toHaveCount(ecosystemNodes.length);
    await expect(ecosystem.locator('.orbit-layer path.orbit-path')).toHaveCount(ecosystemNodes.length);
    await expect(ecosystem.locator('.core__codeforge')).toHaveAttribute('href', /codeforge-icon\.svg/);

    const rendered = await ecosystem.locator('.planet-link[data-node-id]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.getAttribute('data-node-id'),
        href: node.getAttribute('href'),
        accessibleName: node.getAttribute('aria-label'),
      }))
    );
    expect(rendered.map((node) => node.id)).toEqual(ecosystemNodes.map((node) => node.id));
    for (const node of ecosystemNodes) {
      const body = rendered.find((entry) => entry.id === node.id);
      expect(body?.href, `${node.id} project destination`).toBe(node.href);
      expect(body?.accessibleName, `${node.id} accessible name`).toContain(node.name);
    }

    for (const width of [1920, 1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (width < 720) {
        await expect(ecosystem.locator('.fds-ecosystem__scene-wrap')).toBeHidden();
      } else {
        await expect(ecosystem.locator('.fds-ecosystem__scene-wrap')).toBeVisible();
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `homepage horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test('supports keyboard inspection and honors reduced-motion preference', async ({ page }) => {
    await page.goto('/');
    const ecosystem = page.locator('.fds-ecosystem');
    await ecosystem.scrollIntoViewIfNeeded();
    const firstProject = ecosystem.locator('.planet-link[data-node-id]').first();
    await firstProject.focus();
    await expect(firstProject).toBeFocused();
    await expect(ecosystem.locator('[data-panel-detail]')).toBeVisible();
    await expect(ecosystem.locator('[data-panel-name]')).not.toBeEmpty();
    await expect(ecosystem.locator('[data-panel-cta]')).toHaveAttribute('href', /^\/projects\//);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animationName = await ecosystem.locator('.planet-motion[data-planet]').first()
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(animationName).toBe('none');
  });

  test('keeps the homepage ecosystem diagrams free of serious accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .include('.fds-ecosystem')
      .include('.one-eco__diagram')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
    expect(serious, 'Serious accessibility issues in the homepage ecosystem diagrams').toEqual([]);
  });
});
