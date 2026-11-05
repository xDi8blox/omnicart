import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Missile={x:number;y:number;tx:number;ty:number;alive:boolean};
type Blast={x:number;y:number;r:number;max:number};
class AegisGrid extends GameBase {
  private cities:{x:number;alive:boolean}[]=[];
  private missiles:Missile[]=[]; private blasts:Blast[]=[];
  private t=0; private spawn=1.2;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#4cc9f0');}
  protected onStart(){
    this.cities=[{x:this.w*0.15,alive:true},{x:this.w*0.35,alive:true},{x:this.w*0.55,alive:true},{x:this.w*0.75,alive:true},{x:this.w*0.9,alive:true}];
    this.missiles=[]; this.blasts=[]; this.t=0; this.spawn=1.2;
  }
  protected update(dt:number){
    this.t+=dt; this.spawn-=dt;
    if(this.spawn<=0){
      this.spawn=Math.max(0.35,1.2-this.t*0.02);
      const target=this.cities.filter(c=>c.alive);
      if(!target.length){ this.gameOver(false); return; }
      const t=target[(Math.random()*target.length)|0];
      this.missiles.push({x:Math.random()*this.w,y:40,tx:t.x,ty:this.h-30,alive:true});
    }
    if(input.pointer.justDown || input.actionJust()){
      const x=input.pointer.justDown?input.pointer.x:this.w/2;
      const y=input.pointer.justDown?input.pointer.y:this.h/2;
      this.blasts.push({x,y,r:0,max:48}); audio.blip(300);
    }
    for(const b of this.blasts){ b.r+=90*dt; }
    this.blasts=this.blasts.filter(b=>b.r<b.max);
    for(const m of this.missiles){
      if(!m.alive) continue;
      const dx=m.tx-m.x, dy=m.ty-m.y, d=Math.hypot(dx,dy)||1;
      const sp=80+this.t*3; m.x+=dx/d*sp*dt; m.y+=dy/d*sp*dt;
      for(const b of this.blasts) if(Math.hypot(m.x-b.x,m.y-b.y)<b.r){ m.alive=false; this.addScore(50); audio.boom(); }
      if(m.y>=this.h-35){
        m.alive=false;
        for(const c of this.cities) if(c.alive && Math.abs(c.x-m.x)<35){ c.alive=false; audio.hit(); }
      }
    }
    this.missiles=this.missiles.filter(m=>m.alive);
    if(this.cities.every(c=>!c.alive)) this.gameOver(false);
    if(this.t>90 && this.cities.some(c=>c.alive)) this.gameOver(true);
  }
  protected render(){
    this.clear('#050a14');
    const ctx=this.ctx;
    for(const c of this.cities){ ctx.fillStyle=c.alive?'#4cc9f0':'#333'; ctx.fillRect(c.x-18,this.h-28,36,18); }
    ctx.strokeStyle='#ff4d6d';
    for(const m of this.missiles){ ctx.beginPath(); ctx.moveTo(m.x,m.y-10); ctx.lineTo(m.x,m.y+6); ctx.stroke(); }
    ctx.strokeStyle='#ffe66b';
    for(const b of this.blasts){ ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.stroke(); }
    this.drawHud(`CITIES ${this.cities.filter(c=>c.alive).length}`);
  }
}
export const create: GameFactory=(c,h)=>new AegisGrid(c,h);
