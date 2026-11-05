import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const GAMES = [
  'neon-coil','prism-breaker','void-wing','shard-field','lumen-chase',
  'rushline','cave-dart','fluxball','aegis-grid','sky-stack',
  'chrono-drop','gemfuse','helix-2048','signal-sweep','glyph-grid',
  'shift-15','conduit','echo-pairs','lexigrid','cratecraft',
  'driftwire','horizon-drive','lane-rush','hover-tube','arena-kart',
  'pulse-duel','edge-parry','street-surge','ring-push','apex-gauntlet',
];

test.describe('OMNICART smoke', () => {
  test('boot menu renders 30 cartridges', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForSelector('.cart', { timeout: 15000 });
    await expect(page.locator('.cart')).toHaveCount(30);
    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([]);
  });

  for (const id of GAMES) {
    test(`launch ${id}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`${id}: ${e.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`${id}: ${msg.text()}`);
      });
      await page.goto('/');
      await page.waitForFunction(() => !!(window as unknown as { __OMNICART__?: { launch: (id: string) => Promise<void> } }).__OMNICART__);
      await page.evaluate(async (gid) => {
        await (window as unknown as { __OMNICART__: { launch: (id: string) => Promise<void> } }).__OMNICART__.launch(gid);
      }, id);
      await page.waitForSelector('#play.active', { timeout: 15000 });
      await page.waitForTimeout(400);
      const canvas = page.locator('#game-canvas');
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      expect(box).toBeTruthy();
      expect((box?.width ?? 0) > 100).toBeTruthy();
      expect((box?.height ?? 0) > 80).toBeTruthy();

      // keyboard + touch simulation
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(150);
      await page.keyboard.up('ArrowRight');
      await page.keyboard.press('Space');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('KeyZ');
      const stage = page.locator('#game-canvas');
      const b = await stage.boundingBox();
      if (b) {
        try {
          await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        } catch {
          await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
        }
        await page.mouse.click(b.x + b.width * 0.6, b.y + b.height * 0.6);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width * 0.7, b.y + b.height * 0.5);
        await page.mouse.up();
      }
      await page.waitForTimeout(1200);
      // canvas should still have pixels (not blank zero size)
      const painted = await page.evaluate(() => {
        const c = document.getElementById('game-canvas') as HTMLCanvasElement;
        return c && c.width > 0 && c.height > 0;
      });
      expect(painted).toBeTruthy();
      const fatal = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('net::') &&
          !/Failed to load resource/i.test(e),
      );
      expect(fatal).toEqual([]);
      await page.evaluate(() => {
        (window as unknown as { __OMNICART__: { quitToMenu: () => void } }).__OMNICART__.quitToMenu();
      });
    });
  }
});
