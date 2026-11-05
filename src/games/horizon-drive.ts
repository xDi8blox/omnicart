import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class HorizonDrive extends GameBase {
  private z=0; private pos=0; private speed=0; private cars:{z:number;lane:number}[]=[];
  private curve=0; private t=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#f15bb5');}
  protected onStart(){
    this.z=0; this.pos=0; this.speed=0; this.t=0; this.curve=0;
    this.cars=Array.from({length:8},(_,i)=>({z:400+i*500,lane:(Math.random()*3|0)-1}));
  }
  protected update(dt:number){
    this.t+=dt;
    if(input.pressed('arrowup')||input.pressed('w')) this.speed=Math.min(320,this.speed+120*dt);
    else this.speed=Math.max(40,this.speed-40*dt);
    if(input.pressed('arrowleft')||input.pressed('a')) this.pos-=(1.6)*dt;
    if(input.pressed('arrowright')||input.pressed('d')) this.pos+=(1.6)*dt;
    this.pos=Math.max(-1.3,Math.min(1.3,this.pos));
    this.z+=this.speed*dt; this.curve=Math.sin(this.z*0.002)*0.6;
    this.setScore(Math.floor(this.z/10));
    for(const c of this.cars){
      const rel=c.z-this.z;
      if(rel<40 && rel>-10 && Math.abs(c.lane-this.pos)<0.45){ audio.boom(); this.gameOver(false); return; }
      if(rel<-50) c.z=this.z+800+Math.random()*600;
    }
  }
  protected render(){
    this.clear('#120818');
    const ctx=this.ctx; const horizon=this.h*0.42;
    // sky
    const g=ctx.createLinearGradient(0,0,0,horizon); g.addColorStop(0,'#1a0830'); g.addColorStop(1,'#f15bb5');
    ctx.fillStyle=g; ctx.fillRect(0,0,this.w,horizon);
    // road segments
    for(let i=60;i>=0;i--){
      const p=i/60; const y=horizon + (this.h-horizon)*p*p;
      const scale=p*p; const roadW=this.w*(0.1+0.7*scale); const curb=roadW*0.05;
      const bend=this.curve*(1-p)*80;
      const cx=this.w/2 + bend - this.pos*40*scale;
      ctx.fillStyle=i%2?'#2a1830':'#221028';
      ctx.fillRect(cx-roadW/2,y,roadW, (this.h-horizon)/40 + 2);
      ctx.fillStyle='#f15bb5'; ctx.fillRect(cx-roadW/2,y,curb,4); ctx.fillRect(cx+roadW/2-curb,y,curb,4);
    }
    for(const c of this.cars){
      const rel=(c.z-this.z)/900; if(rel<0||rel>1) continue;
      const p=1-rel; const y=horizon+(this.h-horizon)*p*p; const scale=p*p;
      const bend=this.curve*(1-p)*80; const cx=this.w/2+bend+(c.lane-this.pos)*90*scale;
      ctx.fillStyle='#ffe66b'; ctx.fillRect(cx-18*scale,y-20*scale,36*scale,20*scale);
    }
    // player car
    ctx.fillStyle='#00f0ff'; ctx.fillRect(this.w/2-28,this.h-70,56,36);
    this.drawHud(`${Math.floor(this.speed)} MPH`);
  }
}
export const create: GameFactory=(c,h)=>new HorizonDrive(c,h);
