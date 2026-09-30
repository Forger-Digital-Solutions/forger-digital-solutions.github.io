import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const arg = (name, fallback) => {
  const value = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};
const root = resolve(arg('out', 'docs/audit/visual-recovery-2026-09-29'));
const base = arg('url', 'http://127.0.0.1:4337').replace(/\/$/, '');
const widths = [[1920, 1080], [1599, 900], [1440, 900], [1280, 800], [768, 1024], [390, 844]];
const products = [
  ['codeforge', '/projects/codeforge'],
  ['gems', '/projects/gems-training-grounds'],
  ['kayla-publisher', '/projects/kayla-ai-publisher'],
  ['farmstand-finder', '/projects/farmstand-finder'],
];
const gemstones = ['topaz', 'sapphire', 'peridot', 'garnet'];
const mkdir = (part = '') => mkdirSync(resolve(root, part), { recursive: true });

async function screenshot(page, selector, path) {
  const element = page.locator(selector).first();
  await element.scrollIntoViewIfNeeded();
  await page.waitForTimeout(160);
  await element.screenshot({ path: resolve(root, path), animations: 'allow' });
}

async function freezeOrbits(page, seconds = 0) {
  await page.evaluate((time) => {
    document.querySelectorAll('.planet-motion').forEach((element) => {
      element.getAnimations().forEach((animation) => {
        animation.pause();
        animation.currentTime = time * 1000;
      });
    });
  }, seconds);
}

const browser = await chromium.launch({ headless: true });
const captures = { url: base, widths, products: products.map(([id]) => id), gemstones, files: [] };
try {
  for (const [width, height] of widths) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    // Keep the fixed, unrelated Kayla launcher from covering the component
    // edges in review captures. This changes only this browser page, never site
    // source or Kayla behavior.
    await page.addStyleTag({ content: '#kayla-launcher { visibility: hidden !important; }' });
    await freezeOrbits(page, 0);

    const homePath = `responsive/${width}/homepage-default.png`;
    const gemsPath = `responsive/${width}/gems-default.png`;
    mkdir(`responsive/${width}`);
    await screenshot(page, '.fds-ecosystem', homePath);
    await screenshot(page, '.gems-system', gemsPath);
    captures.files.push(homePath, gemsPath);

    for (const [id, href] of products) {
      await page.mouse.move(0, 0);
      if (width <= 719) {
        const target = page.locator(`.eco-group__link[href="${href}"]`).first();
        await target.scrollIntoViewIfNeeded();
        await target.hover();
      } else {
        // The SVG link's bounding box spans its moving child. Aim at the actual
        // planet shell so the pointer reaches the visible node, not the FDS halo.
        const shell = page.locator(`.planet-motion[data-planet="${id}"] .planet__shell`);
        await shell.scrollIntoViewIfNeeded();
        const box = await shell.boundingBox();
        if (!box) throw new Error(`Missing visible planet shell for ${id} at ${width}px`);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(180);
        const active = await page.locator(`.orbit-visual--${id}`).evaluate((node) => node.classList.contains('orbit-highlight'));
        if (!active) throw new Error(`Hover did not reveal ${id}'s own orbit at ${width}px`);
      }
      await page.waitForTimeout(240);
      const path = `hover/${width}/homepage-${id}.png`;
      mkdir(`hover/${width}`);
      await screenshot(page, '.fds-ecosystem', path);
      captures.files.push(path);
    }

    for (const gem of gemstones) {
      const target = page.locator(`.gems-node[data-gem="${gem}"]`);
      await target.focus();
      const path = `focus/${width}/gems-${gem}.png`;
      mkdir(`focus/${width}`);
      await screenshot(page, '.gems-system', path);
      captures.files.push(path);
    }
    await context.close();

    const reduced = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const reducedPage = await reduced.newPage();
    await reducedPage.goto(base, { waitUntil: 'networkidle' });
    await reducedPage.addStyleTag({ content: '#kayla-launcher { visibility: hidden !important; }' });
    const reducedHome = `reduced/${width}/homepage.png`;
    const reducedGems = `reduced/${width}/gems.png`;
    mkdir(`reduced/${width}`);
    await screenshot(reducedPage, '.fds-ecosystem', reducedHome);
    await screenshot(reducedPage, '.gems-system', reducedGems);
    captures.files.push(reducedHome, reducedGems);
    await reduced.close();
    console.log(`${width}px: default, four product hovers, four gem focus states, reduced motion`);
  }

  const reference = await browser.newContext({ viewport: { width: 500, height: 500 } });
  const sourcePage = await reference.newPage();
  await sourcePage.goto(`${base}/images/codeforge/codeforge-icon.svg`, { waitUntil: 'load' });
  mkdir('reference');
  const markPath = 'reference/codeforge-source-mark.png';
  await sourcePage.screenshot({ path: resolve(root, markPath) });
  captures.files.push(markPath);
  await reference.close();

  const compare = await browser.newPage({ viewport: { width: 1040, height: 780 }, deviceScaleFactor: 1 });
  const logo = readFileSync(resolve('public/images/codeforge/codeforge-icon.svg')).toString('base64');
  const ecosystem = readFileSync(resolve(root, 'responsive/1440/homepage-default.png')).toString('base64');
  await compare.setContent(`<style>body{margin:0;padding:28px;background:#070b13;color:#e8f1ff;font:700 13px system-ui}main{display:grid;grid-template-columns:320px 1fr;gap:24px;align-items:start}figure{margin:0;padding:14px;border:1px solid #284477;background:#0b1322}img{display:block;width:100%;height:auto}figure:first-child img{background:#0a101c}figcaption{padding:0 0 10px;letter-spacing:.12em;text-transform:uppercase}</style><main><figure><figcaption>CodeForge source mark</figcaption><img src="data:image/svg+xml;base64,${logo}"></figure><figure><figcaption>FDS ecosystem T+0</figcaption><img src="data:image/png;base64,${ecosystem}"></figure></main>`);
  const comparePath = 'reference/codeforge-vs-ecosystem.png';
  await compare.screenshot({ path: resolve(root, comparePath), fullPage: true });
  captures.files.push(comparePath);
  await compare.close();

  writeFileSync(resolve(root, 'capture.json'), JSON.stringify({ ...captures, capturedAt: new Date().toISOString() }, null, 2));
  console.log(`Captured ${captures.files.length} PNGs under ${root}`);
} finally {
  await browser.close();
}
