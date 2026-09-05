import { isActionAllowed, executeAction } from '../lib/kayla/actions';
import type { KaylaSafeAction, KaylaPageContext, KaylaSource } from '../data/kayla/types';
import { getPageType, getEntity } from '../lib/kayla/context';

interface KaylaMessage {
  role: 'user' | 'kayla';
  text: string;
  actions?: KaylaSafeAction[];
  sources?: KaylaSource[];
}

/** A source link renders only when it points somewhere real: an internal
 * site-relative route, or an https URL. Defense in depth alongside the
 * server-side derivation, which already never invents a source. */
export function isSourceLinkSafe(source: KaylaSource): boolean {
  if (source.route) return source.route.startsWith('/');
  if (source.url) return /^https:\/\//i.test(source.url);
  return true; // a source with neither is still a valid "internal knowledge, no link" citation
}

type KaylaMode = 'ai' | 'local' | 'unavailable';

let messages: KaylaMessage[] = [];
let isOpen = false;
let isProcessing = false;
let abortController: AbortController | null = null;

/**
 * Phase 12: stale-response guard. Every send captures its own sequence number;
 * any completion whose number is no longer current belongs to a superseded
 * request (Stop then re-ask, or a send that raced a close) and must not touch
 * the transcript, the starters, the status badge, or the processing flag —
 * those all belong to the newer request now.
 */
let requestSeq = 0;

/**
 * Phase 12: the server only ever receives the last MAX_HISTORY turns, but the
 * browser DOM grew without limit — a long session appended bubbles forever.
 * Retain far more than the server window so no recent context is ever lost,
 * while keeping layout, scroll, and memory bounded.
 */
export const MAX_VISIBLE_MESSAGES = 50;

const MAX_HISTORY = 10;
export function buildKaylaApiEndpoints(configuredUrl: string | undefined): { chat: string; health: string } {
  const value = (configuredUrl || '').trim().replace(/\/+$/, '');
  if (!value) return { chat: '/api/kayla/chat', health: '/api/kayla/health' };
  if (value.endsWith('/api/kayla/chat')) return { chat: value, health: value.replace(/\/chat$/, '/health') };
  return { chat: `${value}/api/kayla/chat`, health: `${value}/api/kayla/health` };
}
const API_ENDPOINTS = buildKaylaApiEndpoints(import.meta.env.PUBLIC_KAYLA_API_URL);

const launcherBtn = (): HTMLButtonElement | null =>
  document.getElementById('kayla-launcher') as HTMLButtonElement | null;
const panel = (): HTMLDivElement | null =>
  document.getElementById('kayla-panel') as HTMLDivElement | null;
const conversation = (): HTMLDivElement | null =>
  document.getElementById('kayla-conversation') as HTMLDivElement | null;
const input = (): HTMLInputElement | null =>
  document.getElementById('kayla-input') as HTMLInputElement | null;
const sendBtn = (): HTMLButtonElement | null =>
  document.getElementById('kayla-send') as HTMLButtonElement | null;
const starterPrompts = (): HTMLDivElement | null =>
  document.getElementById('kayla-starters') as HTMLDivElement | null;
const statusEl = (): HTMLSpanElement | null =>
  document.querySelector('.kayla-status-text') as HTMLSpanElement | null;
const statusDot = (): HTMLSpanElement | null =>
  document.querySelector('.kayla-status-dot') as HTMLSpanElement | null;

function updateStatus(mode: KaylaMode): void {
  const text = statusEl();
  const dot = statusDot();
  if (!text || !dot) return;

  if (mode === 'ai') {
    text.textContent = 'AI Online';
    dot.style.background = '#63a8ff';
  } else if (mode === 'local') {
    text.textContent = 'Knowledge Mode';
    dot.style.background = '#f0a050';
  } else {
    text.textContent = 'Service Unavailable';
    dot.style.background = '#888';
  }
}

function scrollToBottom(): void {
  const c = conversation();
  if (c) c.scrollTop = c.scrollHeight;
}

function buildSourcesRow(sources: KaylaSource[]): HTMLDivElement | null {
  const safe = sources.filter(isSourceLinkSafe);
  if (safe.length === 0) return null;

  const row = document.createElement('div');
  row.className = 'kayla-msg__sources';

  const label = document.createElement('span');
  label.className = 'kayla-msg__sources-label';
  label.textContent = 'Sources';
  row.appendChild(label);

  for (const source of safe) {
    const href = source.route || source.url;
    if (href) {
      const link = document.createElement('a');
      link.className = 'kayla-source-link';
      link.textContent = source.label;
      link.href = href;
      if (source.url) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      row.appendChild(link);
    } else {
      // Internal knowledge with nothing to link to: cite it as text, not a link.
      const span = document.createElement('span');
      span.className = 'kayla-source-text';
      span.textContent = source.label;
      row.appendChild(span);
    }
  }

  return row;
}

function buildBubble(msg: KaylaMessage): HTMLDivElement {
  const bubble = document.createElement('div');
  bubble.className = `kayla-msg kayla-msg--${msg.role}`;

  const textEl = document.createElement('div');
  textEl.className = 'kayla-msg__text';
  textEl.textContent = msg.text;
  bubble.appendChild(textEl);

  if (msg.actions && msg.actions.length > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'kayla-msg__actions';
    for (const action of msg.actions) {
      if (!isActionAllowed(action)) continue;
      const btn = document.createElement('button');
      btn.className = 'kayla-action-btn';
      btn.textContent = action.label;
      btn.addEventListener('click', () => executeAction(action));
      actionsEl.appendChild(btn);
    }
    if (actionsEl.children.length > 0) {
      bubble.appendChild(actionsEl);
    }
  }

  if (msg.sources && msg.sources.length > 0) {
    const sourcesEl = buildSourcesRow(msg.sources);
    if (sourcesEl) bubble.appendChild(sourcesEl);
  }

  return bubble;
}

/**
 * Append one bubble rather than rebuilding the transcript. The conversation is
 * an aria-live region, so replacing its contents re-announced every previous
 * message on each new turn.
 */
function addMessage(role: 'user' | 'kayla', text: string, actions?: KaylaSafeAction[], sources?: KaylaSource[]): void {
  const msg: KaylaMessage = { role, text, actions, sources };
  messages.push(msg);
  const c = conversation();
  if (c) c.appendChild(buildBubble(msg));
  enforceTranscriptBounds();
  scrollToBottom();
}

/** Drop the oldest bubbles once the transcript exceeds its visible bound. */
function enforceTranscriptBounds(): void {
  const c = conversation();
  while (messages.length > MAX_VISIBLE_MESSAGES) {
    messages.shift();
    if (c?.firstChild) c.firstChild.remove();
  }
  // The streaming placeholder is DOM-only (it enters `messages` only on
  // finalize), so trim stray DOM nodes independently to the same bound.
  while (c && c.children.length > MAX_VISIBLE_MESSAGES + 1) {
    c.firstChild?.remove();
  }
}

function getStopButton(): HTMLButtonElement | null {
  return document.getElementById('kayla-stop') as HTMLButtonElement | null;
}

function showStopButton(): void {
  const existing = getStopButton();
  if (existing) {
    existing.style.display = 'inline-flex';
    return;
  }
  const inputRow = document.querySelector('.kayla-input-row');
  if (!inputRow) return;

  const stopBtn = document.createElement('button');
  stopBtn.id = 'kayla-stop';
  stopBtn.className = 'kayla-stop';
  stopBtn.setAttribute('type', 'button');
  stopBtn.setAttribute('aria-label', 'Stop response');
  stopBtn.textContent = 'Stop';
  stopBtn.addEventListener('click', cancelRequest);
  inputRow.appendChild(stopBtn);
}

function hideStopButton(): void {
  const stopBtn = getStopButton();
  if (stopBtn) {
    stopBtn.style.display = 'none';
  }
}

function setProcessing(processing: boolean): void {
  isProcessing = processing;
  const inp = input();
  const send = sendBtn();
  if (inp) inp.disabled = processing;
  if (send) send.disabled = processing;

  if (processing) {
    showStopButton();
  } else {
    hideStopButton();
  }
}

function cancelRequest(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  setProcessing(false);
}

function getConversationHistory(): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .slice(-MAX_HISTORY)
    .filter(m => m.role === 'user' || m.role === 'kayla')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text
    }));
}

function getPageContext(): KaylaPageContext {
  const pathname = window.location.pathname;
  return {
    route: pathname,
    pageType: getPageType(pathname) as KaylaPageContext['pageType'],
    entity: getEntity(pathname)
  };
}

export function getStartersForContext(): string[] {
  const ctx = getPageContext();
  const starters: Record<string, string[]> = {
    home: [
      'Where should I start?',
      'What can I use now?',
      'Explore the projects',
      'Learn about GEMS',
      'Try CodeForge',
      'Support FDS'
    ],
    forged: [
      'What can I use now?',
      'Tell me about CodeForge',
      'Where do I download releases?',
      'Support FDS'
    ],
    projects: [
      'Which FDS project should I explore?',
      'Tell me about CodeForge',
      'What is GEMS?',
      'Where do I start?'
    ],
    support: [
      'How can I support FDS?',
      'What hardware can I donate?',
      'How do I sponsor FDS on GitHub?',
      'Explore the projects'
    ],
    downloads: [
      'What can I download right now?',
      'Where do I get CodeForge?',
      'How do I install CodeForge?',
      'Support FDS'
    ]
  };

  const pageStarters = starters[ctx.pageType] || starters.home;

  if (ctx.entity) {
    const appStarters: Record<string, string[]> = {
      'codeforge': [
        'How do I install CodeForge?',
        'Where do I download CodeForge?',
        'How does CodeForge compare to GEMS?',
        'What version is CodeForge?'
      ],
      'forgerems': [
        'What does ForgerEMS do?',
        'Download ForgerEMS',
        'How do I install it?',
        'What version is this?'
      ],
      'gems-training-grounds': [
        'What is GEMS?',
        'What does GEMS do?',
        'How is GEMS being built?'
      ],
      'kyrablox': [
        'What is KyraBlox?',
        'What engines does it support?'
      ],
      'kayla-ai-publisher': [
        'What is Kayla AI Publisher?',
        'What can it do?'
      ],
      'we-the-people': [
        'What is We The People?',
        'Is it available?'
      ],
      'farmstand-finder': [
        'What is FarmStand Finder?',
        'How does it work?'
      ]
    };
    return appStarters[ctx.entity] || pageStarters;
  }

  return pageStarters;
}

export function getFollowUpSuggestions(lastQuery: string, actions?: KaylaSafeAction[]): string[] {
  const q = lastQuery.toLowerCase();
  if (q.includes('codeforge')) {
    return ['See the release', 'How does it compare?', 'Explore other projects'];
  }
  if (q.includes('gems') || q.includes('training grounds')) {
    return ['Is GEMS available to download?', 'Explore all projects', 'How can I support FDS?'];
  }
  if (q.includes('support') || q.includes('donate') || q.includes('contribute') || q.includes('hardware')) {
    return ['What hardware can I donate?', 'Explore active projects', 'Where should I start?'];
  }
  if (q.includes('start') || q.includes('new here') || q.includes('what is fds') || q.includes('mission')) {
    return ['What can I use now?', 'Explore the projects', 'How can I support FDS?'];
  }
  if (q.includes('download') || q.includes('release') || q.includes('use now') || q.includes('available')) {
    return ['Try CodeForge', 'Learn about GEMS', 'Where should I start?'];
  }
  if (actions && actions.length > 0) {
    const hasProjectsAction = actions.some(a => a.href === '/projects');
    if (hasProjectsAction) {
      return ['What can I use now?', 'Learn about GEMS', 'Support FDS'];
    }
    return ['See the release', 'What can I use now?', 'Explore the projects'];
  }
  return ['Where should I start?', 'What can I use now?', 'Explore the projects'];
}

function showFollowUpStarters(query: string, actions?: KaylaSafeAction[]): void {
  const starters = starterPrompts();
  if (!starters) return;
  const followUps = getFollowUpSuggestions(query, actions);
  if (!followUps || followUps.length === 0) return;
  starters.innerHTML = '';
  for (const fQuery of followUps) {
    const btn = document.createElement('button');
    btn.className = 'kayla-starter';
    btn.type = 'button';
    btn.setAttribute('data-query', fQuery);
    btn.textContent = fQuery;
    btn.addEventListener('click', () => {
      handleQuery(fQuery);
    });
    starters.appendChild(btn);
  }
  starters.style.display = 'flex';
}

function updateStarters(): void {
  const starters = starterPrompts();
  if (!starters) return;

  const contextStarters = getStartersForContext();
  starters.innerHTML = '';

  for (const query of contextStarters) {
    const btn = document.createElement('button');
    btn.className = 'kayla-starter';
    btn.type = 'button';
    btn.setAttribute('data-query', query);
    btn.textContent = query;
    btn.addEventListener('click', () => {
      if (query) handleQuery(query);
    });
    starters.appendChild(btn);
  }
}

async function handleQuery(query: string): Promise<void> {
  if (!query.trim() || isProcessing) return;

  // A previous request may still be settling after a Stop (its abort is
  // delivered asynchronously). Retire it explicitly so its late completion
  // cannot overwrite this turn, and claim the new sequence number first.
  abortController?.abort();
  abortController = null;
  const mySeq = ++requestSeq;
  const isCurrent = (): boolean => mySeq === requestSeq;

  addMessage('user', query);
  setProcessing(true);

  const inp = input();
  if (inp) inp.value = '';

  const starters = starterPrompts();
  if (starters) (starters as HTMLElement).style.display = 'none';

  const controller = new AbortController();
  abortController = controller;
  let streamingActions: KaylaSafeAction[] | undefined;

  // The placeholder is created before the network settles so a slow
  // connection still shows an explicit loading state (plus the Stop control)
  // instead of a silently disabled composer.
  const placeholder = addStreamingMessage();

  try {
    const response = await fetch(`${API_ENDPOINTS.chat}?stream=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        history: getConversationHistory(),
        context: getPageContext()
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(response.status === 429 ? 'RATE_LIMITED' : `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    let decoder = new TextDecoder();
    let buffer = '';
    let streamingText = '';
    let streamingSources: KaylaSource[] | undefined;
    let responseMode: KaylaMode = 'local';

    while (true) {
      if (!isCurrent()) {
        // A newer turn has started: stop consuming this stream so its late
        // chunks can never overwrite the newer answer, and release the reader.
        try { await reader.cancel(); } catch { /* already settled */ }
        placeholder?.remove();
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const chunk = JSON.parse(trimmed) as { type?: string; content?: string; error?: string; errorType?: string; mode?: KaylaMode; actions?: KaylaSafeAction[]; sourceLinks?: KaylaSource[]; done?: boolean; replace?: boolean };

          // The server rejected the model's answer for contradicting canonical
          // FDS data. Discard whatever streamed and show the canonical answer.
          if (chunk.replace) {
            streamingText = chunk.content || '';
            responseMode = chunk.mode || 'local';
            streamingActions = chunk.actions?.filter(a => isActionAllowed(a)) ?? streamingActions;
            streamingSources = chunk.sourceLinks ?? streamingSources;
            updateStreamingMessage(placeholder, streamingText, streamingActions);
            break;
          }

          if (chunk.error) {
            updateStreamingMessage(placeholder, chunk.errorType === 'RATE_LIMITED'
              ? 'Kayla has answered several questions from this connection recently. Please try again in a minute.'
              : `Kayla's conversational AI is temporarily unavailable, but I can still help with FDS knowledge.`);
            break;
          }

          // Track the mode for the transcript, but leave the header alone: a
          // canonical answer served without the model is not a degraded
          // service, and flipping the badge per message reads like an outage.
          if (chunk.mode) {
            responseMode = chunk.mode;
          }

          if (chunk.actions) {
            streamingActions = chunk.actions.filter(a => isActionAllowed(a));
          }

          if (chunk.sourceLinks) {
            streamingSources = chunk.sourceLinks;
          }

          if (chunk.content) {
            streamingText += chunk.content;
            updateStreamingMessage(placeholder, streamingText, streamingActions);
          }

          if (chunk.done) {
            break;
          }
        } catch {
          continue;
        }
      }
    }

    if (!isCurrent()) { placeholder?.remove(); return; }
    finalizeStreamingMessage(placeholder, streamingText, streamingActions, responseMode, streamingSources);
  } catch (error) {
    // A superseded request must stay silent: the newer turn owns the
    // transcript, the starters, the status badge, and the processing flag.
    if (!isCurrent()) { placeholder?.remove(); return; }
    // The placeholder already holds this turn's bubble: settle the error into
    // it so a failed request leaves exactly one message, not a stuck
    // "Thinking..." plus a second error bubble.
    if ((error as Error).name === 'AbortError') {
      finalizeStreamingMessage(placeholder, 'Response cancelled.', undefined, 'local', undefined);
    } else if ((error as Error).message === 'RATE_LIMITED') {
      updateStatus('local');
      finalizeStreamingMessage(placeholder, 'Kayla has received several requests recently. Please try again a little later.', undefined, 'local', undefined);
    } else {
      updateStatus('unavailable');
      finalizeStreamingMessage(placeholder, "Kayla's live service is temporarily unavailable. Please try again later.", undefined, 'unavailable', undefined);
    }
  } finally {
    if (!isCurrent()) return;
    setProcessing(false);
    if (abortController === controller) abortController = null;
    showFollowUpStarters(query, streamingActions);
    // Focus is lost when the send button is disabled mid-request; hand it back
    // so a keyboard or screen-reader user can type the next question.
    if (isOpen) input()?.focus();
  }
}

function addStreamingMessage(): HTMLDivElement | null {
  const c = conversation();
  if (!c) return null;

  const bubble = document.createElement('div');
  bubble.className = 'kayla-msg kayla-msg--kayla kayla-msg--streaming';

  const textEl = document.createElement('div');
  textEl.className = 'kayla-msg__text';
  textEl.textContent = 'Thinking...';
  bubble.appendChild(textEl);

  c.appendChild(bubble);
  scrollToBottom();
  return bubble;
}

function updateStreamingMessage(bubble: HTMLDivElement | null, text: string, actions?: KaylaSafeAction[]): void {
  if (!bubble) return;
  const textEl = bubble.querySelector('.kayla-msg__text');
  if (textEl) textEl.textContent = text;

  if (actions && actions.length > 0) {
    let actionsEl = bubble.querySelector('.kayla-msg__actions') as HTMLDivElement | null;
    if (!actionsEl) {
      actionsEl = document.createElement('div');
      actionsEl.className = 'kayla-msg__actions';
      bubble.appendChild(actionsEl);
    }
    actionsEl.innerHTML = '';
    for (const action of actions) {
      const btn = document.createElement('button');
      btn.className = 'kayla-action-btn';
      btn.textContent = action.label;
      btn.addEventListener('click', () => executeAction(action));
      actionsEl.appendChild(btn);
    }
  }

  scrollToBottom();
}

function finalizeStreamingMessage(bubble: HTMLDivElement | null, text: string, actions: KaylaSafeAction[] | undefined, mode: KaylaMode, sources?: KaylaSource[]): void {
  if (mode === 'unavailable') updateStatus(mode);
  if (!bubble) {
    if (text) {
      addMessage('kayla', text, actions, sources);
    }
    return;
  }

  bubble.classList.remove('kayla-msg--streaming');
  const textEl = bubble.querySelector('.kayla-msg__text');
  if (textEl) textEl.textContent = text || "I couldn't find that in the current public FDS knowledge base.";

  if (sources && sources.length > 0) {
    const sourcesEl = buildSourcesRow(sources);
    if (sourcesEl) bubble.appendChild(sourcesEl);
  }

  messages.push({ role: 'kayla', text: text || "I couldn't find that in the current public FDS knowledge base.", actions, sources });
  enforceTranscriptBounds();
}

function toggle(): void {
  const p = panel();
  const l = launcherBtn();
  if (!p || !l) return;
  isOpen = !isOpen;
  if (isOpen) {
    p.hidden = false;
    // Reading a layout property flushes the pre-open styles so the CSS
    // transition still animates. The open state and focus are then applied
    // synchronously: they used to sit inside requestAnimationFrame plus a
    // nested timer, so whenever rAF was throttled — a background tab, reduced
    // power — the panel stayed non-interactive and focus never entered it.
    void p.offsetWidth;
    p.classList.add('kayla-panel--open');
    l.classList.add('kayla-launcher--hidden');
    l.setAttribute('aria-expanded', 'true');
    input()?.focus();
  } else {
    p.classList.remove('kayla-panel--open');
    l.classList.remove('kayla-launcher--hidden');
    l.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!isOpen) p.hidden = true; }, 300);
  }
}

function close(): void {
  const p = panel();
  const l = launcherBtn();
  if (!p || !l) return;
  isOpen = false;
  p.classList.remove('kayla-panel--open');
  l.classList.remove('kayla-launcher--hidden');
  l.setAttribute('aria-expanded', 'false');
  l.focus();
  setTimeout(() => { if (!isOpen) p.hidden = true; }, 300);
}

async function checkAIMode(): Promise<void> {
  try {
    const response = await fetch(API_ENDPOINTS.health, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (response.ok) {
      const data = await response.json() as { aiAvailable?: boolean; mode?: string };
      if (data.aiAvailable || data.mode === 'ai-capable') {
        updateStatus('ai');
      } else {
        updateStatus('local');
      }
    } else {
      updateStatus('local');
    }
  } catch {
    updateStatus('local');
  }
}

function init(): void {
  updateStatus('local');

  const l = launcherBtn();
  const p = panel();
  if (!l || !p) return;

  l.addEventListener('click', toggle);

  p.querySelectorAll('.kayla-close').forEach((btn) => {
    btn.addEventListener('click', close);
  });

  updateStarters();

  const starters = starterPrompts();
  if (starters) {
    starters.querySelectorAll('.kayla-starter').forEach((btn) => {
      btn.addEventListener('click', () => {
        const query = btn.getAttribute('data-query');
        if (query) handleQuery(query);
      });
    });
  }

  const inp = input();
  const s = sendBtn();
  if (inp && s) {
    const send = () => handleQuery(inp.value);
    s.addEventListener('click', send);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      close();
    } else if (e.key === 'Tab' && isOpen) {
      // The starters row and the stop button are hidden with style.display,
      // not the hidden attribute, so el.hidden alone missed them: the trap
      // computed "last" as an invisible, unfocusable node (typically the
      // stop button once a message had been sent), and a real Tab press from
      // the last visible control never matched it — focus escaped the dialog
      // entirely into the rest of the page. offsetParent is null for any
      // display:none element regardless of how it was hidden.
      const focusable = [...p.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden && el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  addMessage('kayla', `Hi, I'm Kayla Copilot. I can help you learn about Forger Digital Solutions, our projects, and downloads. How can I help?`);

  checkAIMode();
}

export function initKaylaCopilot(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
