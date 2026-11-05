import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class Rushline extends GameBase {
  private y=0; private vy=0; private grounded=true; private sliding=0;
  private obstacles:{x:number;kind:'low'|'high'}[]=[];
  private speed=280; private dist=0; private t=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#00e5ff');}
  protected onStart(){
    this.y=0; this.vy=0; this.grounded=true; this.sliding=0;
    this.obstacles=[]; this.speed=280; this.dist=0; this.t=0;
    for(let i=0;i<8;i++) this.obstacles.push({x:500+i*280+Math.random()*80,kind:Math.random()<0.5?'low':'high'});
  }
  protected update(dt:number){
    this.t+=dt; this.speed=280+this.t*8; this.dist+=this.speed*dt; this.setScore(Math.floor(this.dist/10));
    const jump=input.just('arrowup')||input.just('w')||input.just(' ')|| (input.pointer.justDown && input.pointer.y<this.h/2);
    const slide=input.pressed('arrowdown')||input.pressed('s')|| (input.pointer.down && input.pointer.y>this.h/2);
    if(jump&&this.grounded){ this.vy=-520; this.grounded=false; audio.jump(); }
    if(slide&&this.grounded) this.sliding=0.45; else this.sliding=Math.max(0,this.sliding-dt);
    this.vy+=1400*dt; this.y+=this.vy*dt;
    if(this.y>=0){ this.y=0; this.vy=0; this.grounded=true; }
    for(const o of this.obstacles) o.x-=this.speed*dt;
    if(this.obstacles[0] && this.obstacles[0].x<-40){
      this.obstacles.shift();
      const last=this.obstacles[this.obstacles.length-1]?.x ?? 400;
      this.obstacles.push({x:last+240+Math.random()*120,kind:Math.random()<0.5?'low':'high'});
    }
    const px=100, py=this.h*0.72+this.y, pw=28, ph=this.sliding>0?22:40;
    for(const o of this.obstacles){
      const ox=o.x, oy=o.kind==='low'?this.h*0.72:this.h*0.72-50, ow=30, oh=o.kind==='low'?40:50;
      if(px<ox+ow&&px+pw>ox&&py<oy+oh&&py+ph>oy){
        if(o.kind==='low'&&this.sliding>0) continue;
        if(o.kind==='high'&&this.y<-30) continue;
        audio.hit(); this.gameOver(false); return;
      }
    }
  }
  protected render(){
    this.clear('#06141c');
    const ctx=this.ctx; const ground=this.h*0.72+40;
    ctx.fillStyle='#123'; ctx.fillRect(0,ground,this.w,this.h-ground);
    // buildings
    ctx.fillStyle='#0a2030';
    for(let i=0;i<12;i++){ const bx=((i*90 - (this.dist*0.3)%90)); ctx.fillRect(bx,ground-80-(i%5)*30,60,200); }
    const ph=this.sliding>0?22:40;
    ctx.fillStyle='#00e5ff'; ctx.fillRect(100,this.h*0.72+this.y,28,ph);
    for(const o of this.obstacles){
      ctx.fillStyle=o.kind==='low'?'#ff4d6d':'#ffe66b';
      const oy=o.kind==='low'?this.h*0.72:this.h*0.72-50;
      ctx.fillRect(o.x,oy,30,o.kind==='low'?40:50);
    }
    this.drawHud(`${Math.floor(this.speed)} KM/H`);
  }
}
export const create: GameFactory=(c,h)=>new Rushline(c,h);
