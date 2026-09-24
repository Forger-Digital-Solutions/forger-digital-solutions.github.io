/*
 * FDS Live-Production Behavioral Audit
 *
 * Verifies (against LIVE production, not inferred from CSS):
 *   A. Smoke: key routes load, console/page errors, failed requests, noise texture present.
 *   B. Animation inventory: what is actually running at hero/top, which properties animate,
 *      and whether any layout-triggering property is still animating at idle.
 *   C. Offscreen suspension: which data-*-paused hooks are engaged at top / ecosystem / footer,
 *      and running-animation counts at each.
 *   D. Reduced motion: prefers-reduced-motion: reduce -> continuous animation ~0.
 *   E. Tab background: hidden tab suspends motion, no loop/timer multiplication, safe resume.
 *
 * Usage: node scripts/live-behavior-audit.cjs [--url=https://forgerdigitalsolutions.com]
 *        [--out=docs/audit/live-production/behavior-audit.json]
 */
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const getArg = (n, d) => { const m = args.find((a) => a.startsWith(`--${n}=`)); return m ? m.split('=').slice(1).join('=') : d; };
const BASE = getArg('url', 'https://forgerdigitalsolutions.com').replace(/\/$/, '');
const OUT = getArg('out', 'docs/audit/live-production/behavior-audit.json');

const LAYOUT_PROPS = new Set(['top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'margin-top', 'margin-left', 'padding', 'font-size', 'box-shadow', 'filter', 'border-width', 'flex', 'flex-grow']);

const SMOKE_ROUTES = ['/', '/forged', '/projects/codeforge', '/projects/gems-training-grounds', '/technology', '/about'];

const ANIM_INVENTORY = `
  (() => {
    const describe = (el) => {
      if (!el || !el.tagName) return 'unknown';
      let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      const cls = (typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '').trim().split(/\\s+/).filter(Boolean).slice(0, 3);
      if (cls.length) s += '.' + cls.join('.');
      return s;
    };
    const anims = document.getAnimations ? document.getAnimations() : [];
    const out = anims.map((a) => {
      let props = [];
      try {
        const kf = a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : [];
        const set = new Set();
        for (const f of kf) for (const k of Object.keys(f)) if (!['offset', 'computedOffset', 'easing', 'offsetDistance'].includes(k)) set.add(k);
        props = [...set];
      } catch (_) {}
      let target = 'unknown';
      try { target = describe(a.effect && a.effect.target); } catch (_) {}
      return {
        playState: a.playState,
        name: a.animationName || a.transitionProperty || (a.effect && a.effect.getTiming ? 'css' : 'unknown'),
        target,
        props,
      };
    });
    const byProp = {};
    for (const a of out) if (a.playState === 'running') for (const p of a.props) byProp[p] = (byProp[p] || 0) + 1;
    const runningByTarget = {};
    for (const a of out) if (a.playState === 'running') runningByTarget[a.target] = (runningByTarget[a.target] || 0) + 1;
    return {
      total: out.length,
      running: out.filter((a) => a.playState === 'running').length,
      paused: out.filter((a) => a.playState === 'paused').length,
      runningProps: byProp,
      runningByTarget,
      layoutTriggering: Object.keys(byProp).filter((p) => ${JSON.stringify([...LAYOUT_PROPS])}.includes(p)),
      sample: out.filter((a) => a.playState === 'running').slice(0, 25),
    };
  })()
`;

const PAUSED_HOOKS = `
  (() => {
    const names = ['cosmic', 'eco', 'gems', 'oneeco', 'footer'];
    const found = {};
    for (const n of names) {
      const els = document.querySelectorAll('[data-' + n + '-paused]');
      found[n] = els.length;
    }
    // Also detect any element currently carrying a *-paused attribute.
    const anyPaused = [...document.querySelectorAll('*')].filter((el) => [...el.attributes].some((at) => /-paused$/.test(at.name))).map((el) => ({
      tag: el.tagName.toLowerCase(),
      cls: (typeof el.className === 'string' ? el.className : '').trim().slice(0, 40),
      attrs: [...el.attributes].filter((at) => /-paused$/.test(at.name)).map((at) => at.name),
    }));
    return { countsByName: found, anyPaused };
  })()
`;

const RUN_COUNT = `document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running').length : -1`;

async function newPage(browser, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errs = { console: [], page: [], requests: [] };
  page.on('console', (m) => { if (m.type() === 'error') errs.console.push(m.text()); });
  page.on('pageerror', (e) => errs.page.push(String(e && e.message ? e.message : e)));
  page.on('requestfailed', (r) => errs.requests.push(`${r.method()} ${r.url()} :: ${r.failure() && r.failure().errorText}`));
  return { ctx, page, errs };
}

(async () => {
  console.log('========================================================');
  console.log('FDS LIVE-PRODUCTION BEHAVIORAL AUDIT');
  console.log(`Base: ${BASE}`);
  console.log('========================================================\n');
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1456,980'] });
  const result = { base: BASE, at: new Date().toISOString() };

  try {
    // ---- A. Smoke ----
    console.log('> A. Smoke test across key routes');
    result.smoke = [];
    for (const route of SMOKE_ROUTES) {
      const { ctx, page, errs } = await newPage(browser);
      let status = 0, title = '', markers = {};
      try {
        const res = await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 });
        try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
        status = res ? res.status() : 0;
        title = await page.title();
        markers = await page.evaluate(() => ({
          noisePng: !!document.querySelector('img[src*="noise.png"]') || getComputedStyle(document.body).backgroundImage.includes('noise') || [...document.styleSheets].some((ss) => { try { return [...ss.cssRules].some((r) => r.cssText && r.cssText.includes('noise.png')); } catch (_) { return false; } }),
          feTurbulence: document.documentElement.outerHTML.includes('feTurbulence'),
          kayla: !!document.querySelector('[id*="kayla" i],[class*="kayla" i],[data-kayla]'),
          footer: !!document.querySelector('footer'),
          imgsBroken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src).slice(0, 10),
        }));
      } catch (e) { errs.page.push('goto: ' + e.message); }
      result.smoke.push({ route, status, title, markers, errors: { console: errs.console.slice(0, 8), page: errs.page.slice(0, 8), requests: errs.requests.slice(0, 8) } });
      console.log(`    ${route} -> HTTP ${status} | title="${title.slice(0, 40)}" | consoleErr=${errs.console.length} pageErr=${errs.page.length} failedReq=${errs.requests.length} | brokenImgs=${(markers.imgsBroken || []).length} feTurbulence=${markers.feTurbulence}`);
      await ctx.close();
    }

    // ---- B + C. Animation inventory & offscreen suspension ----
    console.log('\n> B/C. Animation inventory + offscreen suspension (top / ecosystem / footer)');
    const { ctx, page, errs } = await newPage(browser);
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(2500);
    result.suspension = {};
    const positions = [
      { name: 'top', fn: async () => { await page.evaluate(() => window.scrollTo(0, 0)); } },
      { name: 'ecosystem', fn: async () => { await page.evaluate(() => { const el = document.querySelector('.fds-ecosystem'); if (el) el.scrollIntoView({ block: 'center' }); }); } },
      { name: 'footer', fn: async () => { await page.evaluate(() => { const el = document.querySelector('footer'); if (el) el.scrollIntoView({ block: 'center' }); else window.scrollTo(0, document.body.scrollHeight); }); } },
    ];
    for (const p of positions) {
      await p.fn();
      await page.waitForTimeout(1800);
      const inv = await page.evaluate(ANIM_INVENTORY);
      const hooks = await page.evaluate(PAUSED_HOOKS);
      const scrollY = await page.evaluate(() => Math.round(window.scrollY));
      result.suspension[p.name] = { scrollY, running: inv.running, total: inv.total, paused: inv.paused, pausedHooks: hooks.countsByName, anyPaused: hooks.anyPaused, runningProps: inv.runningProps, layoutTriggering: inv.layoutTriggering, runningByTarget: inv.runningByTarget };
      if (p.name === 'top') result.animationInventoryTop = inv;
      console.log(`    [${p.name}] scrollY=${scrollY} running=${inv.running}/${inv.total} pausedHooks=${JSON.stringify(hooks.countsByName)} layoutTriggeringProps=[${inv.layoutTriggering.join(',')}]`);
      console.log(`        runningProps=${JSON.stringify(inv.runningProps)}`);
    }
    result.suspensionErrors = errs;
    await ctx.close();

    // ---- D. Reduced motion ----
    console.log('\n> D. Reduced motion (prefers-reduced-motion: reduce)');
    const rm = await newPage(browser, { reducedMotion: 'reduce' });
    await rm.page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    try { await rm.page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await rm.page.waitForTimeout(2500);
    const rmRunning = await rm.page.evaluate(RUN_COUNT);
    const rmTotal = await rm.page.evaluate(`document.getAnimations ? document.getAnimations().length : -1`);
    const rmMedia = await rm.page.evaluate(`matchMedia('(prefers-reduced-motion: reduce)').matches`);
    result.reducedMotion = { mediaMatches: rmMedia, running: rmRunning, total: rmTotal, errors: rm.errs };
    console.log(`    mediaMatches=${rmMedia} running=${rmRunning} total=${rmTotal} (expect running ~0)`);
    await rm.ctx.close();

    // ---- E. Tab background ----
    console.log('\n> E. Tab background suspension + resume safety');
    const bgCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p1 = await bgCtx.newPage();
    await p1.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    try { await p1.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await p1.waitForTimeout(2000);
    await p1.evaluate(() => { window.__raf = 0; const tick = () => { window.__raf++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    const before = await p1.evaluate(`({ running: document.getAnimations().filter(a=>a.playState==='running').length, total: document.getAnimations().length, raf: window.__raf, vis: document.visibilityState })`);
    const p2 = await bgCtx.newPage();
    await p2.goto('about:blank');
    await p2.bringToFront(); // p1 becomes hidden
    await p1.waitForTimeout(1500);
    const hiddenA = await p1.evaluate(`({ running: document.getAnimations().filter(a=>a.playState==='running').length, bgPausedHtml: document.documentElement.hasAttribute('data-bg-paused'), bgPausedBody: document.body.hasAttribute('data-bg-paused'), anyBg: !!document.querySelector('[data-bg-paused]'), raf: window.__raf, vis: document.visibilityState })`);
    await p1.waitForTimeout(2500);
    const hiddenB = await p1.evaluate(`({ running: document.getAnimations().filter(a=>a.playState==='running').length, raf: window.__raf })`);
    await p1.bringToFront();
    await p1.waitForTimeout(2000);
    const resumed = await p1.evaluate(`({ running: document.getAnimations().filter(a=>a.playState==='running').length, total: document.getAnimations().length, raf: window.__raf, vis: document.visibilityState })`);
    result.tabBackground = { before, hiddenA, hiddenB, resumed, rafDeltaWhileHidden: hiddenB.raf - hiddenA.raf };
    console.log(`    before: running=${before.running} raf=${before.raf}`);
    console.log(`    hidden: running=${hiddenA.running} anyBgPaused=${hiddenA.anyBg} vis=${hiddenA.vis} raf=${hiddenA.raf}->${hiddenB.raf} (delta ${hiddenB.raf - hiddenA.raf})`);
    console.log(`    resumed: running=${resumed.running} total=${resumed.total} (before total ${before.total}) raf=${resumed.raf}`);
    await bgCtx.close();

    const outPath = path.resolve(OUT);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    console.log(`\nWrote behavior audit -> ${outPath}`);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
