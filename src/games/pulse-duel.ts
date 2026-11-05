import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class PulseDuel extends GameBase {
  private p={x:0,y:0,hp:5,face:1,cool:0,atk:0};
  private e={x:0,y:0,hp:5,face:-1,cool:0,atk:0,ai:0};
  private round=1;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ef476f');}
  protected onStart(){
    this.p={x:this.w*0.3,y:this.h*0.65,hp:5,face:1,cool:0,atk:0};
    this.e={x:this.w*0.7,y:this.h*0.65,hp:5,face:-1,cool:0,atk:0,ai:0};
    this.round=1;
  }
  protected update(dt:number){
    this.p.cool-=dt; this.e.cool-=dt; this.p.atk=Math.max(0,this.p.atk-dt); this.e.atk=Math.max(0,this.e.atk-dt);
    const a=input.axis(); this.p.x+=a.x*200*dt; this.p.x=Math.max(40,Math.min(this.w-40,this.p.x));
    if(this.p.x<this.e.x) this.p.face=1; else this.p.face=-1;
    if(input.just('j')||input.just('z')||input.actionJust()) this.strike(this.p,this.e,18,1);
    if(input.just('k')||input.just('x')) this.strike(this.p,this.e,28,1.4);
    if(input.just('l')||input.just('c')) this.strike(this.p,this.e,40,2);
    // AI
    this.e.ai-=dt;
    const dist=this.e.x-this.p.x;
    if(Math.abs(dist)>90) this.e.x += Math.sign(this.p.x-this.e.x)*140*dt;
    else if(this.e.ai<=0){ this.strike(this.e,this.p,20+Math.random()*15,1.2); this.e.ai=0.5+Math.random()*0.6; }
    this.e.face=this.e.x<this.p.x?1:-1;
    if(this.e.hp<=0){ this.addScore(200); this.round++; audio.win(); if(this.round>3) this.gameOver(true); else { this.e.hp=5; this.p.hp=Math.min(5,this.p.hp+1); this.e.x=this.w*0.7; this.p.x=this.w*0.3; } }
    if(this.p.hp<=0) this.gameOver(false);
  }
  private strike(att:{x:number;y:number;hp:number;face:number;cool:number;atk:number}, def:{x:number;y:number;hp:number;face:number;cool:number;atk:number}, range:number, dmg:number){
    if(att.cool>0) return; att.cool=0.35; att.atk=0.2; audio.blip(400);
    if(Math.abs(att.x-def.x)<range+30){ def.hp-=dmg; def.x+=att.face*20; this.addScore(10); audio.hit(); }
  }
  protected render(){
    this.clear('#140810');
    const ctx=this.ctx;
    ctx.fillStyle='#222'; ctx.fillRect(0,this.h*0.72,this.w,this.h);
    const draw=(f:typeof this.p, color:string)=>{
      ctx.fillStyle=color; ctx.fillRect(f.x-16,f.y-50,32,50);
      if(f.atk>0){ ctx.fillStyle='#ffe66b'; ctx.fillRect(f.x+f.face*16,f.y-35,24,8); }
      ctx.fillStyle='#fff'; for(let i=0;i<f.hp;i++) ctx.fillRect(f.x-20+i*10,f.y-60,8,6);
    };
    draw(this.p,'#ef476f'); draw(this.e,'#4cc9f0');
    this.drawHud(`ROUND ${this.round}`);
  }
}
export const create: GameFactory=(c,h)=>new PulseDuel(c,h);
