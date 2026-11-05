import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('screenshots');
const GAMES = [
  'hover-tube','horizon-drive','void-wing','prism-breaker','neon-coil',
  'fluxball','chrono-drop','gemfuse','lumen-chase','pulse-duel',
];

test.beforeAll(() => { fs.mkdirSync(OUT, { recursive: true }); });

test('capture menu', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cart');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'menu.png'), fullPage: false });
  expect(fs.existsSync(path.join(OUT, 'menu.png'))).toBeTruthy();
});

for (const id of GAMES) {
  test(`shot ${id}`, async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => !!(window as unknown as { __OMNICART__?: unknown }).__OMNICART__);
    await page.evaluate(async (gid) => {
      await (window as unknown as { __OMNICART__: { launch: (id: string) => Promise<void> } }).__OMNICART__.launch(gid);
    }, id);
    await page.waitForSelector('#play.active');
    await page.waitForSelector('#loading-game[hidden]', { state: 'attached', timeout: 20000 }).catch(() => {});
    await page.evaluate(() => {
      const el = document.getElementById('loading-game');
      if (el) el.hidden = true;
      const pad = document.getElementById('touch-pad');
      if (pad) pad.style.display = 'none';
    });
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('KeyJ');
    await page.waitForTimeout(id === 'pulse-duel' ? 2500 : 1400);
    await page.screenshot({ path: path.join(OUT, `${id}.png`) });
    expect(fs.existsSync(path.join(OUT, `${id}.png`))).toBeTruthy();
  });
}

test('mobile landscape hover-tube', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390, hasTouch: true } as { width: number; height: number });
  await page.goto('/');
  await page.waitForFunction(() => !!(window as unknown as { __OMNICART__?: unknown }).__OMNICART__);
  await page.evaluate(async () => {
    await (window as unknown as { __OMNICART__: { launch: (id: string) => Promise<void> } }).__OMNICART__.launch('hover-tube');
  });
  await page.waitForSelector('#play.active');
  await page.waitForTimeout(800);
  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'mobile-hover-tube.png') });
});

test('mobile landscape pulse-duel', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.waitForFunction(() => !!(window as unknown as { __OMNICART__?: unknown }).__OMNICART__);
  await page.evaluate(async () => {
    await (window as unknown as { __OMNICART__: { launch: (id: string) => Promise<void> } }).__OMNICART__.launch('pulse-duel');
  });
  await page.waitForSelector('#play.active');
  await page.waitForTimeout(2000);
  await page.keyboard.press('Space');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'mobile-pulse-duel.png') });
});
