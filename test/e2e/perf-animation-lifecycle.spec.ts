import { test, expect } from '@playwright/test';

test.describe('R4.2 Animation Performance & Lifecycle Regression Gates', () => {
  test('portfolio map and product showcases do not start continuous animation work', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const animationNames = await page.locator('.portfolio-map, .product-showcase, .showcase-art').evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).animationName)
    );
    expect(animationNames.length).toBeGreaterThan(5);
    expect(animationNames.every((name) => name === 'none')).toBe(true);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(150);
    await page.locator('.portfolio-map').scrollIntoViewIfNeeded();
    const restored = await page.locator('.portfolio-map').evaluate((element) => getComputedStyle(element).animationName);
    expect(restored).toBe('none');
  });

  test('Page visibility API suspends decorative background and footer animations on hidden tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).not.toHaveAttribute('data-bg-paused');

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('html')).toHaveAttribute('data-bg-paused');

    const hiddenStates = await page.evaluate(() => {
      const systemNode = document.querySelector('.system-node');
      const footerPulse = document.querySelector('.footer-kicker span');
      return {
        systemNode: systemNode ? getComputedStyle(systemNode).animationPlayState : null,
        footerPulse: footerPulse ? getComputedStyle(footerPulse).animationPlayState : null,
      };
    });
    expect(hiddenStates.systemNode).toBe('paused');
    expect(hiddenStates.footerPulse).toBe('paused');

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('html')).not.toHaveAttribute('data-bg-paused');
  });

  test('Reduced motion disables ambient animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
    const motionStyles = await page.evaluate(() => ({
      systemNode: getComputedStyle(document.querySelector('.system-node')!).animationName,
      footerPulse: getComputedStyle(document.querySelector('.footer-kicker span')!).animationName,
      portfolioMap: getComputedStyle(document.querySelector('.portfolio-map')!).animationName,
      showcase: getComputedStyle(document.querySelector('.showcase-art')!).animationName,
    }));
    expect(motionStyles).toEqual({
      systemNode: 'none',
      footerPulse: 'none',
      portfolioMap: 'none',
      showcase: 'none',
    });
    await context.close();
  });

  test('Mobile portfolio layouts remain stacked and do not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });
    const map = page.locator('.portfolio-map');
    await expect(map).toBeVisible();
    await expect(map.locator('.portfolio-domain')).toHaveCount(4);
    const columns = await map.locator('.portfolio-map__grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns.trim().split(/\s+/)).toHaveLength(1);
    await expect(page.locator('.portfolio-showcases > .product-showcase')).toHaveCount(5);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('Pointer lighting is throttled and does not update continuously on touch/coarse devices', async ({ browser }) => {
    const touchContext = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
    const touchPage = await touchContext.newPage();
    await touchPage.goto('/', { waitUntil: 'networkidle' });
    const initialPointer = await touchPage.evaluate(() => document.documentElement.style.getPropertyValue('--pointer-x'));
    await touchPage.touchscreen.tap(200, 300);
    await touchPage.waitForTimeout(100);
    const postTouchPointer = await touchPage.evaluate(() => document.documentElement.style.getPropertyValue('--pointer-x'));
    expect(postTouchPointer).toBe(initialPointer);
    await touchContext.close();
  });
});
