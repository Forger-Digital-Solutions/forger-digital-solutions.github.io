import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Homepage visual recovery: CodeForge atom and GEMS intelligence cores', () => {
  test('keeps eight unique product trajectories ghosted under at most four prominent rails', async ({ page }) => {
    await page.goto('/');
    const ecosystem = page.locator('.fds-ecosystem');
    await ecosystem.scrollIntoViewIfNeeded();
    await expect(ecosystem).toHaveAttribute('data-visual-candidate', 'codeforge-reactor');
    await expect(ecosystem.locator('[data-scaffold-plane]')).toHaveCount(3);
    await expect(ecosystem.locator('.planet-motion[data-planet]')).toHaveCount(8);
    await expect(ecosystem.locator('.tag-motion[data-tag-for]')).toHaveCount(8);
    await expect(ecosystem.locator('.orbit-layer path.orbit-path')).toHaveCount(8);
    await expect(ecosystem.locator('.core__codeforge')).toHaveAttribute('href', /codeforge-icon\.svg/);

    for (const width of [1920, 1599, 1440, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (width < 720) {
        await expect(ecosystem.locator('.fds-ecosystem__scene-wrap')).toBeHidden();
      } else {
        const traceOpacity = await ecosystem.locator('.orbit-layer .orbit-path').first().evaluate((el) => getComputedStyle(el).opacity);
        expect(Number(traceOpacity), `default product trace opacity at ${width}px`).toBeLessThanOrEqual(0.1);
      }
    }

    const productPathCount = await page.evaluate(() => {
      const paths = [...document.querySelectorAll<SVGElement>('.planet-motion[data-planet]')]
        .map((node) => {
          const id = node.getAttribute('data-planet');
          const motion = /--orbit-path:path\("([^"]+)"\)/.exec(node.getAttribute('style') || '')?.[1];
          const visible = document.getElementById(`orbit-${id}`)?.getAttribute('d');
          const tag = document.querySelector(`.tag-motion[data-tag-for="${id}"]`);
          const tagMotion = /--orbit-path:path\("([^"]+)"\)/.exec(tag?.getAttribute('style') || '')?.[1];
          return { id, motion, visible, tagMotion };
        });
      return { count: new Set(paths.map((entry) => entry.motion)).size, matches: paths.every((entry) => entry.motion === entry.visible && entry.motion === entry.tagMotion) };
    });
    expect(productPathCount.count).toBe(8);
    expect(productPathCount.matches).toBe(true);

    const defaultRailCount = await page.evaluate(() =>
      [...document.querySelectorAll<SVGElement>('.electron-scaffold__plane, .orbit-layer .orbit-path')]
        .filter((path) => Number(getComputedStyle(path).opacity) > 0.2).length);
    expect(defaultRailCount, 'default frame has more than four prominent full rails').toBeLessThanOrEqual(4);
    await expect(ecosystem.locator('[data-panel-default]')).toBeVisible();
    await expect(ecosystem.locator('.orbit-highlight')).toHaveCount(0);

    await page.setViewportSize({ width: 1440, height: 900 });
    const codeforge = ecosystem.locator('.planet-link[data-node-id="codeforge"]');
    // The body moves continuously along its path, so use keyboard focus to
    // trigger the same exact-path reveal without relying on a moving hover target.
    await codeforge.focus();
    await expect(ecosystem.locator('[data-orbit-for="codeforge"] .orbit-path')).toHaveCSS('opacity', '0.58');
    const activeRailCount = await page.evaluate(() =>
      [...document.querySelectorAll<SVGElement>('.electron-scaffold__plane, .orbit-layer .orbit-path')]
        .filter((path) => Number(getComputedStyle(path).opacity) > 0.2).length);
    expect(activeRailCount, 'one selected product path plus the three scaffold planes').toBeLessThanOrEqual(4);
    await page.keyboard.press('Escape');
    await expect(ecosystem.locator('[data-orbit-for="codeforge"] .orbit-path')).toHaveCSS('opacity', '0');
    await expect(ecosystem.locator('[data-panel-default]')).toBeVisible();
  });

  test('renders four canonical lineages and all seven readable training stages', async ({ page }) => {
    await page.goto('/');
    const system = page.locator('.gems-system');
    await system.scrollIntoViewIfNeeded();
    await expect(system).toHaveAttribute('data-visual-candidate', 'reactor-pipeline');
    await expect(system.locator('.gems-node')).toHaveCount(4);
    await expect(system.locator('.gems-node__gemstone[data-gem-core]')).toHaveCount(4);
    await expect(system.locator('.gems-node__port')).toHaveCount(4);
    await expect(system.locator('.gems-art__port')).toHaveCount(4);
    await expect(system.locator('.gems-conduits [data-conduit-for]')).toHaveCount(4);
    await expect(system.locator('.gems-conduits [data-conduit-ticks-for]')).toHaveCount(4);
    await expect(system.locator('.gems-node.card, .gems-node .card')).toHaveCount(0);
    for (const gem of ['topaz', 'sapphire', 'peridot', 'garnet']) {
      const node = system.locator(`.gems-node[data-gem="${gem}"]`);
      await expect(node).toHaveAttribute('data-research-state', 'RESEARCH');
      await expect(node.locator(`[data-gem-core="${gem}"]`)).toHaveCount(1);
      await expect(node.locator(`[data-gem-port="${gem}"]`)).toHaveCount(1);
      await expect(system.locator(`.gems-conduits [data-conduit-for="${gem}"]`)).toHaveCount(1);
      await expect(system.locator(`.gems-conduits [data-conduit-endpoint="${gem}"]`)).toHaveCount(1);
    }
    const conduitAlignment = await system.evaluate((root) => {
      const stage = root.querySelector('.gems-stage')!.getBoundingClientRect();
      return ['topaz', 'sapphire', 'peridot', 'garnet'].map((gem) => {
        const port = root.querySelector<HTMLElement>(`[data-gem-port="${gem}"]`)!.getBoundingClientRect();
        const point = root.querySelector<SVGPathElement>(`[data-conduit-for="${gem}"]`)!.getPointAtLength(0);
        const x = ((port.left + port.width / 2 - stage.left) / stage.width) * 1000;
        const y = ((port.top + port.height / 2 - stage.top) / stage.height) * 1000;
        return Math.hypot(point.x - x, point.y - y);
      });
    });
    expect(conduitAlignment.every((distance) => distance < 8), 'each conduit must begin at its gem port').toBe(true);
    await expect(system.locator('.gems-cycle li')).toHaveText([
      /Curriculum/, /Teach/, /Test/, /Diagnose/, /Refine/, /Verify/, /Advance/
    ]);
    await expect(system.locator('.gems-core__name')).toHaveText('Training Grounds');
    await expect(system.locator('.gems-core__gate')).toHaveText('Evidence-gated advancement');
    await expect(system.getByLabel('GEMS research lineages')).toBeVisible();
    const movingSignals = await system.evaluate((el) => [...document.getAnimations()]
      .filter((animation) => animation.playState === 'running' && animation.effect?.target instanceof Element &&
        el.contains(animation.effect.target) && animation.effect.target.closest('.gems-art'))
      .length);
    expect(movingSignals, 'one sequential stage sweep should drive the visible GEMS cycle').toBe(1);

    const topaz = system.locator('.gems-node[data-gem="topaz"]');
    await topaz.scrollIntoViewIfNeeded();
    await topaz.hover();
    await expect(system.locator('.gems-conduits .gems-art__connector--topaz')).toHaveCSS('stroke', 'rgb(242, 189, 85)');
    await topaz.focus();
    await expect(topaz).toBeFocused();
    await expect(topaz).toHaveCSS('outline-style', 'solid');
    for (const [gem, color] of [
      ['topaz', 'rgb(242, 189, 85)'],
      ['sapphire', 'rgb(129, 173, 255)'],
      ['peridot', 'rgb(119, 216, 173)'],
      ['garnet', 'rgb(211, 156, 255)'],
    ]) {
      const node = system.locator(`.gems-node[data-gem="${gem}"]`);
      await node.focus();
      await expect(node).toHaveCSS('outline-style', 'solid');
      await expect(system.locator(`.gems-conduits .gems-art__connector--${gem}`)).toHaveCSS('stroke', color);
    }
  });

  test('keeps desktop stage labels clear of lineage cards at 1920, 1440, 1024, and 768 widths', async ({ page }) => {
    await page.goto('/');
    const system = page.locator('.gems-system');
    await system.scrollIntoViewIfNeeded();

    for (const width of [1920, 1440, 1024, 768]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.evaluate(() => {
        const stage = document.querySelector('.gems-stage')!.getBoundingClientRect();
      const cores = [...document.querySelectorAll('.gems-node')].map((el) => el.getBoundingClientRect());
        const labels = [...document.querySelectorAll('.gems-cycle li')].map((el) => el.getBoundingClientRect());
        const overlaps: string[] = [];
        for (let i = 0; i < labels.length; i++) {
          for (let j = 0; j < cores.length; j++) {
            const a = labels[i], b = cores[j];
            if (a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1) {
              overlaps.push(`${i + 1}:${j + 1}`);
            }
          }
        }
        return {
          stage: { width: stage.width, height: stage.height },
          outOfBounds: labels.some((label) => label.left < stage.left || label.right > stage.right || label.top < stage.top || label.bottom > stage.bottom),
          overlaps
        };
      });
      expect(layout.stage.width, `GEMS stage at ${width}px`).toBeGreaterThan(400);
      expect(layout.outOfBounds, `GEMS labels outside stage at ${width}px`).toBe(false);
      expect(layout.overlaps, `GEMS stages obscured by lineage cards at ${width}px`).toEqual([]);
    }
  });

  test('restructures GEMS for mobile and prevents horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const system = page.locator('.gems-system');
    await system.scrollIntoViewIfNeeded();
    await expect(system.locator('.gems-art')).toBeHidden();
    await expect(system.locator('.gems-mobile-conduits')).toBeVisible();
    const coreWidth = await system.locator('.gems-core').evaluate((el) => el.getBoundingClientRect().width);
    expect(coreWidth).toBeGreaterThan(120);
    await expect(system.locator('.gems-node')).toHaveCount(4);
    await expect(system.locator('.gems-node__gemstone[data-gem-core]')).toHaveCount(4);
    await expect(system.locator('.gems-cycle li')).toHaveCount(7);
    await expect(system.locator('.gems-mobile-conduits [data-conduit-for]')).toHaveCount(4);
    const mobileOrder = await page.evaluate(() => {
      const core = document.querySelector('.gems-core')!.getBoundingClientRect();
      const gem = document.querySelector('.gems-node')!.getBoundingClientRect();
      const layers = ['.gems-ambient', '.gems-mobile-conduits', '.gems-core-wrap', '.gems-node', '.gems-cycle']
        .map((selector) => Number(getComputedStyle(document.querySelector(selector)!).zIndex));
      return { coreBottom: core.bottom, firstGemTop: gem.top, layers };
    });
    expect(mobileOrder.coreBottom).toBeLessThanOrEqual(mobileOrder.firstGemTop);
    expect(mobileOrder.layers).toEqual([1, 2, 3, 4, 5]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('pauses GEMS when it leaves view and removes motion when requested', async ({ page }) => {
    await page.goto('/');
    const system = page.locator('.gems-system');
    await system.scrollIntoViewIfNeeded();
    await expect(system).not.toHaveAttribute('data-gems-paused');
    const sweep = system.locator('.gems-art__sweep');
    await expect(sweep).toBeVisible();
    await expect(sweep).toHaveCSS('animation-name', 'gemsStageSweep');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(system).toHaveAttribute('data-gems-paused', '', { timeout: 3000 });
    const paused = await sweep.evaluate((el) => getComputedStyle(el).animationPlayState);
    expect(paused).toBe('paused');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await page.evaluate(() => ({
      ring: getComputedStyle(document.querySelector('.gems-art__sweep')!).animationName,
      stages: getComputedStyle(document.querySelector('.gems-cycle li')!).animationName,
    }));
    expect(reduced).toEqual({ ring: 'none', stages: 'none' });
  });

  test('keeps the redesigned homepage diagrams free of serious accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .include('.fds-ecosystem')
      .include('.gems-system')
      .include('.one-eco__diagram')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
    expect(serious, 'Serious accessibility issues in the evolved diagrams').toEqual([]);
  });
});
