import type { GameFactory } from '../core/types';
import { GameBase } from '../core/GameBase';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import { fillVoidBg, glowCircle, drawPremiumHud } from '../shared/fx';

type Pt = { x: number; y: number };

class NeonCoil extends GameBase {
  private cols = 28;
  private rows = 16;
  private cell = 24;
  private ox = 0;
  private oy = 0;
  private snake: Pt[] = [];
  private dir: Pt = { x: 1, y: 0 };
  private nextDir: Pt = { x: 1, y: 0 };
  private gems: Pt[] = [];
  private hazards: Pt[] = [];
  private acc = 0;
  private stepMs = 0.14;
  private level = 1;
  private sx = 0;
  private sy = 0;
  private started = false;

  constructor(c: HTMLCanvasElement, h: import('../core/types').GameHooks) {
    super(c, h, '#7cff6b');
  }

  protected onStart(): void {
    this.level = 1;
    this.started = false;
    this.buildLevel();
  }

  private buildLevel(): void {
    this.cols = Math.min(36, 24 + this.level);
    this.rows = Math.min(20, 14 + Math.floor(this.level / 2));
    this.cell = Math.floor(Math.min((this.w - 40) / this.cols, (this.h - 90) / this.rows));
    this.ox = (this.w - this.cols * this.cell) / 2;
    this.oy = 58 + (this.h - 58 - this.rows * this.cell) / 2;
    this.snake = [];
    for (let i = 0; i < 4; i++) this.snake.push({ x: 4 - i, y: Math.floor(this.rows / 2) });
    this.dir = { x: 1, y: 0 };
    this.nextDir = { ...this.dir };
    this.stepMs = Math.max(0.055, 0.15 - this.level * 0.008);
    this.acc = 0;
    this.hazards = [];
    const hz = 2 + this.level;
    for (let i = 0; i < hz; i++) {
      const p = this.randEmpty();
      if (p) this.hazards.push(p);
    }
    this.gems = [];
    for (let i = 0; i < 3; i++) this.placeGem();
  }

  private occupied(x: number, y: number): boolean {
    return (
      this.snake.some((s) => s.x === x && s.y === y) ||
      this.hazards.some((h) => h.x === x && h.y === y) ||
      this.gems.some((g) => g.x === x && g.y === y)
    );
  }

  private randEmpty(): Pt | null {
    for (let t = 0; t < 80; t++) {
      const x = 1 + ((Math.random() * (this.cols - 2)) | 0);
      const y = 1 + ((Math.random() * (this.rows - 2)) | 0);
      if (!this.occupied(x, y)) return { x, y };
    }
    return null;
  }

  private placeGem(): void {
    const p = this.randEmpty();
    if (p) this.gems.push(p);
  }

  protected update(dt: number): void {
    if (!this.started) {
      if (input.just(' ') || input.just('enter') || input.pointer.justDown || input.anyDir()) {
        this.started = true;
        audio.blip(520);
      }
      return;
    }
    if (input.left() && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
    if (input.right() && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
    if (input.up() && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
    if (input.down() && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
    if (input.pointer.justDown) {
      this.sx = input.pointer.x;
      this.sy = input.pointer.y;
    }
    if (input.pointer.down) {
      const dx = input.pointer.x - this.sx;
      const dy = input.pointer.y - this.sy;
      if (Math.abs(dx) + Math.abs(dy) > 22) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0 && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
          if (dx > 0 && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
        } else {
          if (dy < 0 && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
          if (dy > 0 && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
        }
      }
    }
    this.acc += dt;
    while (this.acc >= this.stepMs) {
      this.acc -= this.stepMs;
      this.step();
      if (this.ended) return;
    }
  }

  private step(): void {
    this.dir = this.nextDir;
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= this.cols ||
      head.y >= this.rows ||
      this.snake.some((s) => s.x === head.x && s.y === head.y) ||
      this.hazards.some((h) => h.x === head.x && h.y === head.y)
    ) {
      audio.hit();
      this.bump(0.4);
      this.gameOver(false);
      return;
    }
    this.snake.unshift(head);
    const gi = this.gems.findIndex((g) => g.x === head.x && g.y === head.y);
    if (gi >= 0) {
      audio.coin();
      this.gems.splice(gi, 1);
      this.addScore(10 + this.snake.length + this.level * 5);
      this.burst(this.ox + head.x * this.cell + this.cell / 2, this.oy + head.y * this.cell + this.cell / 2, '#f0c14b', 14);
      this.placeGem();
      if (this.snake.length >= 8 + this.level * 6) {
        this.level++;
        audio.powerup();
        this.addScore(100 * this.level);
        this.buildLevel();
      }
    } else this.snake.pop();
  }

  protected render(): void {
    fillVoidBg(this.ctx, this.w, this.h);
    const ctx = this.ctx;
    // arena
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        ctx.fillStyle = (x + y) % 2 ? 'rgba(30,12,28,0.92)' : 'rgba(18,8,22,0.92)';
        ctx.fillRect(this.ox + x * this.cell, this.oy + y * this.cell, this.cell, this.cell);
      }
    }
    ctx.strokeStyle = 'rgba(255,32,64,0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(this.ox - 3, this.oy - 3, this.cols * this.cell + 6, this.rows * this.cell + 6);

    for (const hz of this.hazards) {
      const px = this.ox + hz.x * this.cell + this.cell / 2;
      const py = this.oy + hz.y * this.cell + this.cell / 2;
      glowCircle(ctx, px, py, this.cell * 0.7, 'rgba(255,32,64,0.5)');
      ctx.fillStyle = '#3a0810';
      ctx.beginPath();
      ctx.moveTo(px, py - this.cell * 0.32);
      ctx.lineTo(px + this.cell * 0.28, py + this.cell * 0.28);
      ctx.lineTo(px - this.cell * 0.28, py + this.cell * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ff2040';
      ctx.stroke();
    }
    for (const g of this.gems) {
      const px = this.ox + g.x * this.cell + this.cell / 2;
      const py = this.oy + g.y * this.cell + this.cell / 2;
      glowCircle(ctx, px, py, this.cell * 0.65, 'rgba(240,193,75,0.65)');
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(performance.now() * 0.002);
      ctx.fillStyle = '#f0c14b';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * this.cell * 0.28, Math.sin(a) * this.cell * 0.28);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < this.snake.length; i++) {
      const s = this.snake[i];
      const px = this.ox + s.x * this.cell + this.cell / 2;
      const py = this.oy + s.y * this.cell + this.cell / 2;
      const t = 1 - i / Math.max(1, this.snake.length);
      const r = this.cell * (0.28 + t * 0.18);
      const col = t > 0.85 ? 'rgba(255,255,200,0.95)' : t > 0.45 ? 'rgba(0,232,255,0.85)' : 'rgba(255,32,64,0.75)';
      glowCircle(ctx, px, py, r * 2.1, col);
      const grd = ctx.createRadialGradient(px - 3, py - 3, 1, px, py, r);
      grd.addColorStop(0, '#fff');
      grd.addColorStop(0.4, t > 0.45 ? '#00e8ff' : '#ff4060');
      grd.addColorStop(1, '#1a0520');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const head = this.snake[0];
    if (head) {
      const hx = this.ox + head.x * this.cell + this.cell / 2;
      const hy = this.oy + head.y * this.cell + this.cell / 2;
      glowCircle(ctx, hx, hy, this.cell * 0.9, 'rgba(255,240,180,0.45)');
      ctx.fillStyle = '#050208';
      ctx.beginPath();
      ctx.arc(hx + this.dir.x * 4 - this.dir.y * 4, hy + this.dir.y * 4 + this.dir.x * 4, 2.2, 0, Math.PI * 2);
      ctx.arc(hx + this.dir.x * 4 + this.dir.y * 4, hy + this.dir.y * 4 - this.dir.x * 4, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    drawPremiumHud(ctx, this.w, {
      title: 'Neon Coil',
      stats: [
        { label: 'SCORE', value: String(this.score), color: '#f0c14b' },
        { label: 'LEN', value: String(this.snake.length), color: '#00e8ff' },
        { label: 'LVL', value: String(this.level), color: '#ff2040' },
      ],
    });
    if (!this.started) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.fillStyle = '#fff';
      ctx.font = '800 28px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NEON COIL', this.w / 2, this.h / 2 - 12);
      ctx.fillStyle = '#9a8aa8';
      ctx.font = '600 14px Rajdhani, sans-serif';
      ctx.fillText('Tap / Space to start · swipe to steer', this.w / 2, this.h / 2 + 18);
    }
  }
}

export const create: GameFactory = (c, h) => new NeonCoil(c, h);
