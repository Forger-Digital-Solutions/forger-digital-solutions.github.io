/**
 * Kayla request diagnostics.
 *
 * Phase 6 could say *which lane* answered (routeMode) but not *why* a lane was
 * taken. Every provider failure — an exhausted local budget, an upstream 429,
 * a dead model id, a timeout — collapsed into the same `provider_failed_fallback`
 * label, which is exactly what made the Phase 6 live-provider gap impossible to
 * diagnose without guessing.
 *
 * These records are operator-facing, not visitor-facing: the visitor still sees
 * a clean grounded answer with no provider internals. Nothing here may carry a
 * prompt, an answer, an API key, a header, or an IP address — only the small
 * set of enum-ish fields below plus counts and durations.
 */

/** Why a provider attempt did not produce an accepted answer. */
export type KaylaProviderFailure =
  | 'budget_exhausted'
  | 'rate_limited'
  | 'unauthorized'
  | 'payment_required'
  | 'model_unavailable'
  | 'upstream_failure'
  | 'timeout'
  | 'malformed_response'
  | 'network_failure'
  | 'empty_response'
  | 'not_configured';

/** What happened to a provider attempt, end to end. */
export type KaylaProviderOutcome = 'accepted' | 'rejected_replaced' | 'failed' | 'not_attempted';

export type KaylaVerificationOutcome = 'passed' | 'rejected' | 'not_applicable';

export interface KaylaDiagnostics {
  routeMode?: string;
  intent?: string;
  entity?: string;
  providerAttempted: boolean;
  providerOutcome: KaylaProviderOutcome;
  /** Present only when providerOutcome is 'failed'. */
  providerFailure?: KaylaProviderFailure;
  /**
   * Upstream HTTP status, when the provider actually answered with one. A bare
   * status code carries no secret and is the single most useful field for
   * telling "our own budget said no" apart from "OpenRouter said no".
   */
  upstreamStatus?: number;
  verificationOutcome: KaylaVerificationOutcome;
  /** Canonical rule kinds a rejected generation broke (aggregate only). */
  verificationKinds?: string[];
  fallbackReason?: string;
  sourceCount: number;
  actionCount: number;
}

export function emptyDiagnostics(): KaylaDiagnostics {
  return {
    providerAttempted: false,
    providerOutcome: 'not_attempted',
    verificationOutcome: 'not_applicable',
    sourceCount: 0,
    actionCount: 0
  };
}

/**
 * Map the provider layer's thrown error codes onto a stable failure class.
 * The provider throws bare code strings (see provider.ts); anything
 * unrecognised is an upstream failure rather than a new silent category.
 */
export function classifyProviderError(code: string | undefined): KaylaProviderFailure {
  switch (code) {
    case 'TIMEOUT': return 'timeout';
    case 'RATE_LIMITED': return 'rate_limited';
    case 'AUTH_FAILURE': return 'unauthorized';
    case 'QUOTA_EXHAUSTED': return 'payment_required';
    case 'MODEL_UNAVAILABLE': return 'model_unavailable';
    case 'MALFORMED_RESPONSE': return 'malformed_response';
    case 'NETWORK_FAILURE': return 'network_failure';
    case 'EMPTY_RESPONSE': return 'empty_response';
    case 'NO_PROVIDER': return 'not_configured';
    default: return 'upstream_failure';
  }
}

/** An upstream status carried on a thrown provider error, e.g. "UPSTREAM_FAILURE:400". */
export function parseProviderError(message: string): { code: string; status?: number } {
  const [code, rawStatus] = message.split(':');
  const status = Number(rawStatus);
  return { code, status: Number.isFinite(status) && status > 0 ? status : undefined };
}
