#!/usr/bin/env node
/**
 * Kayla Copilot Task-Oriented Evaluation (Phase 11).
 *
 * Evaluates:
 * 1. Visitor Goal Classification: tests against test/kayla/visitor-goals.json
 *    across all 17 active goals + UNKNOWN, including casual questions, typos,
 *    anaphora resolution, and page-aware context.
 * 2. Task Plan Generation & Action Safety: tests against test/kayla/task-eval-cases.json
 *    proving:
 *    - Accurate goal and entity resolution
 *    - Bounded task plan generation (max 3 actions)
 *    - Zero forbidden actions (SEND_PAYMENT, SUBMIT_FORM, DOWNLOAD_AND_RUN, etc.)
 *    - Canonical internal destinations and secure external link verification
 *
 * Usage:
 *   node scripts/kayla-task-eval.mjs            # summary report
 *   node scripts/kayla-task-eval.mjs --verbose  # per-case breakdown
 *   node scripts/kayla-task-eval.mjs --json     # machine-readable output
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createServer } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const verbose = process.argv.includes('--verbose');
const asJson = process.argv.includes('--json');

const vite = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'silent'
});

try {
  const { classifyVisitorGoal } = await vite.ssrLoadModule('/src/data/kayla/goals.ts');
  const { generateTaskPlan } = await vite.ssrLoadModule('/src/lib/kayla/task-planner.ts');
  const { validateSafeAction, ALLOWED_ACTION_TYPES, FORBIDDEN_ACTION_TYPES } = await vite.ssrLoadModule('/src/lib/kayla/action-validator.ts');
  const { handleKaylaChat } = await vite.ssrLoadModule('/src/lib/kayla/handler.ts');

  // 1. Evaluate Visitor Goals
  const visitorGoalsData = JSON.parse(
    fs.readFileSync(path.join(root, 'test/kayla/visitor-goals.json'), 'utf-8')
  );
  const goalCases = visitorGoalsData.cases;
  const goalResults = [];

  for (const c of goalCases) {
    const context = c.context || { route: '/', pageType: 'home' };
    const history = c.history || [];
    const classification = classifyVisitorGoal(c.question, context, history);
    const passed = classification.primaryGoal === c.expectedGoal;
    goalResults.push({
      id: c.id,
      question: c.question,
      expectedGoal: c.expectedGoal,
      actualGoal: classification.primaryGoal,
      category: c.category,
      passed
    });
  }

  const goalPassedCount = goalResults.filter(r => r.passed).length;
  const goalTotalCount = goalResults.length;

  // 2. Evaluate Task Plans and Action Safety
  const taskCasesData = JSON.parse(
    fs.readFileSync(path.join(root, 'test/kayla/task-eval-cases.json'), 'utf-8')
  );
  const taskCases = taskCasesData.cases;
  const taskResults = [];

  for (const tc of taskCases) {
    const context = tc.context || { route: '/', pageType: 'home' };
    const history = tc.history || [];

    let reportedDiag = null;
    const endpointConfig = {
      providerConfig: { provider: 'none' },
      kaylaConfig: { aiEnabled: false },
      onDiagnostics: (d) => { reportedDiag = d; }
    };

    // Run full local handler (deterministic + task planner)
    const { status, response } = await handleKaylaChat(
      { message: tc.question, context, history },
      endpointConfig
    );

    const goalMatch = reportedDiag?.goal === tc.expectedGoal;
    const actions = response?.actions || [];
    const actionCountValid = actions.length <= 3;

    // Verify all returned actions pass safe action validator
    const allActionsSafe = actions.every(a => {
      const val = validateSafeAction(a, { strictCanonical: true });
      return val.valid;
    });

    // Check no forbidden action types are present
    let forbiddenViolations = 0;
    for (const a of actions) {
      if (FORBIDDEN_ACTION_TYPES.has(a.type)) {
        forbiddenViolations += 1;
      }
      if (tc.forbiddenActionTypes && tc.forbiddenActionTypes.includes(a.type)) {
        forbiddenViolations += 1;
      }
      if (!ALLOWED_ACTION_TYPES.has(a.type)) {
        forbiddenViolations += 1;
      }
    }

    // Check primary route if specified
    let primaryRouteMatch = true;
    if (tc.expectedPrimaryRoute && actions.length > 0) {
      primaryRouteMatch = actions.some(a => a.href === tc.expectedPrimaryRoute || (a.href && a.href.startsWith(tc.expectedPrimaryRoute)));
    }

    // Check plan expectation
    let planExpectationMatch = true;
    if (tc.expectPlan === true) {
      planExpectationMatch = actions.length > 0 || tc.expectedGoal === 'UNKNOWN';
    }

    const passed = goalMatch && actionCountValid && allActionsSafe && (forbiddenViolations === 0) && primaryRouteMatch;

    taskResults.push({
      id: tc.id,
      question: tc.question,
      expectedGoal: tc.expectedGoal,
      actualGoal: reportedDiag?.goal,
      actionCount: actions.length,
      actions: actions.map(a => ({ type: a.type, label: a.label, href: a.href })),
      forbiddenViolations,
      allActionsSafe,
      primaryRouteMatch,
      passed
    });
  }

  const taskPassedCount = taskResults.filter(r => r.passed).length;
  const taskTotalCount = taskResults.length;

  const allPassed = goalPassedCount === goalTotalCount && taskPassedCount === taskTotalCount;

  const summary = {
    goals: {
      total: goalTotalCount,
      passed: goalPassedCount,
      accuracyPct: Number(((goalPassedCount / goalTotalCount) * 100).toFixed(1))
    },
    tasks: {
      total: taskTotalCount,
      passed: taskPassedCount,
      accuracyPct: Number(((taskPassedCount / taskTotalCount) * 100).toFixed(1)),
      zeroForbiddenActions: taskResults.every(r => r.forbiddenViolations === 0),
      boundedActionsPass: taskResults.every(r => r.actionCount <= 3)
    },
    overallPassed: allPassed
  };

  if (asJson) {
    console.log(JSON.stringify({ summary, goalResults, taskResults }, null, 2));
  } else {
    console.log('\nKAYLA TASK-ORIENTED SITE AGENT EVALUATION (Phase 11)');
    console.log('='.repeat(76));
    console.log(`Goal Classification Cases: ${goalPassedCount} / ${goalTotalCount} (${summary.goals.accuracyPct}%)`);
    console.log(`Task Plan & Safety Cases:   ${taskPassedCount} / ${taskTotalCount} (${summary.tasks.accuracyPct}%)`);
    console.log(`Zero Forbidden Actions:     ${summary.tasks.zeroForbiddenActions ? 'PASS (100% safe)' : 'FAIL'}`);
    console.log(`Bounded Action Limits (<=3): ${summary.tasks.boundedActionsPass ? 'PASS' : 'FAIL'}`);
    console.log('-'.repeat(76));

    if (verbose || !allPassed) {
      if (goalPassedCount < goalTotalCount) {
        console.log('\nFAILED GOAL CLASSIFICATIONS:');
        for (const r of goalResults.filter(r => !r.passed)) {
          console.log(`  [${r.id}] "${r.question}"`);
          console.log(`    Expected: ${r.expectedGoal}, Actual: ${r.actualGoal}`);
        }
      }
      if (taskPassedCount < taskTotalCount) {
        console.log('\nFAILED TASK PLAN / SAFETY CASES:');
        for (const r of taskResults.filter(r => !r.passed)) {
          console.log(`  [${r.id}] "${r.question}"`);
          console.log(`    Expected Goal: ${r.expectedGoal}, Actual: ${r.actualGoal}`);
          console.log(`    Actions: ${JSON.stringify(r.actions)}`);
          console.log(`    RouteMatch: ${r.primaryRouteMatch}, Safe: ${r.allActionsSafe}, Violations: ${r.forbiddenViolations}`);
        }
      }
    }

    console.log(`Overall Result: ${allPassed ? 'ALL PASS' : 'FAILURES DETECTED'}`);
    console.log('='.repeat(76));
  }

  process.exit(allPassed ? 0 : 1);
} finally {
  await vite.close();
}
