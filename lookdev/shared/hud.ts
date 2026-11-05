export type HudStat = { label: string; value: string; tone?: 'warn' | 'gold' | 'cyan' };

export function mountStandardHud(opts: {
  title: string;
  tag: string;
  stats: HudStat[];
  hint?: string;
  extraHtml?: string;
}): HTMLElement {
  const hud = document.getElementById('hud')!;
  hud.innerHTML = `
    <div class="corner tl"></div><div class="corner tr"></div>
    <div class="corner bl"></div><div class="corner br"></div>
    <div class="hud-top">
      <div class="brand">OMNICART<small>LOOKDEV · V2</small></div>
      <div class="title-block">
        <h1>${opts.title}</h1>
        <div class="tag">${opts.tag}</div>
      </div>
      <div class="stat-row">
        ${opts.stats
          .map(
            (s) => `<div class="stat ${s.tone === 'warn' ? 'warn' : s.tone === 'gold' ? 'gold' : ''}">
          <div class="label">${s.label}</div>
          <div class="value">${s.value}</div>
        </div>`,
          )
          .join('')}
      </div>
    </div>
    ${opts.extraHtml ?? ''}
    <div class="bottom-hint">${opts.hint ?? 'MID-PLAY VISUAL TARGET · NOT FINAL BUILD'}</div>
  `;
  return hud;
}

export function mountFighterHud(p1: number, p2: number, round = 'R2'): void {
  mountStandardHud({
    title: 'Pulse Duel',
    tag: '1v1 Bloodrite Arena',
    stats: [
      { label: 'COMBO', value: '4', tone: 'gold' },
      { label: 'TIMER', value: '0:47' },
    ],
    extraHtml: `
      <div class="bar-wrap">
        <div class="hp"><i style="width:${p1}%"></i></div>
        <div class="round-pip">${round}</div>
        <div class="hp right"><i style="width:${p2}%"></i></div>
      </div>
    `,
  });
}
