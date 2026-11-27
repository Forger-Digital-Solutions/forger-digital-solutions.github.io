import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase III-C Studio Intelligence Hub & FDS visual system', () => {
  test('leads homepage with Studio Intelligence Hub while preserving the FDS ecosystem strip and heritage slogan', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#hero-heading')).toContainText("Your Game Studio's Knowledge.");
    await expect(page.locator('#hero-heading')).toContainText('Connected.');
    await expect(page.locator('.hero__heritage')).toContainText('Build the tools. Build the worlds.');
    await expect(page.locator('[data-pilot-booking-cta]').first()).toBeVisible();

    const main = page.locator('main');
    for (const term of [
      'Studio Intelligence Hub',
      'Roblox Studio',
      'Unreal Engine',
      'Founding Studio',
      'Also from FDS',
      'Hackmanite',
      'BattleVerse',
      'Jaspilite',
      'Project Forge',
      'Alexandrite',
      'Cinnabar',
      'Newsroom',
    ]) {
      await expect(main).toContainText(term);
    }
    // Verify internal pilot prices never appear on the rendered homepage
    const bodyText = await main.innerText();
    expect(bodyText).not.toMatch(/\$(?:1,500|750|2,500|1,250|3,500|1,750)\b/);

    // Verify moved model provenance and State Lines concept art disclosures on their dedicated pages
    await page.goto('/models/hackmanite/');
    await expect(page.locator('main')).toContainText('Qwen/Qwen3.8-27B');
    await expect(page.locator('main')).toContainText('openai/gpt-oss-120b');

    await page.goto('/studio/state-lines/');
    await expect(page.locator('main')).toContainText('State Lines');
    await expect(page.locator('main')).toContainText(/Concept Art/i);
  });

  test('Studio Intelligence Hub investigation explorer switches between Roblox Luau and Unreal C++ questions cleanly', async ({ page }) => {
    await page.goto('/solutions/studio-intelligence-hub/');
    await expect(page.locator('main h1')).toContainText("Your Game Studio's Knowledge. Connected.");
    await expect(page.locator('main')).toContainText('Blueprint');
    await expect(page.locator('main')).toContainText('50% off');

    const trace = page.locator('[data-hub-trace]').first();
    await expect(trace).toBeVisible();

    const firstTab = trace.locator('#hub-page-q-tab-combat-damage');
    const secondTab = trace.locator('#hub-page-q-tab-vehicle-dependencies');
    await expect(firstTab).toHaveAttribute('aria-selected', 'true');
    await expect(trace.locator('#hub-page-q-panel-combat-damage')).toBeVisible();

    await secondTab.click();
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');
    await expect(trace.locator('#hub-page-q-panel-vehicle-dependencies')).toBeVisible();
    await expect(trace.locator('#hub-page-q-panel-combat-damage')).toBeHidden();
  });

  test('Jaspilite workbench switches cleanly between Auto, Meld, and Solo modes', async ({ page }) => {
    await page.addInitScript(() => {
      try { window.localStorage.setItem('fds_support_dismissed_at', String(Date.now())); } catch { /* ignore */ }
    });
    await page.goto('/products/');
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

  test('maintains zero horizontal overflow across mobile, tablet, laptop, and desktop viewports on homepage and Hub landing page', async ({ page }) => {
    test.setTimeout(90_000);
    for (const route of ['/', '/solutions/studio-intelligence-hub/']) {
      await page.goto(route);
      for (const width of [360, 390, 768, 1024, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, `${route} horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
      }
    }
  });

  test('passes serious WCAG 2.2 AA accessibility checks across homepage, Studio Intelligence Hub, Solutions, BattleVerse Arena, and Contact', async ({ page }) => {
    test.setTimeout(90_000);
    for (const route of ['/', '/solutions/studio-intelligence-hub/', '/solutions/', '/products/battleverse/arena/', '/contact/']) {
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

    // Commercial Inquiry Composer honors ?track=founding-studio query parameter
    await page.goto('/contact/?track=founding-studio');
    const hubTrack = page.locator('[data-track-id="studio-intelligence-hub"]');
    await expect(hubTrack).toHaveAttribute('aria-checked', 'true');
    const foundingMailto = await page.locator('[data-inquiry-mailto]').getAttribute('href');
    expect(foundingMailto).toContain('mailto:forgerdigisolsupport@gmail.com');
    expect(foundingMailto).toContain('Founding');

    // Commercial Inquiry Composer honors ?track=enterprise query parameter
    await page.goto('/contact/?track=enterprise');
    const entTrack = page.locator('[data-track-id="enterprise"]');
    await expect(entTrack).toHaveAttribute('aria-checked', 'true');
    const mailtoHref = await page.locator('[data-inquiry-mailto]').getAttribute('href');
    expect(mailtoHref).toContain('mailto:forgerdigisolsupport@gmail.com');
    expect(mailtoHref).toContain('Enterprise');
  });
});
