import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('docs/audit/visual-lock-2026-09-29');
const base = 'http://127.0.0.1:4321';
const widths = [[1920, 1080], [1599, 900], [1440, 900], [1280, 800], [1024, 768], [768, 1024], [390, 844]];
const mkdir = (part) => mkdirSync(resolve(root, part), { recursive: true });
const shot = async (page, selector, part) => {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await el.screenshot({ path: resolve(root, part), animations: 'allow' });
};
const freeze = async (page, seconds) => page.evaluate((value) => {
  document.querySelectorAll('.planet-motion').forEach((element) => element.getAnimations().forEach((animation) => {
    animation.pause();
    animation.currentTime = value * 1000;
  }));
}, seconds);

const browser = await chromium.launch({ headless: true });
try {
  for (const [width, height] of widths) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    mkdir(`responsive/${width}`);
    await freeze(page, 0);
    await shot(page, '.fds-ecosystem', `responsive/${width}/homepage-t0.png`);
    await shot(page, '.gems-system', `responsive/${width}/gems-default.png`);
    if (width === 1440) {
      mkdir('motion');
      for (const seconds of [10, 30, 60, 120, 763.078]) {
        await freeze(page, seconds);
        await shot(page, '.fds-ecosystem', `motion/homepage-t${seconds}.png`);
      }
      mkdir('focus');
      for (const gem of ['topaz', 'sapphire', 'peridot', 'garnet']) {
        await page.locator(`.gems-node[data-gem="${gem}"]`).focus();
        await shot(page, '.gems-system', `focus/gems-${gem}.png`);
      }
    }
    await context.close();
  }
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    mkdir(`reduced/${width}`);
    await shot(page, '.fds-ecosystem', `reduced/${width}/homepage.png`);
    await shot(page, '.gems-system', `reduced/${width}/gems.png`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 500, height: 500 } });
  const page = await context.newPage();
  await page.goto(`${base}/images/codeforge/codeforge-icon.svg`, { waitUntil: 'load' });
  mkdir('reference');
  await page.screenshot({ path: resolve(root, 'reference/codeforge-icon.png') });
  await context.close();
  const compare = await browser.newPage({ viewport: { width: 1040, height: 780 }, deviceScaleFactor: 1 });
  const logo = readFileSync(resolve('public/images/codeforge/codeforge-icon.svg')).toString('base64');
  const ecosystem = readFileSync(resolve(root, 'responsive/1440/homepage-t0.png')).toString('base64');
  await compare.setContent(`<style>body{margin:0;padding:28px;background:#070b13;color:#e8f1ff;font:700 13px system-ui}main{display:grid;grid-template-columns:320px 1fr;gap:24px;align-items:start}figure{margin:0;padding:14px;border:1px solid #284477;background:#0b1322}img{display:block;width:100%;height:auto}figure:first-child img{background:#0a101c}figcaption{padding:0 0 10px;letter-spacing:.12em;text-transform:uppercase}</style><main><figure><figcaption>CodeForge source mark</figcaption><img src="data:image/svg+xml;base64,${logo}"></figure><figure><figcaption>FDS ecosystem T+0</figcaption><img src="data:image/png;base64,${ecosystem}"></figure></main>`);
  await compare.screenshot({ path: resolve(root, 'reference/codeforge-vs-ecosystem.png'), fullPage: true });
  await compare.close();
  writeFileSync(resolve(root, 'capture.json'), JSON.stringify({ widths, times: [0, 10, 30, 60, 120, 763.078], gems: ['topaz', 'sapphire', 'peridot', 'garnet'], base }, null, 2));
} finally {
  await browser.close();
}
