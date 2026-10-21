import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const productPages = [
  { route: '/projects/codeforge', showcase: '#forge-aaa-overview', destination: '#forge-aaa', title: /Forge AAA/ },
  { route: '/projects/forge-control', showcase: '#forge-control-architecture', destination: '#forge-control-availability', title: /Coordinate the work around connected coding agents/ },
  { route: '/projects/dead-trails-west', showcase: '#dead-trails-setting-study', destination: '#dead-trails-setting', title: /historical setting study/ },
];

test.describe('Product detail showcase behavior', () => {
  for (const product of productPages) {
    test(`${product.route} has a labeled, useful showcase and working in-page destination`, async ({ page }) => {
      await page.goto(product.route);

      const showcase = page.locator(product.showcase);
      await expect(showcase).toBeVisible();
      await expect(showcase.locator('.product-showcase__copy h2')).toContainText(product.title);
      await expect(showcase.locator('.showcase-art')).toHaveAttribute('role', 'img');
      await expect(showcase.locator('.showcase-art')).toHaveAttribute('aria-label', /illustrative design visualization/);
      await expect(showcase.locator('.product-showcase__link')).toHaveAttribute('href', product.destination);
      await expect(page.locator(product.destination)).toBeAttached();
      await expect(showcase.locator('.product-showcase__status')).toBeVisible();
    });
  }

  test('product detail showcases remain inside the viewport from phone to wide desktop', async ({ page }) => {
    for (const product of productPages) {
      await page.goto(product.route);
      for (const width of [360, 390, 768, 1280, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${product.route} horizontal overflow at ${width}px`).toBeLessThanOrEqual(1);
        const showcase = await page.locator(product.showcase).boundingBox();
        expect(showcase, `${product.route} showcase exists`).not.toBeNull();
        expect(showcase!.x).toBeGreaterThanOrEqual(0);
        expect(showcase!.x + showcase!.width).toBeLessThanOrEqual(width + 1);
      }
    }
  });

  test('Dead Trails West mobile caption clears the fixed Kayla launcher', async ({ page }) => {
    await page.goto('/projects/dead-trails-west');
    const art = page.locator('#dead-trails-setting-study .western-art');
    const caption = art.locator('.western-art__caption');
    const launcher = page.locator('#kayla-launcher');

    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await art.scrollIntoViewIfNeeded();
      const overlaps = await page.evaluate(() => {
        const captionRect = document.querySelector('.western-art__caption')!.getBoundingClientRect();
        const launcherRect = document.querySelector('#kayla-launcher')!.getBoundingClientRect();
        return captionRect.left < launcherRect.right
          && captionRect.right > launcherRect.left
          && captionRect.top < launcherRect.bottom
          && captionRect.bottom > launcherRect.top;
      });
      await expect(caption).toContainText('not gameplay footage');
      await expect(launcher).toBeVisible();
      expect(overlaps, `Dead Trails West caption overlaps the Kayla launcher at ${width}px`).toBe(false);
    }
  });

  test('Dead Trails West does not present its simulation as verified', async ({ page }) => {
    await page.goto('/projects/dead-trails-west');
    await expect(page.locator('main')).toContainText('The persistent-world simulation has not been independently verified');
    await expect(page.locator('main')).not.toContainText('partially verified');
  });

  test('detail-page illustrations have no serious accessibility violations', async ({ page }) => {
    for (const product of productPages) {
      await page.goto(product.route);
      const results = await new AxeBuilder({ page })
        .include(product.showcase)
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      const serious = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
      expect(serious, `Serious accessibility issues on ${product.route}`).toEqual([]);
    }
  });
});
