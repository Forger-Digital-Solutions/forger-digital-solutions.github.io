import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Operation Digital Forge visual & interactive system', () => {
  test('presents the 7-flagship AI ecosystem, honest model boundaries, and heritage slogan', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hero-heading')).toContainText('Specialized intelligence.');
    await expect(page.locator('#hero-heading')).toContainText('Extraordinary worlds.');
    await expect(page.locator('.hero__heritage')).toContainText('Build the tools. Build the worlds.');

    const main = page.locator('main');
    for (const flagship of ['Alexandrite', 'Hackmanite', 'Cinnabar', 'Jaspilite', 'BattleVerse', 'Project Forge', 'State Lines']) {
      await expect(main).toContainText(flagship);
    }
    await expect(main).toContainText('Qwen/Qwen3.8-27B');
    await expect(main).toContainText('openai/gpt-oss-120b');
    await expect(main).toContainText('Concept Art — Work in Progress (Not Gameplay');
  });

  test('Jaspilite workbench switches cleanly between Auto, Meld, and Solo modes', async ({ page }) => {
    await page.goto('/');
    const bench = page.locator('[data-jasp-bench]').first();
    await expect(bench).toBeVisible();

    const autoTab = bench.locator('#jasp-tab-auto');
    const meldTab = bench.locator('#jasp-tab-meld');
    const soloTab = bench.locator('#jasp-tab-solo');

    await expect(autoTab).toHaveAttribute('aria-selected', 'true');
    await expect(bench.locator('#jasp-panel-auto')).toBeVisible();

    await meldTab.click();
    await expect(meldTab).toHaveAttribute('aria-selected', 'true');
    await expect(bench.locator('#jasp-panel-meld')).toBeVisible();
    await expect(bench.locator('#jasp-panel-auto')).toBeHidden();

    await soloTab.click();
    await expect(soloTab).toHaveAttribute('aria-selected', 'true');
    await expect(bench.locator('#jasp-panel-solo')).toBeVisible();
    await expect(bench.locator('#jasp-panel-meld')).toBeHidden();
  });

  test('documentation hub filters guides in real time without page reload', async ({ page }) => {
    await page.goto('/docs/');
    const input = page.locator('#docs-filter-input');
    const count = page.locator('#docs-filter-count');
    await expect(input).toBeVisible();

    await input.fill('BattleVerse');
    await expect(count).toContainText('Showing 1 of');
    await expect(page.locator('#battleverse')).toBeVisible();

    await input.fill('zzzz-no-match');
    await expect(page.locator('#docs-empty-state')).toBeVisible();

    await input.fill('');
    await expect(page.locator('#docs-empty-state')).toBeHidden();
  });

  test('maintains zero horizontal overflow across mobile, tablet, laptop, and desktop viewports', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/');

    for (const width of [360, 390, 768, 1024, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `homepage horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
    }
  });

  test('passes serious WCAG 2.2 AA accessibility checks across the homepage', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('iframe')
      .analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious'
    );
    expect(serious, 'Serious accessibility issues on homepage').toEqual([]);
  });
});
