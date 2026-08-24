import { isActionAllowed, executeAction } from '../lib/kayla/actions';
import type { KaylaSafeAction, KaylaPageContext } from '../data/kayla/types';
import { getPageType, getEntity } from '../lib/kayla/context';

interface KaylaMessage {
  role: 'user' | 'kayla';
  text: string;
  actions?: KaylaSafeAction[];
}

type KaylaMode = 'ai' | 'local' | 'unavailable';

let messages: KaylaMessage[] = [];
let isOpen = false;
let isProcessing = false;
let abortController: AbortController | null = null;

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

function addMessage(role: 'user' | 'kayla', text: string, actions?: KaylaSafeAction[]): void {
  messages.push({ role, text, actions });
  renderMessages();
  scrollToBottom();
}

function renderMessages(): void {
  const c = conversation();
  if (!c) return;
  c.innerHTML = '';
  for (const msg of messages) {
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

    c.appendChild(bubble);
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

function getStartersForContext(): string[] {
  const ctx = getPageContext();
  const starters: Record<string, string[]> = {
    home: [
      'What is FDS?',
      'Show me all the apps.',
      "What's available now?",
      "What's coming next?"
    ],
    forged: [
      "What's available?",
      'Which app should I try?',
      'Show me downloads.'
    ],
    projects: [
      'Which FDS app should I use?',
      'What is GEMS?',
      'What is KyraBlox?'
    ]
  };

  const pageStarters = starters[ctx.pageType] || starters.home;

  if (ctx.entity) {
    const appStarters: Record<string, string[]> = {
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

  addMessage('user', query);
  setProcessing(true);

  const inp = input();
  if (inp) inp.value = '';

  const starters = starterPrompts();
  if (starters) (starters as HTMLElement).style.display = 'none';

  abortController = new AbortController();

  try {
    const response = await fetch(`${API_ENDPOINTS.chat}?stream=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        history: getConversationHistory(),
        context: getPageContext()
      }),
      signal: abortController.signal
    });

    if (!response.ok) {
      throw new Error(response.status === 429 ? 'RATE_LIMITED' : `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let streamingText = '';
    let streamingActions: KaylaSafeAction[] | undefined;
    let responseMode: KaylaMode = 'local';

    const placeholder = addStreamingMessage();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const chunk = JSON.parse(trimmed) as { type?: string; content?: string; error?: string; errorType?: string; mode?: KaylaMode; actions?: KaylaSafeAction[]; done?: boolean };

          if (chunk.error) {
            updateStreamingMessage(placeholder, `Kayla's conversational AI is temporarily unavailable, but I can still help with FDS knowledge.`);
            break;
          }

          if (chunk.mode) {
            responseMode = chunk.mode;
            updateStatus(responseMode);
          }

          if (chunk.actions) {
            streamingActions = chunk.actions.filter(a => isActionAllowed(a));
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

    finalizeStreamingMessage(placeholder, streamingText, streamingActions, responseMode);
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      addMessage('kayla', 'Response cancelled.');
    } else if ((error as Error).message === 'RATE_LIMITED') {
      updateStatus('local');
      addMessage('kayla', 'Kayla has received several requests recently. Please try again a little later.');
    } else {
      updateStatus('unavailable');
      addMessage('kayla', "Kayla's live service is temporarily unavailable. Please try again later.");
    }
  } finally {
    setProcessing(false);
    abortController = null;
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

function finalizeStreamingMessage(bubble: HTMLDivElement | null, text: string, actions: KaylaSafeAction[] | undefined, mode: KaylaMode): void {
  updateStatus(mode);
  if (!bubble) {
    if (text) {
      addMessage('kayla', text, actions);
    }
    return;
  }

  bubble.classList.remove('kayla-msg--streaming');
  const textEl = bubble.querySelector('.kayla-msg__text');
  if (textEl) textEl.textContent = text || "I couldn't find that in the current public FDS knowledge base.";

  messages.push({ role: 'kayla', text: text || "I couldn't find that in the current public FDS knowledge base.", actions });
}

function toggle(): void {
  const p = panel();
  const l = launcherBtn();
  if (!p || !l) return;
  isOpen = !isOpen;
  if (isOpen) {
    p.hidden = false;
    requestAnimationFrame(() => {
      p.classList.add('kayla-panel--open');
      l.classList.add('kayla-launcher--hidden');
      l.setAttribute('aria-expanded', 'true');
      setTimeout(() => {
        const inp = input();
        if (inp) inp.focus();
      }, 100);
    });
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
      const focusable = [...p.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden);
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
