import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Fighter={x:number;y:number;hp:number;max:number;face:number;cool:number;atk:number;stun:number;combo:number;vy:number;ground:boolean};
class PulseDuel extends GameBase {
  private p!:Fighter; private e!:Fighter; private round=1; private wins=0; private ewins=0; private flash=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ef476f');}
  protected onStart(){
    this.round=1; this.wins=0; this.ewins=0; this.resetRound();
  }
  private resetRound(){
    this.p={x:this.w*0.28,y:this.h*0.65,hp:100,max:100,face:1,cool:0,atk:0,stun:0,combo:0,vy:0,ground:true};
    this.e={x:this.w*0.72,y:this.h*0.65,hp:100,max:100,face:-1,cool:0,atk:0,stun:0,combo:0,vy:0,ground:true};
    this.flash=0;
  }
  protected update(dt:number){
    this.flash=Math.max(0,this.flash-dt);
    this.tick(this.p,dt); this.tick(this.e,dt);
    if(this.p.stun<=0){
      const a=input.axis(); this.p.x+=a.x*240*dt;
      if(a.x) this.p.face=Math.sign(a.x)||this.p.face;
      if(input.just('j')||input.just('z')||input.actionJust()) this.strike(this.p,this.e,42,8,'punch');
      if(input.just('k')||input.just('x')) this.strike(this.p,this.e,50,14,'kick');
      if(input.just('l')||input.just('c')) this.strike(this.p,this.e,70,22,'special');
    }
    // smarter CPU
    if(this.e.stun<=0){
      const dist=this.e.x-this.p.x;
      this.e.face=dist>0?-1:1;
      if(Math.abs(dist)>100) this.e.x += Math.sign(this.p.x-this.e.x)*160*dt;
      else if(Math.abs(dist)<40) this.e.x += Math.sign(this.e.x-this.p.x)*120*dt; // spacing
      this.e.cool-=dt;
      if(this.e.cool<=0 && Math.abs(dist)<90){
        const r=Math.random();
        if(r<0.45) this.strike(this.e,this.p,42,8,'punch');
        else if(r<0.8) this.strike(this.e,this.p,50,12,'kick');
        else this.strike(this.e,this.p,65,18,'special');
        this.e.cool=0.45+Math.random()*0.4;
      }
    }
    this.p.x=Math.max(40,Math.min(this.w-40,this.p.x));
    this.e.x=Math.max(40,Math.min(this.w-40,this.e.x));
    if(this.e.hp<=0){ this.wins++; this.addScore(200); this.burst(this.e.x,this.e.y,'#4cc9f0',24); audio.win();
      if(this.wins>=2) this.gameOver(true); else { this.round++; this.resetRound(); } }
    if(this.p.hp<=0){ this.ewins++; this.bump(0.4);
      if(this.ewins>=2) this.gameOver(false); else { this.round++; this.resetRound(); } }
  }
  private tick(f:Fighter,dt:number){ f.cool=Math.max(0,f.cool-dt); f.atk=Math.max(0,f.atk-dt); f.stun=Math.max(0,f.stun-dt); if(f.atk<=0) f.combo=Math.max(0,f.combo-dt*2); }
  private strike(att:Fighter, def:Fighter, range:number, dmg:number, kind:string){
    if(att.cool>0||att.stun>0) return;
    att.cool=kind==='special'?0.55:0.28; att.atk=0.18; audio.blip(kind==='special'?280:450);
    if(Math.abs(att.x-def.x)<range && Math.abs(att.y-def.y)<40){
      const scale=1+att.combo*0.15; def.hp-=dmg*scale; def.stun=0.15; def.x+=att.face*(18+dmg*0.4);
      att.combo+=1; this.addScore(Math.floor(10*scale)); audio.hit(); this.bump(0.12); this.flash=0.08;
      this.burst((att.x+def.x)/2, att.y-20, '#ffe66b', 10);
    }
  }
  protected render(){
    this.clear(this.flash>0?'#2a1020':'#140810');
    const ctx=this.ctx;
    ctx.fillStyle='#222'; ctx.fillRect(0,this.h*0.72,this.w,this.h);
    // health bars
    const bar=(x:number,f:Fighter,color:string)=>{
      ctx.fillStyle='#300'; ctx.fillRect(x,16,this.w*0.35,12);
      ctx.fillStyle=color; ctx.fillRect(x,16,this.w*0.35*(f.hp/f.max),12);
      ctx.strokeStyle='#fff'; ctx.strokeRect(x,16,this.w*0.35,12);
    };
    bar(12,this.p,'#ef476f'); bar(this.w-12-this.w*0.35,this.e,'#4cc9f0');
    const draw=(f:Fighter,color:string)=>{
      ctx.fillStyle=f.stun>0?'#fff':color;
      // body
      ctx.fillRect(f.x-14,f.y-40,28,36);
      // head
      ctx.beginPath(); ctx.arc(f.x,f.y-48,10,0,7); ctx.fill();
      // legs
      ctx.fillRect(f.x-12,f.y-6,10,14); ctx.fillRect(f.x+2,f.y-6,10,14);
      if(f.atk>0){ ctx.fillStyle='#ffe66b'; ctx.fillRect(f.x+f.face*12,f.y-34,26+f.combo*2,8); }
      if(f.combo>=2){ ctx.fillStyle='#fff'; ctx.font='12px monospace'; ctx.textAlign='center'; ctx.fillText(`x${Math.floor(f.combo)}`, f.x, f.y-64); }
    };
    draw(this.p,'#ef476f'); draw(this.e,'#4cc9f0');
    this.drawHud(`R${this.round}  YOU ${this.wins} · CPU ${this.ewins}`);
  }
}
export const create: GameFactory=(c,h)=>new PulseDuel(c,h);
