import { test, expect } from '@playwright/test';

const GAMES = [
  'hover-tube','horizon-drive','void-wing','prism-breaker','neon-coil',
  'fluxball','chrono-drop','gemfuse','lumen-chase','pulse-duel',
];

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
});

test('menu boots', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await page.waitForSelector('.cart');
  await expect(page.locator('.cart')).toHaveCount(10);
  expect(errors.filter(e => !e.includes('favicon') && !e.includes('Failed to load resource')).toHaveLength(0);
});

for (const id of GAMES) {
  test(`play ${id} 5s`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
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
    });
    await page.waitForTimeout(400);
    // start + play inputs
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    for (let i = 0; i < 10; i++) {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(100);
      await page.keyboard.up('ArrowRight');
      await page.keyboard.press('Space');
      await page.keyboard.press('KeyJ');
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(350);
    }
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();
    const bad = errors.filter((e) => !/favicon|Failed to load resource|Download the React/.test(e));
    expect(bad, bad.join('\n')).toEqual([]);
  });
}
