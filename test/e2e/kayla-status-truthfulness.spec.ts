import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * Kayla status truthfulness regression guards (Kayla 2.0 generic model).
 *
 * The badge used to claim "AI Online" from the health endpoint's configured
 * `aiAvailable` flag while the upstream free provider lane was actually
 * returning HTTP 429 and the verified knowledge lane was what served the
 * visitor. Kayla 2.0 goes further than "don't claim a stronger lane than
 * proven": the badge never names a lane at all. Which backend served an
 * answer — deterministic, retrieved, inference, failover — is server-side
 * routing detail and is invisible to the visitor by design.
 *
 * These tests pin the smallest truthful status model:
 * - "Ready" before any response (health flags alone must NOT yield a claim)
 * - "Thinking…"/"Responding…"/"Stopping…" only while a request is live
 * - "Ready" again after any completed answer, whatever lane served it
 * - "Temporarily unavailable" only when a completed response served nothing
 * - never "AI Online", "Knowledge Mode", or "AI Limited" — those strings
 *   leak internal routing and must not appear in the badge
 */

const CHAT_ROUTE = '**/api/kayla/chat*';
const HEALTH_ROUTE = '**/api/kayla/health*';
const LANE_LABELS = /AI Online|AI Limited|Knowledge Mode/;

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

test.describe('Kayla badge stays generic — it never names a serving lane', () => {
  test.beforeEach(async ({ page }) => { await stubHealth(page); });

  test('health with aiAvailable:true does NOT claim AI Online — badge stays Ready', async ({ page }) => {
    await openWidget(page);
    await expect(page.locator('.kayla-status-text')).toHaveText('Ready');
  });

  test('deterministic knowledge answer returns to Ready, never claims a lane', async ({ page }) => {
    await openWidget(page);
    await send(page, ndjson({
      content: 'CodeForge is publicly available and free.',
      mode: 'local',
      routeMode: 'deterministic',
      done: true,
      sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
    }), 'What is CodeForge?');
    await expect(page.locator('.kayla-status-text')).toHaveText('Ready');
    await expect(page.locator('.kayla-status-text')).not.toHaveText(LANE_LABELS);
  });

  test('provider-accepted answer returns to Ready, never claims AI Online', async ({ page }) => {
    await openWidget(page);
    await send(page, ndjson({
      content: 'A generated, canonical-fact-consistent comparison of the two systems.',
      mode: 'ai',
      routeMode: 'provider_accepted',
      done: true,
      sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
    }), 'Compare CodeForge and ForgerEMS.');
    await expect(page.locator('.kayla-status-text')).toHaveText('Ready');
    await expect(page.locator('.kayla-status-text')).not.toHaveText(LANE_LABELS);
  });

  test('provider failure with knowledge fallback returns to Ready, never claims AI Limited', async ({ page }) => {
    await openWidget(page);
    await send(page, ndjson({
      content: "Kayla's conversational AI is temporarily unavailable, but I can still answer from the FDS knowledge base.\n\nCanonical fallback answer.",
      mode: 'local',
      routeMode: 'provider_failed_fallback',
      done: true,
      sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
    }), 'Compare Training Grounds versus GEMS.');
    await expect(page.locator('.kayla-status-text')).toHaveText('Ready');
    await expect(page.locator('.kayla-status-text')).not.toHaveText(LANE_LABELS);
  });

  test('provider answer replaced by canonical verification returns to Ready', async ({ page }) => {
    await openWidget(page);
    await send(page, ndjson({
      replace: true,
      content: 'Canonical answer served instead of the rejected model output.',
      mode: 'local',
      routeMode: 'provider_replaced',
      done: true,
      sourceLinks: [{ label: 'CodeForge', kind: 'project', route: '/projects/codeforge' }]
    }), 'Write something the model would get wrong.');
    await expect(page.locator('.kayla-status-text')).toHaveText('Ready');
    await expect(page.locator('.kayla-status-text')).not.toHaveText(LANE_LABELS);
  });

  test('a rate-limited turn claims nothing; the next real answer returns to Ready', async ({ page }) => {
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
    // Nothing was served and nothing was claimed — no lane label, no alarm.
    await expect(page.locator('.kayla-status-text')).toHaveText('Ready');
    await expect(page.locator('.kayla-status-text')).not.toHaveText(LANE_LABELS);
    await page.locator('#kayla-input').fill('second question');
    await page.locator('#kayla-send').click();
    await expect(page.locator('.kayla-msg--kayla').last()).toContainText('Free first answer.');
    await expect(page.locator('.kayla-status-text')).toHaveText('Ready');
    await expect(page.locator('.kayla-status-text')).not.toHaveText(LANE_LABELS);
  });
});
