import type { KaylaPageContext, KaylaConversationMessage } from '../../data/kayla/types';
import { getKaylaConfig, type KaylaConfig } from './config';

export interface ValidatedChatRequest { message: string; history: KaylaConversationMessage[]; context?: KaylaPageContext; }
export interface ValidationError { field: string; message: string; }
const ROOT = new Set(['message', 'history', 'context']);
const HISTORY = new Set(['role', 'content']);
const CONTEXT = new Set(['route', 'pageType', 'entity']);
const ROLES = new Set(['user', 'assistant']);
const PRIVILEGED = new Set(['model', 'provider', 'apiKey', 'api_key', 'endpoint', 'systemPrompt', 'system_prompt', 'pricingMode', 'authorization']);
/** Site-relative path, no whitespace or control characters. */
const SAFE_ROUTE = /^\/[A-Za-z0-9\-._~/]{0,255}$/;
/** Project and GEM identifiers are simple slugs. */
const SAFE_ENTITY = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

function objectDepth(value: unknown, depth = 0): number {
  if (value === null || typeof value !== 'object') return depth;
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  return children.reduce((max, child) => Math.max(max, objectDepth(child, depth + 1)), depth + 1);
}
function invalidUnicode(value: string): boolean { return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value); }

export function validateChatRequest(body: unknown, config: KaylaConfig = getKaylaConfig()): { valid: true; data: ValidatedChatRequest } | { valid: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { valid: false, errors: [{ field: 'body', message: 'Request body must be an object' }] };
  if (objectDepth(body) > config.maxObjectDepth) return { valid: false, errors: [{ field: 'body', message: 'Request structure is too deeply nested' }] };
  let payload: string;
  try { payload = JSON.stringify(body); } catch { return { valid: false, errors: [{ field: 'body', message: 'Request body is not serializable' }] }; }
  if (new TextEncoder().encode(payload).byteLength > config.maxPayloadBytes) return { valid: false, errors: [{ field: 'body', message: 'Payload too large' }] };

  const req = body as Record<string, unknown>;
  for (const field of Object.keys(req)) if (!ROOT.has(field)) errors.push({ field, message: PRIVILEGED.has(field) ? 'Privileged configuration is server-controlled' : 'Unknown field is not allowed' });
  if (typeof req.message !== 'string') errors.push({ field: 'message', message: 'Message is required and must be a string' });
  else if (!req.message.trim()) errors.push({ field: 'message', message: 'Message cannot be empty' });
  else if (req.message.length > config.maxMessageLength) errors.push({ field: 'message', message: `Message exceeds maximum length of ${config.maxMessageLength} characters` });
  else if (invalidUnicode(req.message)) errors.push({ field: 'message', message: 'Message contains invalid Unicode' });

  let history: KaylaConversationMessage[] = [];
  if (req.history !== undefined) {
    if (!Array.isArray(req.history)) errors.push({ field: 'history', message: 'History must be an array' });
    else if (req.history.length > config.maxHistoryMessages) errors.push({ field: 'history', message: `History exceeds maximum of ${config.maxHistoryMessages} messages` });
    else {
      req.history.forEach((raw, index) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push({ field: `history[${index}]`, message: 'Message must be an object' }); return; }
        const msg = raw as Record<string, unknown>;
        Object.keys(msg).filter(k => !HISTORY.has(k)).forEach(k => errors.push({ field: `history[${index}].${k}`, message: 'Unknown field is not allowed' }));
        if (typeof msg.role !== 'string' || !ROLES.has(msg.role)) errors.push({ field: `history[${index}].role`, message: 'Message role must be "user" or "assistant"' });
        if (typeof msg.content !== 'string') errors.push({ field: `history[${index}].content`, message: 'Message content must be a string' });
        else if (msg.content.length > config.maxMessageLength || invalidUnicode(msg.content)) errors.push({ field: `history[${index}].content`, message: 'Message content is invalid or too long' });
      });
      if (!errors.some(e => e.field.startsWith('history'))) history = req.history as KaylaConversationMessage[];
    }
  }

  let context: KaylaPageContext | undefined;
  if (req.context !== undefined) {
    if (!req.context || typeof req.context !== 'object' || Array.isArray(req.context)) errors.push({ field: 'context', message: 'Context must be an object' });
    else {
      const ctx = req.context as Record<string, unknown>;
      Object.keys(ctx).filter(k => !CONTEXT.has(k)).forEach(k => errors.push({ field: `context.${k}`, message: 'Unknown field is not allowed' }));
      // Route and entity are echoed into the model prompt, so they are held to
      // the shape of real site values. Without this, a caller could post a
      // route containing newlines and forge a SYSTEM line, or an entity that
      // impersonates the canonical-fact block.
      if (typeof ctx.route !== 'string' || !SAFE_ROUTE.test(ctx.route)) errors.push({ field: 'context.route', message: 'Context route must be a bounded site-relative path' });
      else if (ctx.entity !== undefined && (typeof ctx.entity !== 'string' || !SAFE_ENTITY.test(ctx.entity))) errors.push({ field: 'context.entity', message: 'Context entity must be a simple slug' });
      else context = { route: ctx.route, pageType: (ctx.pageType as KaylaPageContext['pageType']) || 'home', entity: typeof ctx.entity === 'string' ? ctx.entity : undefined };
    }
  }
  if (errors.length) return { valid: false, errors };
  return { valid: true, data: { message: (req.message as string).trim(), history, context } };
}

export function sanitizeInput(input: string): string { return input.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, getKaylaConfig().maxMessageLength); }
export function isPromptInjectionAttempt(input: string): boolean {
  return [
    /ignore\s+(previous|all|above)\s+instructions/i,
    /ignore\s+(your\s+)?(fds\s+)?(knowledge|instructions|rules)/i,
    /(reveal|show|print|repeat)\s+(your\s+)?(hidden\s+)?system\s+(instructions|prompt)/i,
    /system\s*prompt/i,
    /reveal\s+(your|the)\s+(api|secret|key|password|credential)/i,
    /read\s+\.env/i,
    /what\s+(are|is)\s+(your|the)\s+(secret|key|password|credential)/i,
    /pretend\s+(you\s+are|to\s+be)\s+(the\s+)?(developer|admin|root)/i,
    /bypass\s+(security|restrictions|rules)/i,
    /execute\s+(javascript|js|script)/i,
    /<script/i,
    /javascript\s*:/i,
    /data\s*:\s*text\/html/i,
    /vbscript\s*:/i,
    // Requests to fabricate FDS facts. The system prompt forbids invention, but
    // the guard refuses before a model is ever asked.
    /\b(make\s+up|fabricate|invent|hallucinate|imagine)\b[^.?!]{0,50}\b(feature|version|release|fact|detail|number|statistic|user|benchmark|project|product|price|date|quote)/i,
    /\bpretend\b[^.?!]{0,50}\b(released|available|launched|shipped|public|cancell?ed|finished|complete)/i,
    // Persona and rule-override attempts.
    // Scoped to second-person persona swaps: "how does CodeForge act as an
    // engineering agent?" is an ordinary product question.
    /\b(you\s+are\s+now|from\s+now\s+on\s+you|you\s+must\s+now)\b/i,
    /\b(you\s+(should|must|will)\s+)?(act|behave|respond|roleplay)\s+as\s+(a|an|the)?\s*(unrestricted|jailbroken|uncensored|different|another|dan|developer|admin|root|god)\b/i,
    /\b(dev\s?mode|developer\s+mode|jailbreak|dan\s+mode|god\s+mode|unrestricted\s+mode)\b/i,
    /\b(disable|turn\s+off|forget|drop|override|remove)\b[^.?!]{0,30}\b(rules?|restrictions?|guidelines?|instructions?|safety|filters?|guardrails?)/i,
    // Attempts to extract configuration under another name.
    /\b(hidden|secret|internal|underlying|original)\s+(instructions?|prompt|rules?|configuration|directives?)/i
  ].some(pattern => pattern.test(input));
}
