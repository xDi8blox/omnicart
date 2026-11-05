import type { GameHooks, GameInstance } from './types';
import { fitParent } from './canvas';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };

export abstract class GameBase implements GameInstance {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected hooks: GameHooks;
  protected w = 800;
  protected h = 450;
  protected running = false;
  protected paused = false;
  protected score = 0;
  protected ended = false;
  protected raf = 0;
  protected last = 0;
  protected accent = '#00f0ff';
  protected particles: Particle[] = [];
  protected shake = 0;
  private onResize = () => this.layout();

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks, accent = '#00f0ff') {
    this.canvas = canvas;
    this.hooks = hooks;
    this.accent = accent;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d context required');
    this.ctx = ctx;
  }

  protected layout(): void {
    const parent = this.canvas.parentElement ?? document.body;
    const { w, h } = fitParent(this.canvas, parent, 16 / 9);
    this.w = w;
    this.h = h;
    this.canvas.dataset.cssW = String(w);
    this.canvas.dataset.cssH = String(h);
  }

  start(): void {
    this.layout();
    window.addEventListener('resize', this.onResize);
    input.attach(this.canvas);
    audio.ensure();
    this.running = true;
    this.paused = false;
    this.ended = false;
    this.score = 0;
    this.particles = [];
    this.shake = 0;
    this.last = performance.now();
    this.onStart();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      if (!this.paused && !this.ended) {
        this.update(dt);
        this.updateJuice(dt);
        if (input.just('escape') || input.just('p')) {
          this.pause();
          this.hooks.onPauseChange?.(true);
        }
      } else {
        this.updateJuice(dt);
      }
      this.render();
      this.drawParticles();
      input.endFrame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause(): void {
    this.paused = true;
  }
  resume(): void {
    this.paused = false;
    this.last = performance.now();
  }
  restart(): void {
    this.ended = false;
    this.paused = false;
    this.score = 0;
    this.particles = [];
    this.shake = 0;
    this.onStart();
    this.hooks.onScore(0);
  }
  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    input.detach();
    this.onDestroy();
  }
  getScore(): number {
    return this.score;
  }

  protected setScore(n: number): void {
    this.score = Math.max(0, Math.floor(n));
    this.hooks.onScore(this.score);
  }
  protected addScore(n: number): void {
    this.setScore(this.score + n);
  }
  protected gameOver(won = false): void {
    if (this.ended) return;
    this.ended = true;
    if (won) {
      audio.win();
      this.burst(this.w / 2, this.h / 2, this.accent, 40);
    } else {
      audio.lose();
      this.shake = 0.45;
    }
    this.hooks.onGameOver(this.score, won);
  }

  protected clear(bg = '#050510'): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, this.w, this.h);
    if (this.shake > 0) {
      const mag = this.shake * 10;
      this.ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
  }

  protected drawHud(extra = ''): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, this.w, 36);
    ctx.fillStyle = this.accent;
    ctx.font = 'bold 16px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${this.score}`, 12, 24);
    if (extra) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.fillText(extra, this.w - 12, 24);
    }
  }

  protected burst(x: number, y: number, color: string, n = 16): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 180;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.4 + Math.random() * 0.5, max: 0.9, color, size: 2 + Math.random() * 3,
      });
    }
  }

  protected bump(amount = 0.25): void {
    this.shake = Math.max(this.shake, amount);
  }

  private updateJuice(dt: number): void {
    this.shake = Math.max(0, this.shake - dt);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  protected abstract onStart(): void;
  protected abstract update(dt: number): void;
  protected abstract render(): void;
  protected onDestroy(): void {}
}
