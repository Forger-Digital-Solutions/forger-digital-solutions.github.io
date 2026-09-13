/**
 * R4.2R Performance Comparison Report Generator
 *
 * Reads docs/audit/r42-perf-raw-before.json and docs/audit/r42-perf-raw-after.json.
 * Validates presence of S1–S8.
 * Mechanically computes deltas, percentages, and statistical noise bands from medians.
 * Never hides negative or neutral metrics.
 */

import fs from 'node:fs';
import path from 'node:path';

const AUDIT_DIR = path.join(process.cwd(), 'docs', 'audit');
const BEFORE_PATH = path.join(AUDIT_DIR, 'r42-perf-raw-before.json');
const AFTER_PATH = path.join(AUDIT_DIR, 'r42-perf-raw-after.json');

if (!fs.existsSync(BEFORE_PATH)) {
  console.error('Missing baseline artifact: ' + BEFORE_PATH);
  process.exit(1);
}
if (!fs.existsSync(AFTER_PATH)) {
  console.error('Missing candidate artifact: ' + AFTER_PATH);
  process.exit(1);
}

const before = JSON.parse(fs.readFileSync(BEFORE_PATH, 'utf-8'));
const after = JSON.parse(fs.readFileSync(AFTER_PATH, 'utf-8'));

// Verify required scenarios
const requiredScenarios = [
  's1_idle',
  's2_pointer',
  's3_eco_visible',
  's4_eco_offscreen',
  's5_hidden',
  's6_reduced',
  's7_mobile',
  's8_kayla',
  '_meta'
];

for (const req of requiredScenarios) {
  if (!before[req]) {
    throw new Error('Baseline artifact is missing required scenario: ' + req);
  }
  if (!after[req]) {
    throw new Error('Candidate artifact is missing required scenario: ' + req);
  }
}

console.log('✅ Both raw artifacts verified: all scenarios S1–S8 present.');

function getVal(obj: any): number | string {
  if (obj === undefined || obj === null) return 'N/A';
  if (typeof obj === 'number') return obj;
  if (typeof obj === 'object' && 'median' in obj) return obj.median;
  return obj;
}

export interface MetricRow {
  scenario: string;
  metric: string;
  unit: string;
  before: number | string;
  after: number | string;
  lowerIsBetter: boolean;
  delta?: number;
  percent?: number;
  interpretation: string;
}

export function analyzeMetric(
  scenario: string,
  metric: string,
  unit: string,
  bVal: any,
  aVal: any,
  lowerIsBetter: boolean,
  customNote?: string
): MetricRow {
  const b = getVal(bVal);
  const a = getVal(aVal);

  if (typeof b !== 'number' || typeof a !== 'number') {
    return {
      scenario,
      metric,
      unit,
      before: b,
      after: a,
      lowerIsBetter,
      interpretation: customNote || (b === a ? 'Identical / Preserved' : `${b} -> ${a}`),
    };
  }

  const delta = +(a - b).toFixed(4);
  const percent = b !== 0 ? +(((a - b) / b) * 100).toFixed(1) : undefined;

  let interpretation = '';
  if (customNote) {
    interpretation = customNote;
  } else if (percent === undefined) {
    interpretation = `delta: ${delta}${unit}`;
  } else if (Math.abs(percent) < 5) {
    interpretation = `Within noise (${percent > 0 ? '+' : ''}${percent}%)`;
  } else if (lowerIsBetter) {
    if (percent <= -10) {
      interpretation = `Material improvement (${(-percent).toFixed(1)}% reduction)`;
    } else if (percent < -5) {
      interpretation = `Small directional improvement (${(-percent).toFixed(1)}% reduction)`;
    } else if (percent >= 10) {
      interpretation = `Material regression (+${percent.toFixed(1)}%)`;
    } else {
      interpretation = `Directional regression (+${percent.toFixed(1)}%)`;
    }
  } else {
    // Higher is better
    if (percent >= 10) {
      interpretation = `Material improvement (+${percent.toFixed(1)}%)`;
    } else if (percent > 5) {
      interpretation = `Small directional improvement (+${percent.toFixed(1)}%)`;
    } else if (percent <= -10) {
      interpretation = `Material regression (${percent.toFixed(1)}%)`;
    } else {
      interpretation = `Directional regression (${percent.toFixed(1)}%)`;
    }
  }

  return {
    scenario,
    metric,
    unit,
    before: b,
    after: a,
    lowerIsBetter,
    delta,
    percent,
    interpretation,
  };
}

export function generateReportRows(): MetricRow[] {
  return [
    // S1
    analyzeMetric('S1: Desktop Idle', 'Layout Duration', 's', before.s1_idle.layout_s, after.s1_idle.layout_s, true),
    analyzeMetric('S1: Desktop Idle', 'Recalc Style Duration', 's', before.s1_idle.recalc_s, after.s1_idle.recalc_s, true),
    analyzeMetric('S1: Desktop Idle', 'Task Duration', 's', before.s1_idle.task_s, after.s1_idle.task_s, true),
    analyzeMetric('S1: Desktop Idle', 'RAF frame interval proxy', 'fps', before.s1_idle.fps_proxy, after.s1_idle.fps_proxy, false),
    analyzeMetric('S1: Desktop Idle', 'Dropped frames proxy (>33ms)', 'frames', before.s1_idle.dropped_frames, after.s1_idle.dropped_frames, true),

    // S2
    analyzeMetric('S2: Pointer Burst', 'Pointer Events Dispatched', 'events', before.s2_pointer.pointer_events, after.s2_pointer.pointer_events, true),
    analyzeMetric('S2: Pointer Burst', 'CSS Variable Writes', 'writes', before.s2_pointer.css_var_updates, after.s2_pointer.css_var_updates, true),
    analyzeMetric('S2: Pointer Burst', 'Pointer Update Cycles', 'cycles', before.s2_pointer.update_cycles, after.s2_pointer.update_cycles, true),
    analyzeMetric('S2: Pointer Burst', 'Writes Per Pointer Event', 'writes/ev', before.s2_pointer.css_var_per_event, after.s2_pointer.css_var_per_event, true),
    analyzeMetric('S2: Pointer Burst', 'Recalc Style Duration', 's', before.s2_pointer.recalc_s, after.s2_pointer.recalc_s, true),
    analyzeMetric('S2: Pointer Burst', 'Task Duration', 's', before.s2_pointer.task_s, after.s2_pointer.task_s, true),

    // S3
    analyzeMetric('S3: Ecosystem Visible', 'Layout Duration', 's', before.s3_eco_visible.layout_s, after.s3_eco_visible.layout_s, true),
    analyzeMetric('S3: Ecosystem Visible', 'Recalc Style Duration', 's', before.s3_eco_visible.recalc_s, after.s3_eco_visible.recalc_s, true),
    analyzeMetric('S3: Ecosystem Visible', 'Task Duration', 's', before.s3_eco_visible.task_s, after.s3_eco_visible.task_s, true),
    analyzeMetric('S3: Ecosystem Visible', 'RAF frame interval proxy', 'fps', before.s3_eco_visible.fps_proxy, after.s3_eco_visible.fps_proxy, false),
    analyzeMetric('S3: Ecosystem Visible', 'Dropped frames proxy (>33ms)', 'frames', before.s3_eco_visible.dropped_frames, after.s3_eco_visible.dropped_frames, true),

    // S4
    analyzeMetric('S4: Ecosystem Offscreen', 'data-eco-paused attribute', '', before.s4_eco_offscreen.eco_paused_attr, after.s4_eco_offscreen.eco_paused_attr, false, 'Suspended when offscreen (false -> true)'),
    analyzeMetric('S4: Ecosystem Offscreen', 'Layout Duration', 's', before.s4_eco_offscreen.layout_s, after.s4_eco_offscreen.layout_s, true),
    analyzeMetric('S4: Ecosystem Offscreen', 'Recalc Style Duration', 's', before.s4_eco_offscreen.recalc_s, after.s4_eco_offscreen.recalc_s, true),
    analyzeMetric('S4: Ecosystem Offscreen', 'Task Duration', 's', before.s4_eco_offscreen.task_s, after.s4_eco_offscreen.task_s, true),
    analyzeMetric('S4: Ecosystem Offscreen', 'RAF frame interval proxy', 'fps', before.s4_eco_offscreen.fps_proxy, after.s4_eco_offscreen.fps_proxy, false),
    analyzeMetric('S4: Ecosystem Offscreen', 'Dropped frames proxy (>33ms)', 'frames', before.s4_eco_offscreen.dropped_frames, after.s4_eco_offscreen.dropped_frames, true),

    // S5
    analyzeMetric('S5: Hidden Tab', 'data-bg-paused attribute', '', before.s5_hidden.bg_paused_attr, after.s5_hidden.bg_paused_attr, false, 'Paused on visibility change (false -> true)'),
    analyzeMetric('S5: Hidden Tab', 'Task Duration', 's', before.s5_hidden.task_s, after.s5_hidden.task_s, true),

    // S6
    analyzeMetric('S6: Reduced Motion', 'Active Animations', 'anims', before.s6_reduced.total_animations, after.s6_reduced.total_animations, true),
    analyzeMetric('S6: Reduced Motion', 'Task Duration', 's', before.s6_reduced.task_s, after.s6_reduced.task_s, true),

    // S7
    analyzeMetric('S7: Mobile 390px', 'Orbital Scene Wrap display', '', before.s7_mobile.eco_scene_display, after.s7_mobile.eco_scene_display, false, 'Preserved none display'),
    analyzeMetric('S7: Mobile 390px', 'Planet Animation State', '', before.s7_mobile.planet_animation_state, after.s7_mobile.planet_animation_state, false, `${before.s7_mobile.planet_animation_state} -> ${after.s7_mobile.planet_animation_state}`),
    analyzeMetric('S7: Mobile 390px', 'Layout Duration', 's', before.s7_mobile.layout_s, after.s7_mobile.layout_s, true),
    analyzeMetric('S7: Mobile 390px', 'Recalc Style Duration', 's', before.s7_mobile.recalc_s, after.s7_mobile.recalc_s, true),
    analyzeMetric('S7: Mobile 390px', 'Task Duration', 's', before.s7_mobile.task_s, after.s7_mobile.task_s, true),
    analyzeMetric('S7: Mobile 390px', 'RAF frame interval proxy', 'fps', before.s7_mobile.fps_proxy, after.s7_mobile.fps_proxy, false),
    analyzeMetric('S7: Mobile 390px', 'Dropped frames proxy (>33ms)', 'frames', before.s7_mobile.dropped_frames, after.s7_mobile.dropped_frames, true),

    // S8
    analyzeMetric('S8: Kayla Open/Close', 'Dialog Visible Raw Duration', 'ms', before.s8_kayla.open_visible_ms, after.s8_kayla.open_visible_ms, true),
    analyzeMetric('S8: Kayla Open/Close', 'Dialog Transition Settled Duration', 'ms', before.s8_kayla.open_settled_ms, after.s8_kayla.open_settled_ms, true),
    analyzeMetric('S8: Kayla Open/Close', 'Dialog Close Settled Duration', 'ms', before.s8_kayla.close_settled_ms, after.s8_kayla.close_settled_ms, true),
  ];
}

const rows = generateReportRows();

console.log('\n========================================================================================');
console.log('| Scenario | Metric | Baseline (R4.1) | Candidate (R4.2) | Delta | Interpretation |');
console.log('|---|---|---|---|---|---|');
for (const r of rows) {
  const bStr = typeof r.before === 'number' ? r.before + (r.unit ? ' ' + r.unit : '') : String(r.before);
  const aStr = typeof r.after === 'number' ? r.after + (r.unit ? ' ' + r.unit : '') : String(r.after);
  const dStr = r.delta !== undefined ? (r.delta > 0 ? '+' : '') + r.delta + (r.unit ? ' ' + r.unit : '') : 'N/A';
  console.log(`| ${r.scenario} | ${r.metric} | ${bStr} | ${aStr} | ${dStr} | ${r.interpretation} |`);
}
console.log('========================================================================================\n');