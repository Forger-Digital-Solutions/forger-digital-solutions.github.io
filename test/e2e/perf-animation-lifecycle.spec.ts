import { test, expect } from '@playwright/test';

test.describe('Animation Performance & Lifecycle Regression Gates', () => {
  test('flagship surfaces and ecosystem architecture do not run continuous background animations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const animationNames = await page
      .locator('.hero, .eco-arch, .specialist-panel, .app-feature, .statelines-banner')
      .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).animationName));
    expect(animationNames.length).toBeGreaterThanOrEqual(6);
    expect(animationNames.every((name) => name === 'none')).toBe(true);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(150);
    await page.locator('.eco-arch').scrollIntoViewIfNeeded();
    const restored = await page.locator('.eco-arch').evaluate((element) => getComputedStyle(element).animationName);
    expect(restored).toBe('none');
  });

  test('Page visibility API suspends ambient indicator animations on hidden tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).not.toHaveAttribute('data-bg-paused');

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('html')).toHaveAttribute('data-bg-paused');

    const hiddenDotState = await page.evaluate(() => {
      const dot = document.querySelector('.visitor-counter__dot');
      return dot ? getComputedStyle(dot).animationPlayState : null;
    });
    expect(hiddenDotState).toBe('paused');

    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('html')).not.toHaveAttribute('data-bg-paused');
  });

  test('Reduced motion disables ambient animations across the homepage', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });
    const motionStyles = await page.evaluate(() => ({
      visitorDot: getComputedStyle(document.querySelector('.visitor-counter__dot')!).animationName,
      ecoArch: getComputedStyle(document.querySelector('.eco-arch')!).animationName,
      hero: getComputedStyle(document.querySelector('.hero')!).animationName,
    }));
    expect(motionStyles).toEqual({
      visitorDot: 'none',
      ecoArch: 'none',
      hero: 'none',
    });
    await context.close();
  });

  test('Mobile flagship layouts remain stacked in a single column and do not overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const divisionCols = await page
      .locator('.division-rail')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
    expect(divisionCols).toBe(1);

    const specialistCols = await page
      .locator('.specialist-grid')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
    expect(specialistCols).toBe(1);

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
