import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class RingPush extends GameBase {
  private p={x:0,y:0,vx:0,vy:0};
  private e={x:0,y:0,vx:0,vy:0};
  private R=0; private shove=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ff9f1c');}
  protected onStart(){
    this.R=Math.min(this.w,this.h)*0.32;
    this.p={x:this.w/2-40,y:this.h/2,vx:0,vy:0};
    this.e={x:this.w/2+40,y:this.h/2,vx:0,vy:0};
    this.shove=0;
  }
  protected update(dt:number){
    const a=input.axis();
    this.p.vx+=a.x*420*dt; this.p.vy+=a.y*420*dt;
    if(input.actionJust()||input.pointer.justDown){ this.shove=0.2; const ang=Math.atan2(this.e.y-this.p.y,this.e.x-this.p.x); this.p.vx+=Math.cos(ang)*280; this.p.vy+=Math.sin(ang)*280; audio.blip(); }
    this.shove=Math.max(0,this.shove-dt);
    // AI toward player
    const ang=Math.atan2(this.p.y-this.e.y,this.p.x-this.e.x);
    this.e.vx+=Math.cos(ang)*300*dt; this.e.vy+=Math.sin(ang)*300*dt;
    for(const b of [this.p,this.e]){ b.vx*=0.96; b.vy*=0.96; b.x+=b.vx*dt; b.y+=b.vy*dt; }
    const dx=this.e.x-this.p.x, dy=this.e.y-this.p.y, d=Math.hypot(dx,dy)||1;
    if(d<36){ const nx=dx/d, ny=dy/d, overlap=36-d; this.p.x-=nx*overlap/2; this.p.y-=ny*overlap/2; this.e.x+=nx*overlap/2; this.e.y+=ny*overlap/2;
      const push=1.4; this.p.vx-=nx*80*push; this.p.vy-=ny*80*push; this.e.vx+=nx*80*push; this.e.vy+=ny*80*push; audio.hit(); this.addScore(2); }
    const cx=this.w/2, cy=this.h/2;
    if(Math.hypot(this.p.x-cx,this.p.y-cy)>this.R){ audio.hit(); this.gameOver(false); return; }
    if(Math.hypot(this.e.x-cx,this.e.y-cy)>this.R){ this.addScore(100); this.gameOver(true); }
  }
  protected render(){
    this.clear('#140e06');
    const ctx=this.ctx; const cx=this.w/2, cy=this.h/2;
    ctx.strokeStyle='#ff9f1c'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(cx,cy,this.R,0,7); ctx.stroke();
    ctx.fillStyle='#ff9f1c'; ctx.beginPath(); ctx.arc(this.p.x,this.p.y,16,0,7); ctx.fill();
    ctx.fillStyle='#4cc9f0'; ctx.beginPath(); ctx.arc(this.e.x,this.e.y,16,0,7); ctx.fill();
    this.drawHud(this.shove>0?'SHOVE!':'');
  }
}
export const create: GameFactory=(c,h)=>new RingPush(c,h);
