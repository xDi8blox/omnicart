import type { GameHooks, GameInstance } from './types';
import { fitParent } from './canvas';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

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
    this.last = performance.now();
    this.onStart();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      if (!this.paused && !this.ended) {
        this.update(dt);
        if (input.just('escape') || input.just('p')) {
          this.pause();
          this.hooks.onPauseChange?.(true);
        }
      }
      this.render();
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
    if (won) audio.win();
    else audio.lose();
    this.hooks.onGameOver(this.score, won);
  }

  protected clear(bg = '#050510'): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, this.w, this.h);
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

  protected abstract onStart(): void;
  protected abstract update(dt: number): void;
  protected abstract render(): void;
  protected onDestroy(): void {}
}
