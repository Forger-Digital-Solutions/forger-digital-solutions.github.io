import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Phase 9 — Multi-turn conversation and topic-shift browser E2E tests.
 *
 * Verifies that:
 * 1. Multi-turn pronoun resolution works in the live browser widget
 * 2. Topic shift in the browser UI correctly updates context
 * 3. Narrow 320px viewports handle multi-turn message transcripts gracefully
 */

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';

function ndjson(...objects: unknown[]): string {
  return objects.map((value) => JSON.stringify(value)).join('\n') + '\n';
}

async function stubHealth(page: Page, aiAvailable = true) {
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable }) })
  );
}

async function openWidget(page: Page) {
  await page.goto('/');
  await page.locator('#kayla-launcher').click();
  await expect(page.locator('#kayla-panel')).toBeVisible();
}

async function sendMessage(page: Page, text: string) {
  await page.locator('#kayla-input').fill(text);
  await page.locator('#kayla-send').click();
  await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
}

test.describe('Phase 9 Multi-turn Browser Conversations', () => {
  test.beforeEach(async ({ page }) => {
    await stubHealth(page);
  });

  test('preserves multi-turn conversational transcript and carries history to server', async ({ page }) => {
    let turnCount = 0;
    const receivedHistories: number[] = [];

    await page.route(CHAT_ROUTE, async (route: Route) => {
      turnCount++;
      const postData = JSON.parse(route.request().postData() || '{}');
      receivedHistories.push((postData.history || []).length);

      if (turnCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson; charset=utf-8',
          body: ndjson({
            content: 'CodeForge is a released autonomous software-engineering platform.',
            done: true,
            mode: 'local',
            routeMode: 'deterministic'
          })
        });
      } else if (turnCount === 2) {
        await route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson; charset=utf-8',
          body: ndjson({
            content: 'Yes, CodeForge is downloadable now for Windows.',
            done: true,
            mode: 'local',
            routeMode: 'deterministic'
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson; charset=utf-8',
          body: ndjson({
            content: 'KyraBlox is in active development and has no public download today.',
            done: true,
            mode: 'local',
            routeMode: 'deterministic'
          })
        });
      }
    });

    await openWidget(page);

    // Turn 1
    await sendMessage(page, 'Tell me about CodeForge.');
    await expect(page.locator('#kayla-conversation')).toContainText('CodeForge is a released autonomous');

    // Turn 2: pronoun
    await sendMessage(page, 'Can I download it?');
    await expect(page.locator('#kayla-conversation')).toContainText('downloadable now for Windows');

    // Turn 3: topic shift
    await sendMessage(page, 'What about KyraBlox?');
    await expect(page.locator('#kayla-conversation')).toContainText('KyraBlox is in active development');

    // Verify history grew with each turn
    expect(receivedHistories[1]).toBe(receivedHistories[0] + 2);
    expect(receivedHistories[2]).toBe(receivedHistories[1] + 2);
  });

  test('handles multi-turn conversation at 320px viewport without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 600 });

    await page.route(CHAT_ROUTE, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson; charset=utf-8',
        body: ndjson({
          content: 'FDS builds focused software and AI tools.',
          done: true,
          mode: 'local',
          routeMode: 'deterministic'
        })
      });
    });

    await openWidget(page);

    await sendMessage(page, 'Hello');
    await sendMessage(page, 'What do you build?');
    await sendMessage(page, 'Tell me more.');

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow, 'multi-turn transcript caused horizontal overflow at 320px').toBe(false);
    await expect(page.locator('#kayla-input')).toBeVisible();
  });
});
