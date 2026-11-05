const params = new URLSearchParams(location.search);
const scene = params.get('scene') || 'menu';

const loaders: Record<string, () => Promise<{ run: () => Promise<void> }>> = {
  menu: () => import('./scenes/menu'),
  'hover-tube': () => import('./scenes/hover-tube'),
  'horizon-drive': () => import('./scenes/horizon-drive'),
  'void-wing': () => import('./scenes/void-wing'),
  'prism-breaker': () => import('./scenes/prism-breaker'),
  'neon-coil': () => import('./scenes/neon-coil'),
  fluxball: () => import('./scenes/fluxball'),
  'chrono-drop': () => import('./scenes/chrono-drop'),
  gemfuse: () => import('./scenes/gemfuse'),
  'lumen-chase': () => import('./scenes/lumen-chase'),
  'pulse-duel': () => import('./scenes/pulse-duel'),
};

async function boot() {
  const load = loaders[scene];
  if (!load) {
    document.body.innerHTML = `<pre style="color:#fff;padding:24px">Unknown scene: ${scene}</pre>`;
    return;
  }
  const mod = await load();
  await mod.run();
  (window as unknown as { __LOOKDEV_READY__?: boolean }).__LOOKDEV_READY__ = true;
}

boot().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<pre style="color:#f66;padding:24px">${String(err)}</pre>`;
});
