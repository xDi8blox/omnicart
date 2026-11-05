import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class EdgeParry extends GameBase {
  private phase:'idle'|'wind'|'strike'|'recover'='idle';
  private t=0; private hp=5; private foe=8; private streak=0; private perfect=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#06d6a0');}
  protected onStart(){ this.phase='idle'; this.t=0.9; this.hp=5; this.foe=8; this.streak=0; this.perfect=0; }
  protected update(dt:number){
    this.t-=dt;
    if(this.phase==='idle' && this.t<=0){ this.phase='wind'; this.t=0.4+Math.random()*0.45; audio.blip(200); }
    else if(this.phase==='wind' && this.t<=0){ this.phase='strike'; this.t=0.2; }
    else if(this.phase==='strike' && this.t<=0){ this.phase='recover'; this.t=0.55; this.hp--; this.streak=0; this.bump(0.3); audio.hit(); if(this.hp<=0) this.gameOver(false); }
    else if(this.phase==='recover' && this.t<=0){ this.phase='idle'; this.t=0.35+Math.random()*0.55; }
    if(input.actionJust()||input.pointer.justDown){
      if(this.phase==='strike' || (this.phase==='wind' && this.t<0.1)){
        const perfect=this.phase==='strike' && this.t>0.08 && this.t<0.16;
        this.foe--; this.streak++; this.perfect+=perfect?1:0;
        this.addScore(40+this.streak*15+(perfect?50:0));
        audio.coin(); this.burst(this.w*0.6,this.h*0.5, perfect?'#fff':'#06d6a0', perfect?24:12);
        this.phase='recover'; this.t=0.35;
        if(this.foe<=0) this.gameOver(true);
      } else if(this.phase==='wind'){ this.hp--; this.streak=0; audio.hit(); this.bump(0.25); this.phase='recover'; this.t=0.65; if(this.hp<=0) this.gameOver(false); }
      else audio.blip(100);
    }
  }
  protected render(){
    this.clear('#061410');
    const ctx=this.ctx;
    ctx.fillStyle='#06d6a0'; ctx.fillRect(this.w*0.25,this.h*0.55,40,70);
    ctx.fillStyle='#ef476f'; ctx.fillRect(this.w*0.7,this.h*0.5,40,80);
    if(this.phase==='wind'){ const r=20+this.t*50; ctx.strokeStyle='#ffe66b'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(this.w*0.72,this.h*0.45,r,0,7); ctx.stroke(); }
    if(this.phase==='strike'){ ctx.fillStyle='#fff'; ctx.fillRect(this.w*0.4,this.h*0.55,this.w*0.3,10); ctx.fillStyle='#ffe66b'; ctx.font='bold 22px sans-serif'; ctx.textAlign='center'; ctx.fillText('PARRY!', this.w/2, this.h*0.35); }
    else { ctx.fillStyle='#888'; ctx.font='14px monospace'; ctx.textAlign='center'; ctx.fillText(this.phase==='wind'?'Watch the tell…':'Wait…', this.w/2, this.h*0.3); }
    // HP pips
    for(let i=0;i<5;i++){ ctx.fillStyle=i<this.hp?'#06d6a0':'#333'; ctx.fillRect(20+i*18, this.h-24, 14, 10); }
    this.drawHud(`FOE ${this.foe} · STREAK ${this.streak}`);
  }
}
export const create: GameFactory=(c,h)=>new EdgeParry(c,h);
