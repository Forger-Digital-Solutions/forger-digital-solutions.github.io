import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Homepage visual lock: true atomic rails and GEMS reactor', () => {
  test('shows eight true product rails around the CodeForge core', async ({ page }) => {
    await page.goto('/');
    const ecosystem = page.locator('.fds-ecosystem');
    await ecosystem.scrollIntoViewIfNeeded();
    await expect(ecosystem).toHaveAttribute('data-visual-candidate', 'codeforge-reactor');
    await expect(ecosystem.locator('[data-scaffold-plane]')).toHaveCount(0);
    await expect(ecosystem.locator('.planet-motion[data-planet]')).toHaveCount(8);
    await expect(ecosystem.locator('.tag-motion[data-tag-for]')).toHaveCount(8);
    await expect(ecosystem.locator('.orbit-layer path.orbit-path')).toHaveCount(8);
    await expect(ecosystem.locator('.core__codeforge')).toHaveAttribute('href', /codeforge-icon\.svg/);

    for (const width of [1920, 1599, 1440, 1280, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      if (width < 720) {
        await expect(ecosystem.locator('.fds-ecosystem__scene-wrap')).toBeHidden();
      } else {
        const pathOpacity = await ecosystem.locator('.orbit-layer .orbit-path').first().evaluate((el) => getComputedStyle(el).opacity);
        expect(Number(pathOpacity), `product rail visibility at ${width}px`).toBeGreaterThan(0.2);
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
  });

  test('renders four canonical lineages and all seven readable training stages', async ({ page }) => {
    await page.goto('/');
    const system = page.locator('.gems-system');
    await system.scrollIntoViewIfNeeded();
    await expect(system).toHaveAttribute('data-visual-candidate', 'reactor-pipeline');
    await expect(system.locator('.gems-node')).toHaveCount(4);
    await expect(system.locator('.gems-node__core')).toHaveCount(4);
    await expect(system.locator('.gems-node__port')).toHaveCount(4);
    await expect(system.locator('.gems-art__port')).toHaveCount(4);
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
    await expect(system.locator('.gems-art__connector--topaz')).toHaveCSS('stroke', 'rgb(242, 189, 85)');
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
      await expect(system.locator(`.gems-art__connector--${gem}`)).toHaveCSS('stroke', color);
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
        const cards = [...document.querySelectorAll('.gems-node')].map((el) => el.getBoundingClientRect());
        const labels = [...document.querySelectorAll('.gems-cycle li')].map((el) => el.getBoundingClientRect());
        const overlaps: string[] = [];
        for (let i = 0; i < labels.length; i++) {
          for (let j = 0; j < cards.length; j++) {
            const a = labels[i], b = cards[j];
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
    const coreWidth = await system.locator('.gems-core').evaluate((el) => el.getBoundingClientRect().width);
    expect(coreWidth).toBeGreaterThan(250);
    await expect(system.locator('.gems-node')).toHaveCount(4);
    await expect(system.locator('.gems-cycle li')).toHaveCount(7);
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
      pulse: getComputedStyle(document.querySelector('.gems-art__pulse--in path')!).animationName,
    }));
    expect(reduced).toEqual({ ring: 'none', stages: 'none', pulse: 'none' });
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
