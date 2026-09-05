import type { KaylaSafeAction } from '../../data/kayla/types';
import { CANONICAL_INTERNAL_ROUTES } from '../../data/kayla/canonical-registry';

/**
 * Explicit whitelist of allowed read-only navigational action types.
 */
export const ALLOWED_ACTION_TYPES = new Set<string>([
  'OPEN_PAGE',
  'OPEN_APP',
  'OPEN_DOWNLOAD',
  'OPEN_GITHUB',
  'OPEN_FORGED',
  'OPEN_CONTACT',
  'OPEN_DONATE',
  'SHOW_APPS',
  'SHOW_ROADMAP'
]);

/**
 * Explicit blacklist of prohibited side-effect / state-modifying action types.
 * Any action matching these (or any type not in ALLOWED_ACTION_TYPES) is rejected.
 */
export const FORBIDDEN_ACTION_TYPES = new Set<string>([
  'SUBMIT_FORM',
  'SEND_EMAIL',
  'SEND_PAYMENT',
  'DOWNLOAD_AUTOMATICALLY',
  'DOWNLOAD_AND_RUN',
  'POST_DATA',
  'POST_COMMENT',
  'CREATE_ACCOUNT',
  'DELETE_ANYTHING',
  'DELETE_PROJECT',
  'MODIFY_ANYTHING'
]);

export interface ActionValidationResult {
  valid: boolean;
  action?: KaylaSafeAction;
  violations: string[];
}

export interface ActionValidationOptions {
  strictCanonical?: boolean;
}

const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript|file):/i;

const ALLOWED_EXTERNAL_DOMAINS = [
  'github.com',
  'cash.app',
  'ko-fi.com',
  'youtube.com',
  'discord.gg',
  'discord.com',
  'twitter.com',
  'x.com'
];

/**
 * Verifies that an action complies strictly with the read-only safety contract:
 * 1. Action type must be a known, whitelisted navigation type.
 * 2. Action type must NOT be in the forbidden side-effect list.
 * 3. Href must not use dangerous protocols (javascript:, data:, etc.).
 * 4. When strictCanonical is true, internal hrefs must resolve to an existent canonical route.
 * 5. External hrefs must resolve to an approved canonical external destination or domain.
 */
export function validateSafeAction(
  action: unknown,
  options: ActionValidationOptions = {}
): ActionValidationResult {
  const violations: string[] = [];

  if (!action || typeof action !== 'object') {
    return { valid: false, violations: ['Action must be a non-null object'] };
  }

  const a = action as Record<string, unknown>;

  if (typeof a.type !== 'string' || !a.type.trim()) {
    violations.push('Action type must be a non-empty string');
    return { valid: false, violations };
  }

  if (FORBIDDEN_ACTION_TYPES.has(a.type)) {
    violations.push(`Action type "${a.type}" is explicitly forbidden (side effects prohibited)`);
  }

  if (!ALLOWED_ACTION_TYPES.has(a.type)) {
    violations.push(`Action type "${a.type}" is not in the allowed read-only whitelist`);
  }

  if (typeof a.label !== 'string' || !a.label.trim()) {
    violations.push('Action label must be a non-empty string');
  }

  // SHOW_APPS and SHOW_ROADMAP don't require an href (handled internally by UI)
  if (a.type !== 'SHOW_APPS' && a.type !== 'SHOW_ROADMAP') {
    if (typeof a.href !== 'string' || !a.href.trim()) {
      violations.push(`Action "${a.type}" requires a non-empty href string`);
    } else {
      const href = a.href.trim();
      if (DANGEROUS_PROTOCOLS.test(href)) {
        violations.push(`Action href contains forbidden protocol: ${href}`);
      }

      if (href.startsWith('/')) {
        if (options.strictCanonical) {
          const canonicalRoutes: readonly string[] = CANONICAL_INTERNAL_ROUTES;
          const normalizedHref = href.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
          const routeMatches = canonicalRoutes.some((r) => r === normalizedHref || (r === '/' && normalizedHref === ''));
          if (!routeMatches) {
            violations.push(`Action href "${href}" is not a canonical internal route`);
          }
        }
      } else if (href.startsWith('mailto:')) {
        if (a.type !== 'OPEN_CONTACT') {
          violations.push(`mailto: href is only allowed for OPEN_CONTACT, got ${a.type}`);
        }
      } else if (/^https?:\/\//i.test(href)) {
        if (options.strictCanonical) {
          try {
            const parsed = new URL(href);
            const hostname = parsed.hostname.toLowerCase();
            const isAllowedDomain = ALLOWED_EXTERNAL_DOMAINS.some(
              (d) => hostname === d || hostname.endsWith(`.${d}`)
            );
            if (!isAllowedDomain) {
              violations.push(`External href domain "${hostname}" is not in canonical allowed domains`);
            }
          } catch {
            violations.push(`Invalid external URL: ${href}`);
          }
        }
      } else {
        violations.push(`Action href must start with "/" or be an absolute http(s)/mailto URL: ${href}`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    action: violations.length === 0 ? (action as KaylaSafeAction) : undefined,
    violations
  };
}

/**
 * Validates a list of actions strictly against canonical routes and read-only policy.
 */
export function sanitizeActions(
  actions?: unknown[],
  options: ActionValidationOptions = { strictCanonical: true }
): KaylaSafeAction[] {
  if (!Array.isArray(actions)) return [];
  const safe: KaylaSafeAction[] = [];
  for (const act of actions) {
    const res = validateSafeAction(act, options);
    if (res.valid && res.action) {
      safe.push(res.action);
    }
  }
  return safe;
}
