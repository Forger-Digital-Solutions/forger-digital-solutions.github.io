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

  test('passes serious WCAG 2.2 AA accessibility checks across homepage, Solutions, BattleVerse Arena, and Contact', async ({ page }) => {
    test.setTimeout(90_000);
    for (const route of ['/', '/solutions/', '/products/battleverse/arena/', '/contact/']) {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('iframe')
        .analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === 'critical' || violation.impact === 'serious'
      );
      expect(serious, `Serious accessibility issues on ${route}`).toEqual([]);
    }
  });

  test('interactive Alexandrite convergence, Hackmanite & Cinnabar workforces, BattleVerse Arena, and Commercial Inquiry Composer work cleanly', async ({ page }) => {
    test.setTimeout(90_000);

    // Alexandrite 7-stage explorer
    await page.goto('/models/alexandrite/');
    await page.locator('#alex-tab-05').click();
    await expect(page.locator('#alex-stage-panel [data-alex-field="step"]')).toHaveText('STAGE 05 / 07');

    // Hackmanite 10-role workforce explorer
    await page.goto('/models/hackmanite/');
    await page.locator('#hack-wf-tab-multiplayer-engineer').click();
    await expect(page.locator('#hack-wf-panel [data-wf-field="role"]')).toHaveText('Multiplayer Engineer');

    // Cinnabar 8-role creative workforce explorer
    await page.goto('/models/cinnabar/');
    await page.locator('#cin-wf-tab-continuity-specialist').click();
    await expect(page.locator('#cin-wf-panel [data-wf-field="role"]')).toHaveText('Continuity Specialist');

    // BattleVerse Arena illustrative scenario switcher
    await page.goto('/products/battleverse/arena/');
    await page.locator('#arena-tab-kestrel-vs-aegis').click();
    await expect(page.locator('#arena-panel-kestrel-vs-aegis')).toBeVisible();
    await expect(page.locator('#arena-panel-aegis-vs-vesper')).toBeHidden();

    // Commercial Inquiry Composer honors ?track=enterprise query parameter
    await page.goto('/contact/?track=enterprise');
    const entTrack = page.locator('[data-track-id="enterprise"]');
    await expect(entTrack).toHaveAttribute('aria-checked', 'true');
    const mailtoHref = await page.locator('[data-inquiry-mailto]').getAttribute('href');
    expect(mailtoHref).toContain('mailto:forgerdigisolsupport@gmail.com');
    expect(mailtoHref).toContain('Enterprise');
  });
});
