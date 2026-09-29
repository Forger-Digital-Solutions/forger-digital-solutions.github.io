#!/usr/bin/env node
/**
 * Kayla candidate-route probe (Phase 3/4 reconnaissance).
 *
 * Sends a handful of tiny requests to each configured free route and reports
 * only: success/failure class, HTTP status, latency, first-token latency, and
 * the returned text (truncated). NEVER prints keys or headers.
 *
 *   node scripts/kayla-probe.mjs            # all configured routes, all probes
 *   node scripts/kayla-probe.mjs --quick    # one probe per configured route
 */
import process from 'node:process';

const quick = process.argv.includes('--quick');

const ROUTES = [
  {
    id: 'groq/qwen3.8-27b',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
    model: 'qwen/qwen3.8-27b'
  },
  {
    id: 'openrouter/qwen3.8-27b:free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    keyEnv: 'OPENROUTER_API_KEY',
    model: 'qwen/qwen3.8-27b:free'
  },
  {
    id: 'openrouter/free (router)',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    keyEnv: 'OPENROUTER_API_KEY',
    model: 'openrouter/free'
  },
  {
    id: 'gemini/2.5-flash-lite (openai-compat)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    keyEnv: 'GEMINI_API_KEY',
    model: 'gemini-2.5-flash-lite'
  },
  {
    id: 'gemini/2.5-flash (openai-compat)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    keyEnv: 'GEMINI_API_KEY',
    model: 'gemini-2.5-flash'
  }
];

const PROBES = [
  { name: 'general-chat', maxTokens: 120, messages: [
    { role: 'system', content: 'You are a helpful assistant. Answer concisely.' },
    { role: 'user', content: 'In one sentence, what is recursion?' }
  ]},
  { name: 'coding', maxTokens: 220, messages: [
    { role: 'system', content: 'You are a helpful assistant. Answer concisely.' },
    { role: 'user', content: 'Write a JavaScript debounce function. Code only.' }
  ]},
  { name: 'grounded-fds', maxTokens: 160, messages: [
    { role: 'system', content: 'You are Kayla, FDS\'s assistant. Supplied FDS facts outrank prior knowledge.' },
    { role: 'user', content: 'FDS KNOWLEDGE:\n[1] CodeForge\nReleased free-first autonomous software-engineering platform for Windows.\n\nVisitor question: What is CodeForge? One sentence.' }
  ]},
  { name: 'streaming', maxTokens: 80, stream: true, messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Count from 1 to 5, one number per line.' }
  ]}
];

async function probe(route, p) {
  const apiKey = process.env[route.keyEnv];
  if (!apiKey) return { route: route.id, probe: p.name, skipped: `no ${route.keyEnv}` };
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(route.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://forgerdigitalsolutions.com',
        'X-Title': 'Kayla route probe'
      },
      body: JSON.stringify({
        model: route.model,
        messages: p.messages,
        max_tokens: p.maxTokens,
        temperature: 0.3,
        ...(p.stream ? { stream: true } : {})
      }),
      signal: controller.signal
    });
    const status = response.status;
    if (!response.ok) {
      const errText = (await response.text().catch(() => '')).slice(0, 200);
      return { route: route.id, probe: p.name, ok: false, status, ms: Date.now() - started, error: errText.replace(/sk-[A-Za-z0-9_-]+/g, '<redacted>') };
    }
    if (p.stream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let firstTokenMs = null, chunks = 0, text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
          try {
            const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
            if (delta) { if (firstTokenMs === null) firstTokenMs = Date.now() - started; chunks++; text += delta; }
          } catch { /* skip malformed */ }
        }
      }
      return { route: route.id, probe: p.name, ok: true, status, ms: Date.now() - started, firstTokenMs, chunks, text: text.replace(/\s+/g, ' ').slice(0, 120) };
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? '';
    const resolved = typeof data.model === 'string' ? data.model : undefined;
    const usage = data.usage ? `in=${data.usage.prompt_tokens} out=${data.usage.completion_tokens}` : '';
    return { route: route.id, probe: p.name, ok: true, status, ms: Date.now() - started, resolved, usage, text: String(text).replace(/\s+/g, ' ').slice(0, 200) };
  } catch (error) {
    return { route: route.id, probe: p.name, ok: false, ms: Date.now() - started, error: `FETCH ${error.name === 'AbortError' ? 'TIMEOUT' : error.message}` };
  } finally {
    clearTimeout(timer);
  }
}

const probes = quick ? PROBES.slice(0, 1) : PROBES;
console.log('KAYLA FREE-ROUTE PROBES (no secrets printed)');
for (const route of ROUTES) {
  for (const p of probes) {
    const r = await probe(route, p);
    const status = r.skipped ? `SKIP ${r.skipped}` : r.ok ? `OK ${r.ms}ms${r.firstTokenMs ? ` ttft=${r.firstTokenMs}ms chunks=${r.chunks}` : ''}${r.resolved ? ` resolved=${r.resolved}` : ''}${r.usage ? ` ${r.usage}` : ''}` : `FAIL status=${r.status ?? '-'} ${r.ms}ms ${r.error}`;
    console.log(`[${route.id}] ${p.name.padEnd(12)} ${status}`);
    if (r.ok && r.text) console.log(`    -> ${r.text}`);
  }
}
