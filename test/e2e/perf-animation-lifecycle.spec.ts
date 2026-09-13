import { test, expect } from '@playwright/test';

test.describe('R4.2 Animation Performance & Lifecycle Regression Gates', () => {
  test('Ecosystem suspends animation work when offscreen and resumes when visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const ecosystem = page.locator('.fds-ecosystem');
    await expect(ecosystem).toBeAttached();

    // 1. When ecosystem is in viewport, it should not be paused
    await ecosystem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await expect(ecosystem).not.toHaveAttribute('data-eco-paused');

    const isRunning = await page.evaluate(() => {
      const el = document.querySelector('.planet-motion');
      return el ? getComputedStyle(el).animationPlayState : null;
    });
    expect(isRunning).toBe('running');

    // 2. Scroll far past the ecosystem (to the bottom of the page)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Attribute data-eco-paused should now be set by IntersectionObserver
    await expect(ecosystem).toHaveAttribute('data-eco-paused', '', { timeout: 3000 });

    const isPaused = await page.evaluate(() => {
      const el = document.querySelector('.planet-motion');
      return el ? getComputedStyle(el).animationPlayState : null;
    });
    expect(isPaused).toBe('paused');

    // 3. Scroll back into view — should smoothly resume without snapping or phase reset
    await ecosystem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    await expect(ecosystem).not.toHaveAttribute('data-eco-paused', { timeout: 3000 });

    const resumedState = await page.evaluate(() => {
      const el = document.querySelector('.planet-motion');
      return el ? getComputedStyle(el).animationPlayState : null;
    });
    expect(resumedState).toBe('running');
  });

  test('Page visibility API suspends decorative background animations on hidden tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Initially visible
    await expect(page.locator('html')).not.toHaveAttribute('data-bg-paused');

    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(page.locator('html')).toHaveAttribute('data-bg-paused');

    const hiddenStates = await page.evaluate(() => {
      const planet = document.querySelector('.planet-motion');
      const constellation = document.querySelector('.constellation__node');
      const systemNode = document.querySelector('.system-node');
      return {
        planet: planet ? getComputedStyle(planet).animationPlayState : null,
        constellation: constellation ? getComputedStyle(constellation).animationPlayState : null,
        systemNode: systemNode ? getComputedStyle(systemNode).animationPlayState : null,
      };
    });

    expect(hiddenStates.planet).toBe('paused');
    expect(hiddenStates.constellation).toBe('paused');
    expect(hiddenStates.systemNode).toBe('paused');

    // Simulate tab returning to visible
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect(page.locator('html')).not.toHaveAttribute('data-bg-paused');
  });

  test('Reduced motion mode eliminates continuous animation cost', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    const motionStyles = await page.evaluate(() => {
      const planet = document.querySelector('.planet-motion');
      const pulse = document.querySelector('.orbit-pulse');
      const coreHalo = document.querySelector('.core__heart-halo');
      const constellation = document.querySelector('.constellation__node');
      const systemNode = document.querySelector('.system-node');

      return {
        planetAnimation: planet ? getComputedStyle(planet).animationName : null,
        planetWillChange: planet ? getComputedStyle(planet).willChange : null,
        pulseAnimation: pulse ? getComputedStyle(pulse).animationName : null,
        coreHaloAnimation: coreHalo ? getComputedStyle(coreHalo).animationName : null,
        constellationAnimation: constellation ? getComputedStyle(constellation).animationName : null,
        systemNodeAnimation: systemNode ? getComputedStyle(systemNode).animationName : null,
      };
    });

    expect(motionStyles.planetAnimation).toBe('none');
    expect(motionStyles.planetWillChange).toBe('auto');
    expect(motionStyles.pulseAnimation).toBe('none');
    expect(motionStyles.coreHaloAnimation).toBe('none');
    expect(motionStyles.constellationAnimation).toBe('none');
    expect(motionStyles.systemNodeAnimation).toBe('none');

    await context.close();
  });

  test('Mobile viewports strictly pause desktop orbital SVG animations', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'networkidle' });

    const mobileState = await page.evaluate(() => {
      const sceneWrap = document.querySelector('.fds-ecosystem__scene-wrap');
      const planet = document.querySelector('.fds-ecosystem__scene-wrap .planet-motion');
      const pulse = document.querySelector('.fds-ecosystem__scene-wrap .orbit-pulse');
      const ring = document.querySelector('.fds-ecosystem__scene-wrap .core__ring');

      return {
        display: sceneWrap ? getComputedStyle(sceneWrap).display : null,
        planetPlayState: planet ? getComputedStyle(planet).animationPlayState : null,
        pulsePlayState: pulse ? getComputedStyle(pulse).animationPlayState : null,
        ringPlayState: ring ? getComputedStyle(ring).animationPlayState : null,
      };
    });

    expect(mobileState.display).toBe('none');
    expect(mobileState.planetPlayState).toBe('paused');
    expect(mobileState.pulsePlayState).toBe('paused');
    expect(mobileState.ringPlayState).toBe('paused');

    await context.close();
  });

  test('Pointer lighting is throttled and does not update continuously on touch/coarse devices', async ({ browser }) => {
    // Touch/coarse context (mobile)
    const touchContext = await browser.newContext({
      hasTouch: true,
      viewport: { width: 390, height: 844 },
    });
    const touchPage = await touchContext.newPage();
    await touchPage.goto('/', { waitUntil: 'networkidle' });

    // Initial CSS variable state
    const initialPointer = await touchPage.evaluate(() => {
      return document.documentElement.style.getPropertyValue('--pointer-x');
    });

    // Dispatch touch/pointermove
    await touchPage.touchscreen.tap(200, 300);
    await touchPage.waitForTimeout(100);

    const postTouchPointer = await touchPage.evaluate(() => {
      return document.documentElement.style.getPropertyValue('--pointer-x');
    });

    // Touch device should NOT set inline CSS variable
    expect(postTouchPointer).toBe(initialPointer);

    await touchContext.close();
  });
});
