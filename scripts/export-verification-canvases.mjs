import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const generators = [
  'random-walk', 'l-systems', 'spirals', 'contour-lines', 'voronoi',
  'delaunay', 'hatching', 'cross-hatching', 'noise-fields', 'attractors',
  'rosettes', 'epicycloids', 'bezier-flow-fields', 'space-filling-curves', 'image-trace'
];

const outDir = path.resolve('verification/canvases');
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
const results = [];
page.on('pageerror', (err) => console.error('pageerror', err));
for (const id of generators) {
  await page.goto(`http://127.0.0.1:5173/?generator=${id}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas');
  await page.waitForTimeout(350);
  const canvas = page.locator('canvas').first();
  await canvas.screenshot({ path: path.join(outDir, `${id}.png`) });
  const metrics = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let dark = 0, nonBg = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const avg = (r + g + b) / 3;
      if (avg < 80) dark++;
      if (Math.abs(r - 255) > 10 || Math.abs(g - 253) > 10 || Math.abs(b - 247) > 10) nonBg++;
    }
    return { width: c.width, height: c.height, darkPct: +(dark / (c.width*c.height) * 100).toFixed(2), nonBgPct: +(nonBg / (c.width*c.height) * 100).toFixed(2) };
  });
  results.push({ id, ...metrics });
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
