import type { KaylaSafeAction } from '../../data/kayla/types';

const ALLOWED_ACTIONS = new Set<string>([
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

export function isActionAllowed(action: unknown): action is KaylaSafeAction {
  if (!action || typeof action !== 'object') return false;
  const a = action as Record<string, unknown>;
  if (typeof a.type !== 'string') return false;
  if (!ALLOWED_ACTIONS.has(a.type)) return false;
  if (a.type === 'OPEN_PAGE' || a.type === 'OPEN_APP' || a.type === 'OPEN_DOWNLOAD' || a.type === 'OPEN_GITHUB' || a.type === 'OPEN_FORGED' || a.type === 'OPEN_CONTACT' || a.type === 'OPEN_DONATE') {
    if (typeof a.href !== 'string') return false;
    if (/\b(javascript|data|vbscript|file):/i.test(a.href)) return false;
  }
  return true;
}

/**
 * The place an action actually sends a visitor. SHOW_APPS and SHOW_ROADMAP
 * carry no href of their own (see actions.ts's executeAction), so the type
 * itself is their destination.
 */
function actionDestinationKey(action: KaylaSafeAction): string {
  return `${action.type}:${action.href || ''}`.toLowerCase();
}

/**
 * An entity's canonical action set is hand-authored per answer, but a
 * comparison or list answer can combine more than one entity's actions into
 * one response — "View CodeForge" and "View official release" pointing at the
 * same project page is a wasted second button, not a second option.
 */
export function dedupeActions(actions?: KaylaSafeAction[]): KaylaSafeAction[] | undefined {
  if (!actions?.length) return actions;
  const seen = new Set<string>();
  const deduped: KaylaSafeAction[] = [];
  for (const action of actions) {
    const key = actionDestinationKey(action);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(action);
  }
  return deduped;
}

export function executeAction(action: KaylaSafeAction): void {
  switch (action.type) {
    case 'OPEN_PAGE':
    case 'OPEN_APP':
    case 'OPEN_FORGED':
    case 'OPEN_DONATE':
      if (action.href) {
        window.location.href = action.href;
      }
      break;
    case 'OPEN_DOWNLOAD':
    case 'OPEN_GITHUB':
    case 'OPEN_CONTACT':
      if (action.href) {
        window.open(action.href, '_blank', 'noopener,noreferrer');
      }
      break;
    case 'SHOW_APPS':
      window.location.href = '/projects';
      break;
    case 'SHOW_ROADMAP':
      window.location.href = '/';
      break;
  }
}
