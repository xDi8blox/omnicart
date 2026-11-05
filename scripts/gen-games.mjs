import fs from 'fs';
import path from 'path';

const dir = 'src/games';
fs.mkdirSync(dir, { recursive: true });

const header = (accent) => `import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
`;

function write(id, body) {
  fs.writeFileSync(path.join(dir, `${id}.ts`), body);
  console.log('wrote', id);
}

// ========== 1 Neon Coil ==========
write('neon-coil', `${header()}
class NeonCoil extends GameBase {
  private grid = 20;
  private cellsX = 0;
  private cellsY = 0;
  private snake: { x: number; y: number }[] = [];
  private dir = { x: 1, y: 0 };
  private nextDir = { x: 1, y: 0 };
  private food = { x: 5, y: 5 };
  private tick = 0;
  private speed = 0.12;
  private acc = 0;

  constructor(c: HTMLCanvasElement, h: GameHooks) { super(c, h, '#00ff9c'); }

  protected onStart(): void {
    this.cellsX = Math.floor(this.w / this.grid);
    this.cellsY = Math.floor((this.h - 36) / this.grid);
    const cx = Math.floor(this.cellsX / 2);
    const cy = Math.floor(this.cellsY / 2);
    this.snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.speed = 0.14;
    this.acc = 0;
    this.placeFood();
  }

  private placeFood(): void {
    for (let i = 0; i < 200; i++) {
      const p = { x: Math.floor(Math.random() * this.cellsX), y: Math.floor(Math.random() * this.cellsY) };
      if (!this.snake.some(s => s.x === p.x && s.y === p.y)) { this.food = p; return; }
    }
  }

  protected update(dt: number): void {
    const a = input.axis();
    if (a.x < 0 && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
    if (a.x > 0 && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
    if (a.y < 0 && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
    if (a.y > 0 && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
    // swipe
    if (input.pointer.justDown) this._sx = input.pointer.x; this._sy = input.pointer.y;
    if (input.pointer.justUp) {
      const dx = input.pointer.x - (this._sx ?? 0);
      const dy = input.pointer.y - (this._sy ?? 0);
      if (Math.abs(dx) + Math.abs(dy) > 24) {
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
    while (this.acc >= this.speed) {
      this.acc -= this.speed;
      this.step();
    }
  }
  private _sx = 0; private _sy = 0;

  private step(): void {
    this.dir = this.nextDir;
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= this.cellsX || head.y >= this.cellsY ||
        this.snake.some(s => s.x === head.x && s.y === head.y)) {
      audio.hit();
      this.gameOver(false);
      return;
    }
    this.snake.unshift(head);
    if (head.x === this.food.x && head.y === this.food.y) {
      audio.coin();
      this.addScore(10 + this.snake.length);
      this.speed = Math.max(0.05, this.speed * 0.97);
      this.placeFood();
    } else this.snake.pop();
  }

  protected render(): void {
    this.clear('#061018');
    const ox = (this.w - this.cellsX * this.grid) / 2;
    const oy = 36 + (this.h - 36 - this.cellsY * this.grid) / 2;
    const ctx = this.ctx;
    ctx.fillStyle = '#00ff9c';
    ctx.shadowColor = '#00ff9c';
    ctx.shadowBlur = 8;
    for (const s of this.snake) {
      ctx.fillRect(ox + s.x * this.grid + 1, oy + s.y * this.grid + 1, this.grid - 2, this.grid - 2);
    }
    ctx.fillStyle = '#ff4d6d';
    ctx.shadowColor = '#ff4d6d';
    ctx.fillRect(ox + this.food.x * this.grid + 2, oy + this.food.y * this.grid + 2, this.grid - 4, this.grid - 4);
    ctx.shadowBlur = 0;
    this.drawHud(\`LEN \${this.snake.length}\`);
  }
}
export const create: GameFactory = (c, h) => new NeonCoil(c, h);
`);

// Continue generating more games in this script...
