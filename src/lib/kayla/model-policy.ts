export const ZERO_COST_POLICY = 'ZERO_COST_ONLY' as const;
export const OPENROUTER_FREE_MODEL = 'openrouter/free';
export const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export interface ModelPolicyResult {
  eligible: boolean;
  reason: string;
  provider: string;
  model: string;
  costPolicy: typeof ZERO_COST_POLICY;
}

export function evaluateModelPolicy(providerInput?: string, modelInput?: string): ModelPolicyResult {
  const provider = (providerInput || '').trim().toLowerCase();
  const model = (modelInput || '').trim().toLowerCase();
  const result = (eligible: boolean, reason: string): ModelPolicyResult => ({
    eligible,
    reason,
    provider,
    model,
    costPolicy: ZERO_COST_POLICY
  });

  if (provider === 'mock' || provider === 'test') {
    return result(true, 'non-production test provider');
  }
  if (provider !== 'openrouter') {
    return result(false, provider ? 'provider is not approved' : 'provider is not configured');
  }
  if (model === OPENROUTER_FREE_MODEL) {
    return result(true, 'OpenRouter zero-cost router');
  }
  if (model.endsWith(':free') && /^[a-z0-9._-]+\/[a-z0-9._:-]+$/.test(model)) {
    return result(true, 'explicit OpenRouter free model variant');
  }
  return result(false, model ? 'model is not independently proven free' : 'model is not configured');
}

export function isApprovedProviderEndpoint(provider: string, endpoint?: string): boolean {
  if (provider.toLowerCase() !== 'openrouter') return !endpoint;
  return !endpoint || endpoint === OPENROUTER_ENDPOINT;
}
