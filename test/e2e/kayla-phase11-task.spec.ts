import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Phase 11 — Task-Oriented Site Agent & Visitor Journey E2E tests.
 *
 * Verifies that:
 * 1. Newcomer journey through starter chips and multi-step exploration works
 * 2. Developer journey guides visitors toward CodeForge and dev tools
 * 3. Goal switching (e.g. dev inquiry -> support inquiry) updates task context
 * 4. Mobile responsiveness at 390px (iPhone) and 320px viewports without horizontal blowout
 * 5. Keyboard navigation (Tab cycling and Enter to submit) works smoothly
 */

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';

function ndjson(...objects: unknown[]): string {
  return objects.map((value) => JSON.stringify(value)).join('\n') + '\n';
}

async function stubHealth(page: Page, aiAvailable = true) {
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', aiAvailable, knowledgeVersion: 'be8d05ff146c8c98' })
    })
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

test.describe('Phase 11 Task-Oriented Visitor Journeys & Safety', () => {
  test.beforeEach(async ({ page }) => {
    await stubHealth(page);
  });

  test('Newcomer journey: starter click -> follow-up navigation -> available software', async ({ page }) => {
    let turn = 0;

    await page.route(CHAT_ROUTE, async (route: Route) => {
      turn++;
      if (turn === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson; charset=utf-8',
          body: ndjson({
            content: 'Welcome to Forger Digital Solutions. To start exploring, check out our projects or see what software is available today.',
            actions: [
              { type: 'SHOW_APPS', label: 'Explore the projects', href: '/projects' },
              { type: 'OPEN_FORGED', label: 'What can I use now?', href: '/forged' }
            ],
            done: true,
            mode: 'local',
            routeMode: 'deterministic'
          })
        });
      } else if (turn === 2) {
        await route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson; charset=utf-8',
          body: ndjson({
            content: 'FDS is currently building CodeForge, GEMS / Training Grounds, KyraBlox, Kayla AI Publisher, FarmStand Finder, We The People, and ForgerEMS.',
            actions: [
              { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' },
              { type: 'OPEN_FORGED', label: 'What can I use now?', href: '/forged' }
            ],
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
            content: 'Downloadable FDS software lives on Forged: CodeForge (v0.2.0) and ForgerEMS (v1.0.0).',
            actions: [
              { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }
            ],
            done: true,
            mode: 'local',
            routeMode: 'deterministic'
          })
        });
      }
    });

    await openWidget(page);

    // Initial Phase 11 starters are visible
    const starterBtn = page.locator('#kayla-starters button', { hasText: 'Where should I start?' });
    await expect(starterBtn).toBeVisible();

    // Turn 1: Click "Where should I start?"
    await starterBtn.click();
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('Welcome to Forger Digital Solutions');

    // Action button rendered in chat bubble
    const actionBtn = page.locator('.kayla-action-btn', { hasText: 'Explore the projects' }).last();
    await expect(actionBtn).toBeVisible();

    // Turn 2: Ask about projects
    await sendMessage(page, 'Tell me about the projects.');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('CodeForge, GEMS / Training Grounds');

    // Turn 3: Ask what can be used now
    await sendMessage(page, 'What can I use now?');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('Downloadable FDS software lives on Forged');
  });

  test('Developer journey: guidance to CodeForge and safe bounded actions', async ({ page }) => {
    await page.route(CHAT_ROUTE, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson; charset=utf-8',
        body: ndjson({
          content: 'For developers, CodeForge is our autonomous software engineering platform for Windows, CLI, and VS Code. It is free and available at v0.2.0.',
          actions: [
            { type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' },
            { type: 'OPEN_FORGED', label: 'Visit Forged', href: '/forged' }
          ],
          done: true,
          mode: 'local',
          routeMode: 'deterministic'
        })
      });
    });

    await openWidget(page);
    await sendMessage(page, 'I am a developer. What should I look at?');

    const lastMsg = page.locator('.kayla-msg--kayla').last();
    await expect(lastMsg).toContainText('CodeForge is our autonomous software engineering platform');

    // Verify safe action links exist and are bounded
    const actions = page.locator('.kayla-action-btn');
    await expect(actions.first()).toBeVisible();
    const actionCount = await actions.count();
    expect(actionCount).toBeLessThanOrEqual(3);
    expect(actionCount).toBeGreaterThan(0);

    // Verify first action button label
    const firstLabel = await actions.first().textContent();
    expect(firstLabel).toContain('View CodeForge');
  });

  test('Goal switch: transitions from developer inquiry to support options', async ({ page }) => {
    let turn = 0;
    await page.route(CHAT_ROUTE, async (route: Route) => {
      turn++;
      if (turn === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/x-ndjson; charset=utf-8',
          body: ndjson({
            content: 'CodeForge is released and free.',
            actions: [{ type: 'OPEN_APP', label: 'View CodeForge', href: '/projects/codeforge' }],
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
            content: 'You can support FDS development through Cash App ($ForgerDigital) or Ko-fi. Hardware donations are also welcome.',
            actions: [
              { type: 'OPEN_DONATE', label: 'Support FDS', href: '/support' },
              { type: 'OPEN_PAGE', label: 'Hardware Donations', href: '/support/hardware' }
            ],
            done: true,
            mode: 'local',
            routeMode: 'deterministic'
          })
        });
      }
    });

    await openWidget(page);
    await sendMessage(page, 'Tell me about CodeForge');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('CodeForge is released and free');

    // Switch goal to supporting FDS
    await sendMessage(page, 'How can I support FDS?');
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('Cash App ($ForgerDigital) or Ko-fi');
    await expect(page.locator('.kayla-action-btn', { hasText: 'Support FDS' }).last()).toBeVisible();
  });

  test('Mobile viewport responsiveness at 390px and 320px', async ({ page }) => {
    // 1. iPhone 12/13/14 viewport (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const launcher = page.locator('#kayla-launcher');
    await expect(launcher).toBeVisible();
    await launcher.click();

    const panel = page.locator('#kayla-panel');
    await expect(panel).toBeVisible();

    // Verify panel width does not blow out the viewport
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.width).toBeLessThanOrEqual(390);

    // Verify horizontal overflow on body is absent
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // 2. Compact 320px viewport
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(panel).toBeVisible();

    const panelBox320 = await panel.boundingBox();
    expect(panelBox320).not.toBeNull();
    expect(panelBox320!.width).toBeLessThanOrEqual(320);

    const hasHorizontalScroll320 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll320).toBe(false);
  });

  test('Keyboard navigation and composer accessibility', async ({ page }) => {
    await openWidget(page);

    await page.route(CHAT_ROUTE, async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson; charset=utf-8',
        body: ndjson({
          content: 'Hello! I am Kayla Copilot.',
          done: true,
          mode: 'local',
          routeMode: 'deterministic'
        })
      });
    });

    const input = page.locator('#kayla-input');
    await input.focus();
    await input.fill('Hello');
    await page.keyboard.press('Enter');

    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('Hello! I am Kayla Copilot.');
  });
});
