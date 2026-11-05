import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Thug={x:number;y:number;hp:number;cool:number};
class StreetSurge extends GameBase {
  private p={x:80,y:0,hp:5,cool:0,face:1};
  private thugs:Thug[]=[]; private scroll=0; private wave=1;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#118ab2');}
  protected onStart(){ this.p={x:80,y:this.h*0.65,hp:5,cool:0,face:1}; this.scroll=0; this.wave=1; this.spawn(); }
  private spawn(){ this.thugs=[]; for(let i=0;i<3+this.wave;i++) this.thugs.push({x:300+i*90,y:this.h*0.65,hp:2+((this.wave/2)|0),cool:0}); }
  protected update(dt:number){
    this.p.cool-=dt; const a=input.axis();
    this.p.x+=a.x*220*dt; this.p.y+=a.y*160*dt;
    this.p.y=Math.max(this.h*0.5,Math.min(this.h*0.8,this.p.y));
    if(a.x) this.p.face=Math.sign(a.x);
    this.scroll=Math.max(0,this.p.x-120);
    if((input.just('z')||input.just('j')||input.actionJust()) && this.p.cool<=0){
      this.p.cool=0.28; audio.blip(450);
      for(const t of this.thugs) if(Math.abs(t.x-this.p.x)<50 && Math.abs(t.y-this.p.y)<30 && Math.sign(t.x-this.p.x)===this.p.face){ t.hp--; this.addScore(20); audio.hit(); }
    }
    if((input.just('x')||input.just('k')) && this.p.cool<=0){
      this.p.cool=0.4; audio.blip(300);
      for(const t of this.thugs) if(Math.abs(t.x-this.p.x)<60 && Math.abs(t.y-this.p.y)<35){ t.hp-=2; this.addScore(30); audio.hit(); }
    }
    for(const t of this.thugs){
      t.cool-=dt;
      t.x += Math.sign(this.p.x-t.x)*70*dt;
      if(Math.abs(t.x-this.p.x)<28 && Math.abs(t.y-this.p.y)<24 && t.cool<=0){ this.p.hp--; t.cool=0.8; audio.hit(); if(this.p.hp<=0){ this.gameOver(false); return; } }
    }
    this.thugs=this.thugs.filter(t=>t.hp>0);
    if(!this.thugs.length){ this.wave++; this.addScore(100*this.wave); audio.powerup(); if(this.wave>5) this.gameOver(true); else this.spawn(); }
  }
  protected render(){
    this.clear('#0a1218');
    const ctx=this.ctx; const s=this.scroll;
    ctx.fillStyle='#1a2830'; for(let i=0;i<10;i++) ctx.fillRect(i*120- (s%120), this.h*0.4, 80, this.h*0.4);
    ctx.fillStyle='#222'; ctx.fillRect(0,this.h*0.78,this.w,this.h);
    ctx.fillStyle='#118ab2'; ctx.fillRect(this.p.x-s-14,this.p.y-40,28,40);
    ctx.fillStyle='#ef476f'; for(const t of this.thugs) ctx.fillRect(t.x-s-14,t.y-40,28,40);
    this.drawHud(`HP ${this.p.hp} WAVE ${this.wave}`);
  }
}
export const create: GameFactory=(c,h)=>new StreetSurge(c,h);
