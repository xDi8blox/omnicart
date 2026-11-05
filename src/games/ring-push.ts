import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class RingPush extends GameBase {
  private p={x:0,y:0,vx:0,vy:0,charge:0,charging:false};
  private e={x:0,y:0,vx:0,vy:0};
  private R=0; private round=1; private pw=0; private ew=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ff9f1c');}
  protected onStart(){ this.round=1; this.pw=0; this.ew=0; this.reset(); }
  private reset(){
    this.R=Math.min(this.w,this.h)*0.32;
    this.p={x:this.w/2-50,y:this.h/2,vx:0,vy:0,charge:0,charging:false};
    this.e={x:this.w/2+50,y:this.h/2,vx:0,vy:0};
  }
  protected update(dt:number){
    const a=input.axis();
    this.p.vx+=a.x*480*dt; this.p.vy+=a.y*480*dt;
    const holding=input.action()||input.pointer.down;
    if(holding){ this.p.charging=true; this.p.charge=Math.min(1,this.p.charge+dt*1.5); }
    else if(this.p.charging){
      const ang=Math.atan2(this.e.y-this.p.y,this.e.x-this.p.x);
      const pow=160+this.p.charge*360;
      this.p.vx+=Math.cos(ang)*pow; this.p.vy+=Math.sin(ang)*pow;
      audio.blip(); this.burst(this.p.x,this.p.y,'#ff9f1c',10);
      this.p.charge=0; this.p.charging=false;
    }
    const ang=Math.atan2(this.p.y-this.e.y,this.p.x-this.e.x);
    this.e.vx+=Math.cos(ang)*(300+this.round*25)*dt; this.e.vy+=Math.sin(ang)*(300+this.round*25)*dt;
    for(const b of [this.p,this.e]){ b.vx*=0.96; b.vy*=0.96; b.x+=b.vx*dt; b.y+=b.vy*dt; }
    const dx=this.e.x-this.p.x, dy=this.e.y-this.p.y, d=Math.hypot(dx,dy)||1;
    if(d<38){
      const nx=dx/d, ny=dy/d, overlap=38-d;
      this.p.x-=nx*overlap/2; this.p.y-=ny*overlap/2; this.e.x+=nx*overlap/2; this.e.y+=ny*overlap/2;
      this.p.vx-=nx*100; this.p.vy-=ny*100; this.e.vx+=nx*100; this.e.vy+=ny*100;
      audio.hit(); this.addScore(3); this.bump(0.1);
    }
    const cx=this.w/2, cy=this.h/2;
    if(Math.hypot(this.p.x-cx,this.p.y-cy)>this.R){ this.ew++; this.bump(0.4); audio.hit(); if(this.ew>=2) this.gameOver(false); else { this.round++; this.reset(); } }
    if(Math.hypot(this.e.x-cx,this.e.y-cy)>this.R){ this.pw++; this.addScore(150); this.burst(this.e.x,this.e.y,'#4cc9f0',22); audio.win(); if(this.pw>=2) this.gameOver(true); else { this.round++; this.reset(); } }
  }
  protected render(){
    this.clear('#140e06');
    const ctx=this.ctx; const cx=this.w/2, cy=this.h/2;
    ctx.strokeStyle='#ff9f1c'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(cx,cy,this.R,0,7); ctx.stroke();
    ctx.fillStyle='#ff9f1c'; ctx.beginPath(); ctx.arc(this.p.x,this.p.y,17,0,7); ctx.fill();
    if(this.p.charge>0){ ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(this.p.x,this.p.y,17+this.p.charge*16,0,7); ctx.stroke(); }
    ctx.fillStyle='#4cc9f0'; ctx.beginPath(); ctx.arc(this.e.x,this.e.y,17,0,7); ctx.fill();
    this.drawHud(`R${this.round} YOU ${this.pw} · CPU ${this.ew}`);
  }
}
export const create: GameFactory=(c,h)=>new RingPush(c,h);
