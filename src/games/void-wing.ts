import type { GameFactory, GameHooks } from '../core/types';
import { GameBase } from '../core/GameBase';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import { fillVoidBg, glowCircle, drawPremiumHud } from '../shared/fx';

type Bullet = { x: number; y: number; vx: number; vy: number; enemy: boolean; r: number; c: string };
type Enemy = { x: number; y: number; hp: number; kind: 'grunt' | 'boss1' | 'boss2'; t: number; phase: number };
type Star = { x: number; y: number; z: number };

class VoidWing extends GameBase {
  private px = 0; private py = 0;
  private bullets: Bullet[] = [];
  private enemies: Enemy[] = [];
  private stars: Star[] = [];
  private wave = 1; private lives = 3; private fireCd = 0;
  private waveClear = 0; private started = false; private invuln = 0;
  private bossHp = 0; private bossMax = 0;

  constructor(c: HTMLCanvasElement, h: GameHooks) { super(c, h, '#ff8a1a'); }

  protected onStart(): void {
    this.px = this.w/2; this.py = this.h*0.78; this.wave = 1; this.lives = 3;
    this.bullets = []; this.enemies = []; this.started = false; this.invuln = 0;
    this.stars = Array.from({length:100}, () => ({ x: Math.random()*this.w, y: Math.random()*this.h, z: 0.4+Math.random()*1.4 }));
    this.spawnWave();
  }

  private spawnWave(): void {
    this.enemies = []; this.waveClear = 0;
    if (this.wave === 3) { this.bossMax = this.bossHp = 80; this.enemies.push({ x: this.w/2, y: 130, hp: 80, kind: 'boss1', t: 0, phase: 0 }); return; }
    if (this.wave === 6 || this.wave % 6 === 0) { this.bossMax = this.bossHp = 120 + this.wave*8; this.enemies.push({ x: this.w/2, y: 140, hp: this.bossMax, kind: 'boss2', t: 0, phase: 0 }); return; }
    const n = 4 + this.wave;
    for (let i = 0; i < n; i++) {
      this.enemies.push({ x: 80 + (i % 6) * ((this.w-160)/5), y: 90 + Math.floor(i/6)*50, hp: 2 + Math.floor(this.wave/2), kind: 'grunt', t: Math.random()*3, phase: i });
    }
  }

  private ring(cx: number, cy: number, n: number, sp: number, phase: number, c: string): void {
    for (let i = 0; i < n; i++) {
      const a = phase + (i/n)*Math.PI*2;
      this.bullets.push({ x: cx, y: cy, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, enemy: true, r: 5, c });
    }
  }

  protected update(dt: number): void {
    if (!this.started) { if (input.actionJust() || input.pointer.justDown) { this.started = true; audio.blip(); } return; }
    const ax = input.axis();
    this.px = Math.max(30, Math.min(this.w-30, this.px + ax.x * 340 * dt));
    this.py = Math.max(70, Math.min(this.h-40, this.py + ax.y * 300 * dt));
    if (input.pointer.down) { this.px += (input.pointer.x - this.px)*Math.min(1, dt*8); this.py += (input.pointer.y - this.py)*Math.min(1, dt*8); }
    this.fireCd -= dt; this.invuln = Math.max(0, this.invuln - dt);
    if ((input.action() || input.pointer.down) && this.fireCd <= 0) {
      this.fireCd = 0.14; audio.blip(880);
      this.bullets.push({ x: this.px, y: this.py-20, vx: 0, vy: -520, enemy: false, r: 4, c: 'rgba(0,232,255,1)' });
      this.bullets.push({ x: this.px-12, y: this.py-8, vx: -30, vy: -480, enemy: false, r: 3, c: 'rgba(0,255,200,0.9)' });
      this.bullets.push({ x: this.px+12, y: this.py-8, vx: 30, vy: -480, enemy: false, r: 3, c: 'rgba(0,255,200,0.9)' });
    }
    for (const s of this.stars) { s.y += s.z*50*dt; if (s.y > this.h) { s.y = 0; s.x = Math.random()*this.w; } }
    for (const e of this.enemies) {
      e.t += dt;
      if (e.kind === 'grunt') {
        e.x += Math.sin(e.t*1.5 + e.phase)*40*dt; e.y += 18*dt;
        if (e.t > 1.2) { e.t = 0; this.bullets.push({ x: e.x, y: e.y, vx: (this.px-e.x)*0.35, vy: 160, enemy: true, r: 5, c: 'rgba(255,32,64,0.95)' }); }
      } else if (e.kind === 'boss1') {
        e.x = this.w/2 + Math.sin(e.t*0.8)*160;
        if (e.t > 0.55) { e.t = 0; e.phase++; this.ring(e.x, e.y+20, 14, 150, e.phase*0.2, 'rgba(255,32,64,0.95)'); this.ring(e.x, e.y+20, 8, 95, e.phase*0.2+0.3, 'rgba(255,140,40,0.95)'); }
        this.bossHp = e.hp;
      } else {
        e.x = this.w/2 + Math.sin(e.t*0.6)*180; e.y = 140 + Math.sin(e.t*1.2)*18;
        if (e.t > 0.4) { e.t = 0; e.phase++; this.ring(e.x, e.y, 18, 170, e.phase*0.15, 'rgba(255,43,214,0.95)');
          for (let i=0;i<5;i++) this.bullets.push({ x: e.x, y: e.y, vx: (i-2)*40, vy: 200, enemy: true, r: 6, c: 'rgba(0,232,255,0.9)' }); }
        this.bossHp = e.hp;
      }
      if (e.y > this.h+40) e.hp = 0;
    }
    for (const b of this.bullets) { b.x += b.vx*dt; b.y += b.vy*dt; }
    for (const b of this.bullets) if (!b.enemy) {
      for (const e of this.enemies) {
        const hitR = e.kind==='grunt'?22:70;
        if (Math.hypot(b.x-e.x,b.y-e.y)<hitR) { e.hp--; b.y = -999; this.addScore(e.kind==='grunt'?25:8); this.burst(b.x,b.y,'#00e8ff',6); audio.hit(); }
      }
    }
    if (this.invuln <= 0) {
      for (const b of this.bullets) if (b.enemy && Math.hypot(b.x-this.px,b.y-this.py)<16) {
        b.y = 9999; this.lives--; this.invuln = 1.4; audio.boom(); this.bump(0.45);
        if (this.lives <= 0) { this.gameOver(false); return; }
      }
      for (const e of this.enemies) if (Math.hypot(e.x-this.px,e.y-this.py)<(e.kind==='grunt'?28:60)) {
        this.lives--; this.invuln = 1.4; audio.boom(); if (this.lives <= 0) { this.gameOver(false); return; }
      }
    }
    this.bullets = this.bullets.filter(b => b.x>-40 && b.x<this.w+40 && b.y>-40 && b.y<this.h+40);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (!this.enemies.length) {
      this.waveClear += dt;
      if (this.waveClear > 0.8) { this.wave++; this.addScore(200*this.wave); audio.powerup(); this.spawnWave(); }
    }
  }

  private drawShip(x: number, y: number): void {
    const ctx = this.ctx; glowCircle(ctx, x, y, 42, 'rgba(0,232,255,0.5)');
    ctx.save(); ctx.translate(x,y);
    const g = ctx.createLinearGradient(0,-28,0,24); g.addColorStop(0,'#e8ffff'); g.addColorStop(0.4,'#00e8ff'); g.addColorStop(1,'#004466');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(0,-28); ctx.lineTo(14,8); ctx.lineTo(7,6); ctx.lineTo(9,20); ctx.lineTo(0,12); ctx.lineTo(-9,20); ctx.lineTo(-7,6); ctx.lineTo(-14,8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff2040'; ctx.beginPath(); ctx.moveTo(-16,4); ctx.lineTo(-26,12); ctx.lineTo(-10,8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(16,4); ctx.lineTo(26,12); ctx.lineTo(10,8); ctx.fill();
    glowCircle(ctx, 0, 14, 16, 'rgba(255,140,40,0.75)'); ctx.restore();
  }

  private drawBoss(e: Enemy): void {
    const ctx = this.ctx; glowCircle(ctx, e.x, e.y, e.kind==='boss2'?120:100, e.kind==='boss2'?'rgba(255,43,214,0.4)':'rgba(255,32,64,0.45)');
    ctx.save(); ctx.translate(e.x, e.y);
    const body = ctx.createRadialGradient(0,0,10,0,0,70);
    body.addColorStop(0, e.kind==='boss2'?'#ffa0ff':'#ff6688'); body.addColorStop(0.4, e.kind==='boss2'?'#880066':'#aa0022'); body.addColorStop(1,'#2a0010');
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0,0, e.kind==='boss2'?86:74, 48, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#6a1030';
    ctx.beginPath(); ctx.moveTo(-70,0); ctx.quadraticCurveTo(-140,-40,-155,10); ctx.quadraticCurveTo(-100,30,-70,18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(70,0); ctx.quadraticCurveTo(140,-40,155,10); ctx.quadraticCurveTo(100,30,70,18); ctx.fill();
    glowCircle(ctx,-22,-8,14,'rgba(0,232,255,0.9)','#fff'); glowCircle(ctx,22,-8,14,'rgba(0,232,255,0.9)','#fff');
    glowCircle(ctx,0,12,26,'rgba(255,200,40,0.8)'); ctx.restore();
  }

  protected render(): void {
    fillVoidBg(this.ctx, this.w, this.h); const ctx = this.ctx;
    for (let i=0;i<4;i++){ const g=ctx.createRadialGradient(this.w*(0.2+i*0.2), this.h*(0.25+(i%2)*0.2), 10, this.w*(0.2+i*0.2), this.h*(0.25+(i%2)*0.2), 200);
      g.addColorStop(0, i%2?'rgba(255,32,64,0.1)':'rgba(80,0,120,0.12)'); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,this.w,this.h); }
    for (const s of this.stars) { ctx.fillStyle=`rgba(220,200,255,${0.3+s.z*0.35})`; ctx.fillRect(s.x,s.y,s.z,s.z*2); }
    for (const e of this.enemies) { if (e.kind==='grunt') { glowCircle(ctx,e.x,e.y,22,'rgba(255,80,40,0.55)'); ctx.fillStyle='#ff6644'; ctx.beginPath(); ctx.moveTo(e.x,e.y+12); ctx.lineTo(e.x-12,e.y-10); ctx.lineTo(e.x+12,e.y-10); ctx.fill(); } else this.drawBoss(e); }
    for (const b of this.bullets) { glowCircle(ctx,b.x,b.y,b.r*2.6,b.c); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r*0.4,0,Math.PI*2); ctx.fill(); }
    if (this.invuln<=0 || Math.floor(this.invuln*10)%2===0) this.drawShip(this.px,this.py);
    if (this.enemies.some(e=>e.kind!=='grunt')) {
      ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(this.w*0.2,58,this.w*0.6,8);
      const hg=ctx.createLinearGradient(this.w*0.2,0,this.w*0.8,0); hg.addColorStop(0,'#ff2040'); hg.addColorStop(1,'#ff8a1a');
      ctx.fillStyle=hg; ctx.fillRect(this.w*0.2,58,this.w*0.6*(this.bossHp/Math.max(1,this.bossMax)),8);
    }
    drawPremiumHud(ctx, this.w, { title: 'Void Wing', stats: [
      { label:'SCORE', value:String(this.score), color:'#f0c14b' },
      { label:'LIVES', value:'◆'.repeat(this.lives)+'◇'.repeat(Math.max(0,3-this.lives)), color:'#ff2040' },
      { label:'WAVE', value:String(this.wave), color:'#00e8ff' },
    ]});
    if (!this.started) {
      ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,this.w,this.h);
      ctx.fillStyle='#fff'; ctx.font='800 26px Orbitron'; ctx.textAlign='center'; ctx.fillText('VOID WING', this.w/2, this.h/2-10);
      ctx.fillStyle='#9a8aa8'; ctx.font='600 14px Rajdhani'; ctx.fillText('Survive waves · defeat Ashen Maw & Prism Coil', this.w/2, this.h/2+18);
    }
  }
}
export const create: GameFactory = (c,h)=>new VoidWing(c,h);
