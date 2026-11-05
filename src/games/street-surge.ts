import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Thug={x:number;y:number;hp:number;cool:number;hit:number};
class StreetSurge extends GameBase {
  private p={x:80,y:0,hp:100,cool:0,face:1,combo:0,atk:0};
  private thugs:Thug[]=[]; private scroll=0; private wave=1;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#118ab2');}
  protected onStart(){ this.p={x:80,y:this.h*0.65,hp:100,cool:0,face:1,combo:0,atk:0}; this.scroll=0; this.wave=1; this.spawn(); }
  private spawn(){ this.thugs=[]; for(let i=0;i<3+this.wave;i++) this.thugs.push({x:280+i*100+Math.random()*40,y:this.h*0.62+Math.random()*40,hp:2+((this.wave/2)|0),cool:0,hit:0}); }
  protected update(dt:number){
    this.p.cool-=dt; this.p.atk=Math.max(0,this.p.atk-dt); if(this.p.atk<=0) this.p.combo=Math.max(0,this.p.combo-dt*3);
    const a=input.axis(); this.p.x+=a.x*230*dt; this.p.y+=a.y*170*dt;
    this.p.y=Math.max(this.h*0.5,Math.min(this.h*0.8,this.p.y));
    if(a.x) this.p.face=Math.sign(a.x);
    this.scroll=Math.max(0,this.p.x-140);
    if((input.just('z')||input.just('j')||input.actionJust()) && this.p.cool<=0){
      this.p.cool=0.22; this.p.atk=0.15; audio.blip(450);
      for(const t of this.thugs) if(Math.abs(t.x-this.p.x)<55 && Math.abs(t.y-this.p.y)<34 && Math.sign(t.x-this.p.x)!==-this.p.face){
        t.hp--; t.hit=0.15; t.x+=this.p.face*16; this.p.combo++; this.addScore(15+this.p.combo*5); audio.hit(); this.burst(t.x,t.y-20,'#ffe66b',8);
      }
    }
    if((input.just('x')||input.just('k')) && this.p.cool<=0){
      this.p.cool=0.38; this.p.atk=0.2; audio.blip(300);
      for(const t of this.thugs) if(Math.abs(t.x-this.p.x)<70 && Math.abs(t.y-this.p.y)<40){
        t.hp-=2; t.hit=0.2; t.x+=this.p.face*28; this.p.combo+=2; this.addScore(30); audio.hit(); this.bump(0.1); this.burst(t.x,t.y-20,'#ff4d6d',12);
      }
    }
    for(const t of this.thugs){
      t.cool-=dt; t.hit=Math.max(0,t.hit-dt);
      t.x += Math.sign(this.p.x-t.x)*75*dt;
      if(Math.abs(t.x-this.p.x)<28 && Math.abs(t.y-this.p.y)<24 && t.cool<=0){ this.p.hp-=8; t.cool=0.85; audio.hit(); this.bump(0.2); if(this.p.hp<=0){ this.gameOver(false); return; } }
    }
    this.thugs=this.thugs.filter(t=>t.hp>0);
    if(!this.thugs.length){ this.wave++; this.addScore(100*this.wave); audio.powerup(); this.burst(this.p.x,this.p.y,'#118ab2',20); if(this.wave>5) this.gameOver(true); else this.spawn(); }
  }
  protected render(){
    this.clear('#0a1218');
    const ctx=this.ctx; const s=this.scroll;
    ctx.fillStyle='#1a2830'; for(let i=0;i<12;i++) ctx.fillRect(i*120-(s%120), this.h*0.35, 70, this.h*0.45);
    ctx.fillStyle='#222'; ctx.fillRect(0,this.h*0.78,this.w,this.h);
    ctx.fillStyle='#300'; ctx.fillRect(12,14,120,10); ctx.fillStyle='#118ab2'; ctx.fillRect(12,14,120*(this.p.hp/100),10);
    ctx.fillStyle=this.p.atk>0?'#fff':'#118ab2'; ctx.fillRect(this.p.x-s-14,this.p.y-42,28,42);
    if(this.p.atk>0){ ctx.fillStyle='#ffe66b'; ctx.fillRect(this.p.x-s+this.p.face*14,this.p.y-30,20,8); }
    for(const t of this.thugs){ ctx.fillStyle=t.hit>0?'#fff':'#ef476f'; ctx.fillRect(t.x-s-14,t.y-40,28,40); }
    this.drawHud(`WAVE ${this.wave} · COMBO ${Math.floor(this.p.combo)}`);
  }
}
export const create: GameFactory=(c,h)=>new StreetSurge(c,h);
