import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (msg) => logs.push(`${msg.type()}: ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`pageerror: ${err.stack || err.message}`));
await page.goto('http://127.0.0.1:5173/?generator=random-walk', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const info = await page.evaluate(() => ({
  title: document.title,
  canvasCount: document.querySelectorAll('canvas').length,
  canvas: [...document.querySelectorAll('canvas')].map(c => ({ width: c.width, height: c.height, rect: c.getBoundingClientRect().toJSON?.() || {x:c.getBoundingClientRect().x,y:c.getBoundingClientRect().y,width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height}, dataLen: c.toDataURL('image/png').length })),
  selected: document.querySelector('#generatorSelect')?.value,
  guiText: document.querySelector('#gui')?.innerText,
}));
console.log(JSON.stringify({ info, logs }, null, 2));
await page.screenshot({ path: 'verification/playwright-random-page.png', fullPage: true });
const canvas = await page.locator('canvas').first();
if (await canvas.count()) await canvas.screenshot({ path: 'verification/playwright-random-canvas.png' });
await browser.close();
