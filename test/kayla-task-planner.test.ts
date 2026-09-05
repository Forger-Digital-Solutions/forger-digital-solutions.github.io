import { describe, it, expect } from 'vitest';
import { generateTaskPlan, buildTaskPlan } from '../src/lib/kayla/task-planner';
import { classifyVisitorGoal } from '../src/data/kayla/goals';
import { ALLOWED_ACTION_TYPES, FORBIDDEN_ACTION_TYPES } from '../src/lib/kayla/action-validator';

describe('Kayla Task Planner (Phase 11)', () => {
  it('generates a complete, inspectable task plan with required fields', () => {
    const match = classifyVisitorGoal('Where can I download CodeForge?');
    const plan = generateTaskPlan('Where can I download CodeForge?', match);

    expect(plan.goal).toBe('DOWNLOAD_SOFTWARE');
    expect(plan.entities).toContain('codeforge');
    expect(plan.requiredFacts.length).toBeGreaterThan(0);
    expect(plan.recommendedSources.length).toBeGreaterThan(0);
    expect(plan.recommendedActions.length).toBeGreaterThan(0);
    expect(plan.guidanceSteps.length).toBeGreaterThan(0);
    expect(plan.reason).toBeTruthy();
  });

  it('bounds recommended actions to at most 3 actions across all plans', () => {
    const queries = [
      'Where should I start?',
      'Show me all the projects',
      'What can I use right now?',
      'I am a developer, what tools do you have for me?',
      'What are your AI research projects?',
      'How does CodeForge compare to GEMS?',
      'What is the current status of FarmStand Finder?',
      'Where can I download CodeForge?',
      'Where are the release notes for CodeForge?',
      'What is the GEMS project?',
      'Do you have any community or local projects?',
      'How can I support Forger Digital Solutions?',
      'Can I donate old hardware or servers to FDS?',
      'Where can I follow FDS online?',
      'Who founded Forger Digital Solutions and what is your mission?',
      'What technology stack and architectures do you use?',
      'Tell me about the homelab infrastructure'
    ];

    for (const q of queries) {
      const plan = buildTaskPlan(q);
      expect(plan.recommendedActions.length, `Too many actions for "${q}"`).toBeLessThanOrEqual(3);
      for (const a of plan.recommendedActions) {
        expect(ALLOWED_ACTION_TYPES.has(a.type), `Unapproved action type ${a.type}`).toBe(true);
        expect(FORBIDDEN_ACTION_TYPES.has(a.type), `Forbidden action type ${a.type}`).toBe(false);
      }
    }
  });

  it('detects and corrects false purchase/subscription premises deterministically', () => {
    const plan = buildTaskPlan('How much does a CodeForge subscription cost and how do I buy it?');
    expect(plan.isFalsePremise).toBe(true);
    expect(plan.providerNeeded).toBe(false);
    expect(plan.requiredFacts).toContain('CodeForge is completely free and open source');
    expect(plan.reason).toContain('purchase premise');
    expect(plan.recommendedActions.some(a => a.href === '/forged')).toBe(true);
  });

  it('resolves AI download conflicts with explicit tradeoff guidance', () => {
    const plan = buildTaskPlan('Where can I download the GEMS AI model binary right now?');
    expect(plan.goal).toBe('FIND_RELEASED_SOFTWARE');
    expect(plan.tradeoffExplanation).toBeDefined();
    expect(plan.tradeoffExplanation).toContain('GEMS');
    expect(plan.requiredFacts).toContain('GEMS has no public downloads');
    expect(plan.recommendedActions.some(a => a.href === '/forged')).toBe(true);
    expect(plan.recommendedActions.some(a => a.href === '/projects/gems-training-grounds')).toBe(true);
  });

  it('provides multi-step guidance with sequential steps for complex goals', () => {
    const devPlan = buildTaskPlan('I am a developer, what tools do you have for me?');
    expect(devPlan.guidanceSteps.length).toBeGreaterThanOrEqual(2);
    expect(devPlan.guidanceSteps[0]).toContain('CodeForge');

    const hardwarePlan = buildTaskPlan('How do I donate old servers or GPUs?');
    expect(hardwarePlan.guidanceSteps.length).toBeGreaterThanOrEqual(2);
    expect(hardwarePlan.guidanceSteps.some(s => s.toLowerCase().includes('hardware') || s.toLowerCase().includes('email'))).toBe(true);
  });
});
