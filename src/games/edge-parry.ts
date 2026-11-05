import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class EdgeParry extends GameBase {
  private phase:'idle'|'wind'|'strike'|'recover'='idle';
  private t=0; private window=0; private hp=3; private foe=5; private telegraph=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#06d6a0');}
  protected onStart(){ this.phase='idle'; this.t=0.8; this.hp=3; this.foe=5; this.window=0; }
  protected update(dt:number){
    this.t-=dt;
    if(this.phase==='idle' && this.t<=0){ this.phase='wind'; this.t=0.45+Math.random()*0.35; this.telegraph=Math.random(); audio.blip(200); }
    else if(this.phase==='wind' && this.t<=0){ this.phase='strike'; this.t=0.22; this.window=0.22; }
    else if(this.phase==='strike' && this.t<=0){ this.phase='recover'; this.t=0.5; this.hp--; audio.hit(); if(this.hp<=0) this.gameOver(false); }
    else if(this.phase==='recover' && this.t<=0){ this.phase='idle'; this.t=0.4+Math.random()*0.5; }
    if((input.actionJust()||input.pointer.justDown)){
      if(this.phase==='strike' || (this.phase==='wind' && this.t<0.08)){
        this.foe--; this.addScore(50); audio.coin(); this.phase='recover'; this.t=0.4;
        if(this.foe<=0) this.gameOver(true);
      } else if(this.phase==='wind'){ this.hp--; audio.hit(); this.phase='recover'; this.t=0.6; if(this.hp<=0) this.gameOver(false); }
      else audio.blip(100);
    }
  }
  protected render(){
    this.clear('#061410');
    const ctx=this.ctx;
    ctx.fillStyle='#06d6a0'; ctx.fillRect(this.w*0.25,this.h*0.55,40,70);
    ctx.fillStyle='#ef476f'; ctx.fillRect(this.w*0.7,this.h*0.5,40,80);
    if(this.phase==='wind'){ ctx.strokeStyle='#ffe66b'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(this.w*0.72,this.h*0.45,30+this.t*40,0,7); ctx.stroke(); }
    if(this.phase==='strike'){ ctx.fillStyle='#fff'; ctx.fillRect(this.w*0.4,this.h*0.55,this.w*0.3,8); }
    ctx.fillStyle='#aaa'; ctx.font='16px monospace'; ctx.textAlign='center';
    ctx.fillText(this.phase==='strike'?'PARRY!':this.phase==='wind'?'...':'Wait for the tell', this.w/2, this.h*0.3);
    this.drawHud(`HP ${this.hp} FOE ${this.foe}`);
  }
}
export const create: GameFactory=(c,h)=>new EdgeParry(c,h);
