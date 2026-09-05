import type { KaylaSafeAction } from '../../data/kayla/types';
import { validateSafeAction, ALLOWED_ACTION_TYPES, FORBIDDEN_ACTION_TYPES } from './action-validator';

export { ALLOWED_ACTION_TYPES, FORBIDDEN_ACTION_TYPES, validateSafeAction };

export function isActionAllowed(action: unknown): action is KaylaSafeAction {
  return validateSafeAction(action).valid;
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
