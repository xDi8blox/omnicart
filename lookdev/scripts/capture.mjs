import { chromium } from '../../node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../shots');
const PUB = path.resolve(__dirname, '../public/shots');
const BASE = process.env.LOOKDEV_URL || 'http://127.0.0.1:4600';
const CHROME = process.env.PLAYWRIGHT_CHROME ||
  `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const SCENES = [
  'menu','hover-tube','horizon-drive','void-wing','prism-breaker','neon-coil',
  'fluxball','chrono-drop','gemfuse','lumen-chase','pulse-duel',
];

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PUB, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: CHROME,
  args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });

for (const id of SCENES) {
  console.log('capture', id);
  await page.goto(`${BASE}/?scene=${id}`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => window.__LOOKDEV_READY__ === true, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(id === 'pulse-duel' ? 3200 : 1800);
  const file = path.join(OUT, `${id}.png`);
  await page.screenshot({ path: file, type: 'png' });
  fs.copyFileSync(file, path.join(PUB, `${id}.png`));
  console.log('wrote', file, fs.statSync(file).size);
}

await browser.close();
console.log('done');
