import type { GameFactory, GameHooks } from '../core/types';
import { GameBase } from '../core/GameBase';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import { fillVoidBg, glowCircle, roundRect, drawPremiumHud } from '../shared/fx';

type Brick = { x: number; y: number; w: number; h: number; hp: number; c0: string; c1: string };
type Ball = { x: number; y: number; vx: number; vy: number };
type Pow = { x: number; y: number; vy: number; kind: 'multi' | 'wide' | 'laser' };

const PAL = [
  ['#ff2040', '#ff8a9a'], ['#ff2bd6', '#ff9ae8'], ['#00e8ff', '#9af0ff'],
  ['#f0c14b', '#ffe6a0'], ['#7cff6b', '#c8ffb8'], ['#8a5cff', '#cbb0ff'], ['#ff8a1a', '#ffd0a0'],
];

class PrismBreaker extends GameBase {
  private bricks: Brick[] = [];
  private balls: Ball[] = [];
  private pows: Pow[] = [];
  private paddleX = 0;
  private paddleW = 120;
  private level = 1;
  private lives = 3;
  private launched = false;
  private laser = 0;
  private started = false;
  private laserCd = 0;

  constructor(c: HTMLCanvasElement, h: GameHooks) { super(c, h, '#ff2bd6'); }

  protected onStart(): void {
    this.level = 1; this.lives = 3; this.score = 0; this.started = false;
    this.buildLevel(); this.resetBall();
  }

  private buildLevel(): void {
    this.bricks = [];
    const cols = 10; const rows = Math.min(8, 4 + this.level);
    const bw = Math.min(84, (this.w - 80) / cols - 6); const bh = 26; const gap = 6;
    const ox = (this.w - cols * (bw + gap)) / 2;
    const oy = 70;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (this.level > 2 && r === 2 && c > 2 && c < 7 && Math.random() < 0.3) continue;
      const [c0, c1] = PAL[r % PAL.length];
      const hp = r < 1 && this.level > 1 ? 2 : 1;
      this.bricks.push({ x: ox + c * (bw + gap), y: oy + r * (bh + gap), w: bw, h: bh, hp, c0, c1 });
    }
    this.pows = []; this.laser = 0; this.paddleW = 120;
  }

  private resetBall(): void {
    this.paddleX = this.w / 2 - this.paddleW / 2;
    this.balls = [{ x: this.w / 2, y: this.h - 90, vx: 0, vy: 0 }];
    this.launched = false;
  }

  protected update(dt: number): void {
    if (!this.started) {
      if (input.actionJust() || input.pointer.justDown) { this.started = true; audio.blip(); }
      return;
    }
    const ax = input.axis().x;
    this.paddleX += ax * 420 * dt;
    if (input.pointer.down) this.paddleX = input.pointer.x - this.paddleW / 2;
    this.paddleX = Math.max(40, Math.min(this.w - 40 - this.paddleW, this.paddleX));
    const py = this.h - 70;

    if (!this.launched) {
      this.balls[0].x = this.paddleX + this.paddleW / 2;
      this.balls[0].y = py - 14;
      if (input.actionJust() || input.pointer.justDown) {
        this.launched = true;
        this.balls[0].vx = 180 + Math.random() * 40;
        this.balls[0].vy = -320 - this.level * 12;
        audio.blip(440);
      }
      return;
    }

    this.laser = Math.max(0, this.laser - dt);
    this.laserCd = Math.max(0, this.laserCd - dt);
    if (this.laser > 0 && input.actionJust() && this.laserCd <= 0) {
      this.laserCd = 0.2;
      audio.blip(900);
      for (const b of this.bricks) {
        if (b.x < this.paddleX + this.paddleW / 2 && b.x + b.w > this.paddleX + this.paddleW / 2) {
          b.hp--; this.addScore(20);
          this.burst(b.x + b.w / 2, b.y + b.h / 2, b.c0, 8);
        }
      }
      this.bricks = this.bricks.filter(b => b.hp > 0);
    }

    for (const ball of this.balls) {
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < 48) { ball.x = 48; ball.vx = Math.abs(ball.vx); }
      if (ball.x > this.w - 48) { ball.x = this.w - 48; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < 58) { ball.y = 58; ball.vy = Math.abs(ball.vy); }
      if (ball.y > py - 8 && ball.y < py + 12 && ball.x > this.paddleX && ball.x < this.paddleX + this.paddleW && ball.vy > 0) {
        ball.vy = -Math.abs(ball.vy);
        ball.vx += (ball.x - (this.paddleX + this.paddleW / 2)) * 4;
        ball.vx = Math.max(-420, Math.min(420, ball.vx));
        audio.blip(520);
      }
      for (const b of this.bricks) {
        if (ball.x > b.x && ball.x < b.x + b.w && ball.y > b.y && ball.y < b.y + b.h) {
          b.hp--; ball.vy *= -1; ball.y += ball.vy * dt;
          audio.hit(); this.addScore(10 * this.level);
          this.burst(b.x + b.w / 2, b.y + b.h / 2, b.c0, 12);
          if (b.hp <= 0 && Math.random() < 0.18) {
            const kinds: Pow['kind'][] = ['multi', 'wide', 'laser'];
            this.pows.push({ x: b.x + b.w / 2, y: b.y, vy: 140, kind: kinds[(Math.random() * 3) | 0] });
          }
        }
      }
    }
    this.bricks = this.bricks.filter(b => b.hp > 0);
    this.balls = this.balls.filter(b => b.y < this.h + 20);
    if (!this.balls.length) {
      this.lives--; audio.lose();
      if (this.lives <= 0) { this.gameOver(false); return; }
      this.resetBall();
    }
    for (const p of this.pows) {
      p.y += p.vy * dt;
      if (p.y > py && p.y < py + 18 && p.x > this.paddleX && p.x < this.paddleX + this.paddleW) {
        audio.powerup();
        if (p.kind === 'multi') {
          const src = this.balls[0];
          if (src) this.balls.push({ x: src.x, y: src.y, vx: -src.vx, vy: src.vy }, { x: src.x, y: src.y, vx: src.vx * 0.7, vy: src.vy });
        } else if (p.kind === 'wide') this.paddleW = Math.min(200, this.paddleW + 40);
        else this.laser = 8;
        p.y = 9999;
      }
    }
    this.pows = this.pows.filter(p => p.y < this.h);
    if (!this.bricks.length) {
      this.level++; audio.win(); this.addScore(250 * this.level); this.buildLevel(); this.resetBall();
    }
  }

  protected render(): void {
    fillVoidBg(this.ctx, this.w, this.h);
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255,32,64,0.4)'; ctx.lineWidth = 2;
    roundRect(ctx, 36, 56, this.w - 72, this.h - 70, 10); ctx.stroke();
    for (const b of this.bricks) {
      const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      g.addColorStop(0, b.c1); g.addColorStop(0.45, b.c0); g.addColorStop(1, '#1a0810');
      ctx.fillStyle = g; roundRect(ctx, b.x, b.y, b.w, b.h, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; roundRect(ctx, b.x + 4, b.y + 3, b.w - 8, 6, 3); ctx.fill();
      if (b.hp > 1) { ctx.strokeStyle = '#fff'; ctx.stroke(); }
    }
    for (const p of this.pows) {
      glowCircle(ctx, p.x, p.y, 16, p.kind === 'laser' ? 'rgba(255,32,64,0.7)' : p.kind === 'wide' ? 'rgba(0,232,255,0.7)' : 'rgba(240,193,75,0.7)');
      ctx.fillStyle = '#fff'; ctx.font = '10px Orbitron'; ctx.textAlign = 'center';
      ctx.fillText(p.kind[0].toUpperCase(), p.x, p.y + 3);
    }
    const py = this.h - 70;
    const pg = ctx.createLinearGradient(this.paddleX, py, this.paddleX, py + 16);
    pg.addColorStop(0, '#fff'); pg.addColorStop(0.3, '#00e8ff'); pg.addColorStop(1, '#003344');
    ctx.fillStyle = pg; roundRect(ctx, this.paddleX, py, this.paddleW, 16, 8); ctx.fill();
    glowCircle(ctx, this.paddleX + this.paddleW / 2, py + 8, 36, 'rgba(0,232,255,0.3)');
    if (this.laser > 0) {
      ctx.strokeStyle = 'rgba(255,32,64,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.paddleX + this.paddleW / 2, py); ctx.lineTo(this.paddleX + this.paddleW / 2, 60); ctx.stroke();
    }
    for (const b of this.balls) {
      glowCircle(ctx, b.x, b.y, 18, 'rgba(0,232,255,0.7)');
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    drawPremiumHud(ctx, this.w, {
      title: 'Prism Breaker',
      stats: [
        { label: 'SCORE', value: String(this.score), color: '#f0c14b' },
        { label: 'BALLS', value: String(this.lives), color: '#00e8ff' },
        { label: 'LVL', value: String(this.level), color: '#ff2bd6' },
      ],
    });
    if (!this.started) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, this.w, this.h);
      ctx.fillStyle = '#fff'; ctx.font = '800 26px Orbitron'; ctx.textAlign = 'center';
      ctx.fillText('PRISM BREAKER', this.w / 2, this.h / 2 - 10);
      ctx.fillStyle = '#9a8aa8'; ctx.font = '600 14px Rajdhani';
      ctx.fillText('Space / tap to launch', this.w / 2, this.h / 2 + 18);
    }
  }
}
export const create: GameFactory = (c, h) => new PrismBreaker(c, h);
