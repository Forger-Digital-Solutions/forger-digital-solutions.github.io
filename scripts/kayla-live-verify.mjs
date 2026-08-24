import process from 'node:process';
const base = (process.argv[2] || process.env.KAYLA_LIVE_API_URL || '').replace(/\/+$/, '');
const origin = process.env.KAYLA_VERIFY_ORIGIN || 'https://forger-digital-solutions.github.io';
if (!base) { console.error('Set KAYLA_LIVE_API_URL or pass the workers.dev base URL.'); process.exit(1); }
const health = await fetch(`${base}/api/kayla/health`, { headers: { Origin: origin } });
if (!health.ok) throw new Error(`Health failed with HTTP ${health.status}`);
const healthText = await health.text();
if (/api[_-]?key|rate.limit.salt|sk-or-/i.test(healthText)) throw new Error('Health response contains a forbidden secret-like field');
const chat = await fetch(`${base}/api/kayla/chat?stream=true`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'What is Forger Digital Solutions?', history: [], context: { route: '/', pageType: 'home' } }) });
if (!chat.ok || !chat.headers.get('content-type')?.includes('application/x-ndjson')) throw new Error(`Chat streaming failed with HTTP ${chat.status}`);
const body = await chat.text();
if (!body.includes('done')) throw new Error('Chat stream did not complete');
const hostile = await fetch(`${base}/api/kayla/health`, { headers: { Origin: 'https://hostile.invalid' } });
if (hostile.status !== 403) throw new Error('Hostile CORS origin was not blocked');
console.log('Kayla live verification: PASS (health, streaming chat, hostile CORS block).');
