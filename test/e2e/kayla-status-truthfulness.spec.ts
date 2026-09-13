import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * R4.2H-R2.1 — Kayla status truthfulness regression guards.
 *
 * The badge used to claim "AI Online" from the health endpoint's configured
 * `aiAvailable` flag while the upstream free provider lane was actually
 * returning HTTP 429 and the verified knowledge lane was what served the
 * visitor. Primary product rule: never display a stronger service state than
 * the system has actually proven.
 *
 * These tests pin the smallest truthful status model:
 * - "Ready" before any response (health flags alone must NOT yield "AI Online")
 * - "AI Online" only after a response the server served from the provider lane
 * - "Knowledge Mode" after a deterministic/canonical response
 * - "AI Limited · Knowledge Mode" after a provider attempt failed/replaced
 * - the badge never claims a lane for a turn that served nothing (429)
 */

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';

function ndjson(...objects: unknown[]): string {
  return objects.map((value) => JSON.stringify(value)).join('\n') + '\n';
}

async function stubHealth(page: Page) {
  // Deliberately advertises aiAvailable: true — proving the badge can no
  // longer be upgraded by configuration alone.
  await page.route(HEALTH_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', aiAvailable: true }) })
  );
}

async function openWidget(page: Page) {
  await page.goto('/');
  await page.locator('#kayla-launcher').click();
  await expect(page.locator('#kayla-panel')).toBeVisible();
  await expect(page.locator('.kayla-status-text')).toHaveText('Ready');
}

async function send(page: Page, body: string, text: string) {
  await page.route(CHAT_ROUTE, (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body })
  );
  await page.locator('#kayla-input').fill(text);
  await page.locator('#kayla-send').click();
  await expect(page.locator('.kayla-msg--kayla').last()).not.toHaveText(/^Thinking/, { timeout: 10_000 });
}

test.describe('Kayla badge reflects the actually-proven response lane', () => {
  test.beforeEach(async ({ page }) => { await stubHealth(page); });

  test('health with aiAvailable:true does NOT claim AI Online — badge stays Ready', async ({ page }) => {
    await openWidget(page);
    await expect(page.locator('.kayla-status-text')).toHaveText('Ready');
  });

  test('deterministic knowledge answer sets Knowledge Mode', async ({ page }) => {
    await openWidget(page);
    await send(page, ndjson({
      content: 'CodeForge is publicly available and free.',
      mode: 'local',
      routeMode: 'deterministic',
      done: true,
      sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
    }), 'What is CodeForge?');
    await expect(page.locator('.kayla-status-text')).toHaveText('Knowledge Mode');
  });

  test('provider-accepted answer sets AI Online', async ({ page }) => {
    await openWidget(page);
    await send(page, ndjson({
      content: 'A generated, canonical-fact-consistent comparison of the two systems.',
      mode: 'ai',
      routeMode: 'provider_accepted',
      done: true,
      sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
    }), 'Compare CodeForge and ForgerEMS.');
    await expect(page.locator('.kayla-status-text')).toHaveText('AI Online');
  });

  test('provider failure with knowledge fallback sets AI Limited · Knowledge Mode', async ({ page }) => {
    await openWidget(page);
    await send(page, ndjson({
      content: "Kayla's conversational AI is temporarily unavailable, but I can still answer from the FDS knowledge base.\n\nCanonical fallback answer.",
      mode: 'local',
      routeMode: 'provider_failed_fallback',
      done: true,
      sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
    }), 'Compare Training Grounds versus GEMS.');
    await expect(page.locator('.kayla-status-text')).toHaveText('AI Limited · Knowledge Mode');
  });

  test('provider answer replaced by canonical verification sets AI Limited · Knowledge Mode', async ({ page }) => {
    await openWidget(page);
    await send(page, ndjson({
      replace: true,
      content: 'Canonical answer served instead of the rejected model output.',
      mode: 'local',
      routeMode: 'provider_replaced',
      done: true,
      sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
    }), 'Write something the model would get wrong.');
    await expect(page.locator('.kayla-status-text')).toHaveText('AI Limited · Knowledge Mode');
  });

  test('a rate-limited turn does not claim any lane; the next real answer does', async ({ page }) => {
    let calls = 0;
    await openWidget(page);
    await page.route(CHAT_ROUTE, (route: Route) => {
      calls++;
      if (calls === 1) return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'slow down', errorType: 'RATE_LIMITED' }) });
      return route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: ndjson({
        content: 'Free first answer.',
        mode: 'local',
        routeMode: 'deterministic',
        done: true
      }) });
    });
    await page.locator('#kayla-input').fill('first question');
    await page.locator('#kayla-send').click();
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText(/try again/i);
    // Nothing was served: the badge must not claim Knowledge/AI for this turn.
    await expect(page.locator('.kayla-status-text')).toHaveText('Ready');
    await page.locator('#kayla-input').fill('second question');
    await page.locator('#kayla-send').click();
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('Free first answer.');
    await expect(page.locator('.kayla-status-text')).toHaveText('Knowledge Mode');
  });
});
