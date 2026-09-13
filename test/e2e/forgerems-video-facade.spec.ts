import { test, expect } from '@playwright/test';

/**
 * R4.1 regression for the ForgerEMS click-to-load facade.
 *
 * The facade must make zero YouTube requests before the visitor presses play,
 * and the runtime-created iframe must be internally consistent: its URL asks
 * for autoplay=1, so its `allow` attribute must also grant autoplay — R4
 * shipped without it, which made the browser block programmatic playback and
 * forced a second click inside the YouTube player. The facade click stays the
 * only gesture that creates the player; nothing loads or plays on its own.
 *
 * YouTube is route-intercepted so the gate is deterministic and offline-safe:
 * we verify what the page requests and which attributes it sets, not YouTube.
 */
const YOUTUBE_PATTERN = /youtube|ytimg|googlevideo/i;
const EXPECTED_ALLOW_FEATURES = [
  'accelerometer',
  'autoplay',
  'clipboard-write',
  'encrypted-media',
  'gyroscope',
  'picture-in-picture',
  'web-share',
];

test.describe('ForgerEMS video facade', () => {
  test('holds YouTube until play, then creates an iframe whose permissions match its autoplay URL', async ({ page }) => {
    const youtubeRequests: string[] = [];
    const pageErrors: string[] = [];

    await page.route(YOUTUBE_PATTERN, (route) => {
      youtubeRequests.push(route.request().url());
      // Fulfil with an empty document instead of contacting YouTube: the
      // iframe element, its attributes, and the request itself are what we
      // certify; a real playback check would make the gate flaky.
      return route.fulfill({ status: 200, contentType: 'text/html', body: '' });
    });
    page.on('pageerror', (error) => pageErrors.push(String(error)));

    await page.goto('/forged');

    const card = page.locator('.product-card').filter({ hasText: 'ForgerEMS' });
    await expect(card).toBeVisible();

    const wrapper = card.locator('[data-video-facade]');
    await expect(wrapper).toBeVisible();
    expect(wrapper).toHaveAttribute('data-video-src', 'https://www.youtube-nocookie.com/embed/ILKWS2dNIrg');

    // Before the gesture: poster facade, no iframe, no third-party requests.
    await expect(wrapper.locator('img.video-facade__poster, img')).toBeVisible();
    await expect(wrapper.locator('iframe')).toHaveCount(0);
    expect(youtubeRequests).toEqual([]);

    // The play control is a real, labelled, keyboard-reachable button.
    const playButton = wrapper.locator('button.video-facade');
    await expect(playButton).toHaveAccessibleName(/Play video: ForgerEMS public preview/);
    await playButton.focus();
    await expect(playButton).toBeFocused();

    await playButton.click();

    // After the gesture: exactly one iframe, privacy-enhanced domain intact.
    const iframe = wrapper.locator('iframe');
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute('title', 'ForgerEMS public preview video');
    await expect(iframe).toHaveAttribute('allowfullscreen', '');

    const src = await iframe.getAttribute('src');
    expect(src).toContain('https://www.youtube-nocookie.com/embed/ILKWS2dNIrg');
    expect(src).toContain('autoplay=1');

    // The R4.1 regression: autoplay must be granted to match autoplay=1.
    const allow = (await iframe.getAttribute('allow')) ?? '';
    const granted = allow.split(';').map((feature) => feature.trim()).filter(Boolean);
    for (const feature of EXPECTED_ALLOW_FEATURES) {
      expect(granted, `allow must grant ${feature}`).toContain(feature);
    }

    // YouTube was only ever requested because of the click.
    expect(youtubeRequests.length).toBeGreaterThan(0);
    expect(youtubeRequests.some((url) => url.startsWith('https://www.youtube-nocookie.com/embed/ILKWS2dNIrg'))).toBe(true);

    expect(pageErrors).toEqual([]);
  });
});
