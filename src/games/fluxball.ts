import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class Fluxball extends GameBase {
  private ball={x:0,y:0,vx:0,vy:0,r:8};
  private left=false; private right=false; private launched=false;
  private bumpers:{x:number;y:number;r:number;flash:number}[]=[];
  private flipL={x:0,y:0}; private flipR={x:0,y:0};
  private walls:{x1:number;y1:number;x2:number;y2:number}[]=[];
  private combo=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ff4d6d');}
  protected onStart(){
    this.launched=false; this.combo=0;
    this.ball={x:this.w-28,y:this.h-90,vx:0,vy:0,r:8};
    this.flipL={x:this.w*0.30,y:this.h-48}; this.flipR={x:this.w*0.70,y:this.h-48};
    this.bumpers=[
      {x:this.w*0.5,y:this.h*0.32,r:20,flash:0},{x:this.w*0.32,y:this.h*0.48,r:16,flash:0},
      {x:this.w*0.68,y:this.h*0.48,r:16,flash:0},{x:this.w*0.5,y:this.h*0.18,r:14,flash:0},
      {x:this.w*0.22,y:this.h*0.28,r:12,flash:0},{x:this.w*0.78,y:this.h*0.28,r:12,flash:0},
    ];
  }
  protected update(dt:number){
    this.left=input.pressed('z')||input.pressed('arrowleft')||input.pressed('a');
    this.right=input.pressed('m')||input.pressed('arrowright')||input.pressed('d')||input.pressed('/');
    for(const b of this.bumpers) b.flash=Math.max(0,b.flash-dt);
    if(!this.launched){
      if(input.actionJust()||input.pointer.justDown){ this.launched=true; this.ball.vx=-120+Math.random()*40; this.ball.vy=-560; audio.blip(); this.burst(this.ball.x,this.ball.y,'#fff',8); }
      return;
    }
    // substeps for stability
    const steps=3; const sdt=dt/steps;
    for(let s=0;s<steps;s++){
      this.ball.vy+=780*sdt; this.ball.vx*=0.9995; this.ball.vy*=0.9995;
      this.ball.x+=this.ball.vx*sdt; this.ball.y+=this.ball.vy*sdt;
      if(this.ball.x<18){ this.ball.x=18; this.ball.vx=Math.abs(this.ball.vx)*0.92; audio.blip(300); }
      if(this.ball.x>this.w-18){ this.ball.x=this.w-18; this.ball.vx=-Math.abs(this.ball.vx)*0.92; audio.blip(300); }
      if(this.ball.y<44){ this.ball.y=44; this.ball.vy=Math.abs(this.ball.vy)*0.9; }
      for(const b of this.bumpers){
        const dx=this.ball.x-b.x, dy=this.ball.y-b.y, d=Math.hypot(dx,dy)||1;
        if(d<b.r+this.ball.r){
          const nx=dx/d, ny=dy/d; this.ball.x=b.x+nx*(b.r+this.ball.r+0.5); this.ball.y=b.y+ny*(b.r+this.ball.r+0.5);
          const dot=this.ball.vx*nx+this.ball.vy*ny;
          this.ball.vx=(this.ball.vx-1.9*dot*nx); this.ball.vy=(this.ball.vy-1.9*dot*ny);
          const sp=Math.hypot(this.ball.vx,this.ball.vy); if(sp<280){ this.ball.vx*=280/sp; this.ball.vy*=280/sp; }
          this.combo++; this.addScore(20+this.combo*5); b.flash=0.2; audio.coin(); this.burst(b.x,b.y,'#ffe66b',10);
        }
      }
      const hitFlip=(fx:number,fy:number,up:boolean,dir:number)=>{
        if(!up) return;
        if(Math.abs(this.ball.x-fx)<42 && this.ball.y>fy-28 && this.ball.y<fy+16){
          this.ball.vy=-Math.abs(this.ball.vy)*0.25-480-Math.random()*40;
          this.ball.vx+=dir*160; audio.blip(520); this.addScore(8); this.burst(this.ball.x,this.ball.y,'#6bcbff',6);
        }
      };
      hitFlip(this.flipL.x,this.flipL.y,this.left,-1);
      hitFlip(this.flipR.x,this.flipR.y,this.right,1);
    }
    if(this.ball.y>this.h+30){ this.bump(0.4); audio.hit(); this.gameOver(false); }
  }
  protected render(){
    this.clear('#100810');
    const ctx=this.ctx;
    ctx.strokeStyle='#ff4d6d'; ctx.lineWidth=3; ctx.strokeRect(10,38,this.w-20,this.h-48);
    for(const b of this.bumpers){
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7);
      ctx.fillStyle=b.flash>0?'#fff': '#ffe66b'; ctx.fill();
      ctx.strokeStyle='#ff4d6d'; ctx.stroke();
    }
    ctx.strokeStyle='#6bcbff'; ctx.lineWidth=7; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(this.flipL.x-34,this.flipL.y+(this.left?-14:10)); ctx.lineTo(this.flipL.x+28,this.flipL.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.flipR.x+34,this.flipR.y+(this.right?-14:10)); ctx.lineTo(this.flipR.x-28,this.flipR.y); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.shadowColor='#fff'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(this.ball.x,this.ball.y,this.ball.r,0,7); ctx.fill(); ctx.shadowBlur=0;
    if(!this.launched){ ctx.fillStyle='#ccc'; ctx.font='14px monospace'; ctx.textAlign='center'; ctx.fillText('SPACE / TAP to launch', this.w/2, this.h*0.55); }
    this.drawHud(this.combo>1?`COMBO x${this.combo}`:'');
  }
}
export const create: GameFactory=(c,h)=>new Fluxball(c,h);
