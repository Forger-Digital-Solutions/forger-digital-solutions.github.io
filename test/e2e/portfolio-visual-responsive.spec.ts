import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { projects } from '../../src/data/projects';

test.describe('Homepage portfolio visual system', () => {
  test('shows the product hierarchy, current catalog, and canonical states', async ({ page }) => {
    await page.goto('/');
    const portfolio = page.locator('.portfolio-map');
    await expect(portfolio).toBeVisible();
    await expect(portfolio).toContainText('Different products. Clear boundaries.');
    await expect(portfolio.locator('.portfolio-domain')).toHaveCount(4);

    const destinations = await portfolio.locator('a[href^="/projects/"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href'))
    );
    for (const project of projects) {
      expect(destinations, `${project.name} appears in the portfolio map`).toContain(`/projects/${project.slug}`);
    }
    await expect(portfolio.locator('a[href="/projects/codeforge#forge-aaa"]')).toContainText('CodeForge architecture');
    await expect(portfolio.locator('.portfolio-domain--1')).toContainText('CodeForge');
    await expect(portfolio.locator('.portfolio-domain--1')).toContainText('Forge AAA');
    await expect(portfolio.locator('.portfolio-domain--2')).toContainText('Forge Control');
    await expect(portfolio.locator('.portfolio-domain--3')).toContainText('Dead Trails West');
    await expect(portfolio.locator('.portfolio-domain--4')).toContainText('ForgerEMS');
    const additional = page.locator('.forge-list');
    await expect(additional).toContainText('Kayla AI Publisher');
    await expect(additional).not.toContainText('Forge Control');
    await expect(additional).not.toContainText('Dead Trails West');
    await expect(additional).not.toContainText('ForgerEMS');
  });

  test('keeps showcase media and text within desktop, tablet, and mobile layouts', async ({ page }) => {
    await page.goto('/');
    const showcases = page.locator('.portfolio-showcases > .product-showcase');
    await expect(showcases).toHaveCount(5);
    await expect(page.locator('#codeforge-showcase img')).toHaveAttribute('alt', /CodeForge v0\.2\.0/);
    await expect(page.locator('#forgerems-showcase img')).toHaveAttribute('src', /forgerems-preview-poster/);
    await expect(page.locator('#dead-trails-showcase')).toContainText('not gameplay evidence');

    for (const width of [360, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `homepage horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
      for (const id of ['#codeforge-showcase', '#forge-control-showcase', '#forge-aaa-showcase', '#dead-trails-showcase', '#forgerems-showcase']) {
        const box = await page.locator(id).boundingBox();
        expect(box, `${id} visible at ${width}px`).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
    }
  });

  test('keeps the portfolio map keyboard-accessible and labels its status-bearing links', async ({ page }) => {
    await page.goto('/');
    const portfolio = page.locator('.portfolio-map');
    const codeforgeLink = portfolio.locator('a[href="/projects/codeforge"]').first();
    await codeforgeLink.focus();
    await expect(codeforgeLink).toBeFocused();
    await expect(codeforgeLink).toContainText('CodeForge');
    await expect(portfolio.getByRole('link', { name: /Forge Control/ })).toHaveAttribute('href', '/projects/forge-control');
    await expect(portfolio.getByRole('link', { name: /Dead Trails West/ })).toHaveAttribute('href', '/projects/dead-trails-west');
  });

  test('passes serious accessibility checks for the homepage portfolio and product showcases', async ({ page }) => {
    await page.goto('/');
    const showcases = page.locator('.portfolio-showcases');
    await showcases.scrollIntoViewIfNeeded();
    await expect(showcases).toHaveClass(/is-revealed/);
    await expect.poll(() => showcases.evaluate((element) => getComputedStyle(element).opacity))
      .toBe('1');
    const results = await new AxeBuilder({ page })
      .include('.portfolio-map')
      .include('.portfolio-showcases')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
    expect(serious, 'Serious accessibility issues in portfolio presentation').toEqual([]);
  });
});
