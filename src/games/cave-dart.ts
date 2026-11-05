import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class CaveDart extends GameBase {
  private y=0; private vy=0; private pipes:{x:number;gap:number;gy:number}[]=[];
  private alive=true;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#b967ff');}
  protected onStart(){
    this.y=this.h/2; this.vy=0; this.alive=true; this.pipes=[];
    for(let i=0;i<4;i++) this.pipes.push({x:300+i*220,gap:120,gy:100+Math.random()*(this.h-240)});
  }
  protected update(dt:number){
    if(input.actionJust()||input.pointer.justDown){ this.vy=-280; audio.jump(); }
    this.vy+=900*dt; this.y+=this.vy*dt;
    if(this.y<20||this.y>this.h-20){ audio.hit(); this.gameOver(false); return; }
    for(const p of this.pipes) p.x-=160*dt;
    if(this.pipes[0].x<-60){
      this.pipes.shift(); this.addScore(1); audio.coin();
      const last=this.pipes[this.pipes.length-1].x;
      this.pipes.push({x:last+220,gap:Math.max(90,120-this.score),gy:80+Math.random()*(this.h-200)});
    }
    for(const p of this.pipes){
      if(80>p.x&&80<p.x+50){
        if(this.y<p.gy || this.y>p.gy+p.gap){ audio.hit(); this.gameOver(false); return; }
      }
    }
  }
  protected render(){
    this.clear('#100818');
    const ctx=this.ctx;
    for(const p of this.pipes){
      ctx.fillStyle='#2a1848';
      ctx.fillRect(p.x,0,50,p.gy);
      ctx.fillRect(p.x,p.gy+p.gap,50,this.h-(p.gy+p.gap));
      ctx.fillStyle='#b967ff';
      ctx.fillRect(p.x,p.gy-6,50,6); ctx.fillRect(p.x,p.gy+p.gap,50,6);
    }
    ctx.fillStyle='#ffe66b'; ctx.beginPath(); ctx.arc(80,this.y,12,0,7); ctx.fill();
    this.drawHud();
  }
}
export const create: GameFactory=(c,h)=>new CaveDart(c,h);
