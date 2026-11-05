import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('screenshots');
const GAMES = [
  'neon-coil','prism-breaker','void-wing','shard-field','lumen-chase',
  'rushline','cave-dart','fluxball','aegis-grid','sky-stack',
  'chrono-drop','gemfuse','helix-2048','signal-sweep','glyph-grid',
  'shift-15','conduit','echo-pairs','lexigrid','cratecraft',
  'driftwire','horizon-drive','lane-rush','hover-tube','arena-kart',
  'pulse-duel','edge-parry','street-surge','ring-push','apex-gauntlet',
];

test.beforeAll(() => {
  fs.mkdirSync(OUT, { recursive: true });
});

test('capture menu', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.cart');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'menu.png'), fullPage: true });
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
    await page.waitForTimeout(300);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `${id}.png`) });
    expect(fs.existsSync(path.join(OUT, `${id}.png`))).toBeTruthy();
  });
}
