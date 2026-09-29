import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const responses = [];
  page.on('response', (response) => {
    if (response.url().includes('/api/kayla/')) responses.push({ url: response.url(), status: response.status() });
  });
  await page.goto('http://127.0.0.1:4321', { waitUntil: 'networkidle' });
  await page.locator('#kayla-launcher').click();
  await page.locator('.kayla-starter[data-query="What can I use now?"]').click();
  await page.getByText('CodeForge (v0.2.0)').waitFor({ timeout: 15000 });
  const answer = await page.locator('.kayla-msg--kayla').last().innerText();
  console.log(JSON.stringify({ responses, answer: answer.slice(0, 500) }, null, 2));
} finally {
  await browser.close();
}
