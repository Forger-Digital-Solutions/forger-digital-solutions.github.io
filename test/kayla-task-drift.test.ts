import { describe, it, expect } from 'vitest';
import { runDriftCheck } from '../src/data/kayla/drift-detector';
import { generateTaskPlan } from '../src/lib/kayla/task-planner';
import { classifyVisitorGoal } from '../src/data/kayla/goals';
import { CANONICAL_INTERNAL_ROUTES } from '../src/data/kayla/canonical-registry';
import { validateSafeAction } from '../src/lib/kayla/action-validator';

describe('Kayla Task Planner Drift & Route Integrity (Phase 11)', () => {
  it('passes baseline knowledge drift with zero errors including Check 11', () => {
    const report = runDriftCheck();
    expect(report.passed).toBe(true);
    expect(report.errors).toHaveLength(0);
    expect(report.inventory.taskGoals).toBe(18);
  });

  it('all 17 visitor goals generate task plans with valid canonical routes and actions', () => {
    const canonicalSet = new Set(CANONICAL_INTERNAL_ROUTES);
    const goals = [
      'EXPLORE_FDS',
      'EXPLORE_PROJECTS',
      'FIND_RELEASED_SOFTWARE',
      'FIND_DEVELOPER_PROJECTS',
      'EXPLORE_AI_RESEARCH',
      'COMPARE_PROJECTS',
      'LEARN_PROJECT_STATUS',
      'DOWNLOAD_SOFTWARE',
      'VIEW_RELEASE',
      'LEARN_GEMS',
      'FIND_COMMUNITY_PROJECT',
      'SUPPORT_FDS',
      'DONATE_HARDWARE',
      'FOLLOW_FDS',
      'LEARN_ABOUT_FDS',
      'FIND_TECHNOLOGY_INFO',
      'FIND_LAB_INFO'
    ];

    for (const goal of goals) {
      const match = {
        primaryGoal: goal as any,
        entities: ['codeforge'],
        confidence: 'high' as const,
        isMultiGoal: false,
        isTopicShift: false,
        reason: 'Test synthetic match'
      };
      const plan = generateTaskPlan('test query', match);
      expect(plan.recommendedActions.length, `Goal ${goal} has no recommended actions`).toBeGreaterThan(0);

      for (const action of plan.recommendedActions) {
        if (action.href && action.href.startsWith('/')) {
          const path = action.href.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
          expect(canonicalSet.has(path as any), `Goal ${goal} action route ${action.href} is not canonical`).toBe(true);
        }
      }
    }
  });

  it('mutating a task plan route triggers stale route validation error in action validator', () => {
    const match = classifyVisitorGoal('Where can I download CodeForge?');
    const plan = generateTaskPlan('Where can I download CodeForge?', match);

    // Mutate an action route to an unlisted route
    const mutatedActions = plan.recommendedActions.map(a => ({
      ...a,
      href: '/bogus-stale-route'
    }));

    for (const action of mutatedActions) {
      const val = validateSafeAction(action, { strictCanonical: true });
      expect(val.valid).toBe(false);
      expect(val.violations.some((v: string) => v.includes('is not a canonical internal route'))).toBe(true);
    }
  });

  it('mutating internal routes triggers TASK_PLANNER_STALE_ROUTE in drift check', () => {
    // Exclude '/forged' from internal routes to simulate a removed route
    const reducedRoutes = CANONICAL_INTERNAL_ROUTES.filter(r => r !== '/forged');
    const mutatedReport = runDriftCheck({ internalRoutes: reducedRoutes });

    expect(mutatedReport.passed).toBe(false);
    expect(mutatedReport.errors.some(e => e.code === 'TASK_PLANNER_STALE_ROUTE')).toBe(true);
  });
});
