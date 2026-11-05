import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class LaneRush extends GameBase {
  private lane=1; private y=0; private cars:{lane:number;y:number}[]=[]; private speed=260; private t=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#fee440');}
  protected onStart(){
    this.lane=1; this.cars=[]; this.speed=260; this.t=0;
    for(let i=0;i<6;i++) this.cars.push({lane:(Math.random()*3)|0,y:-i*180-100});
  }
  protected update(dt:number){
    this.t+=dt; this.speed=260+this.t*6; this.setScore(Math.floor(this.t*this.speed/20));
    if(input.just('arrowleft')||input.just('a')) this.lane=Math.max(0,this.lane-1);
    if(input.just('arrowright')||input.just('d')) this.lane=Math.min(2,this.lane+1);
    if(input.pointer.justDown){ this.lane = input.pointer.x < this.w/3 ? 0 : input.pointer.x > 2*this.w/3 ? 2 : 1; }
    for(const c of this.cars){
      c.y+=this.speed*dt;
      if(c.y>this.h+40){ c.y=-120-Math.random()*200; c.lane=(Math.random()*3)|0; this.addScore(5); }
      if(c.lane===this.lane && Math.abs(c.y-(this.h-90))<40){ audio.boom(); this.gameOver(false); return; }
    }
  }
  protected render(){
    this.clear('#101008');
    const ctx=this.ctx; const lanes=[this.w*0.2,this.w*0.5,this.w*0.8];
    ctx.strokeStyle='#333'; ctx.setLineDash([20,20]);
    ctx.beginPath(); ctx.moveTo(this.w/3,0); ctx.lineTo(this.w/3,this.h); ctx.moveTo(2*this.w/3,0); ctx.lineTo(2*this.w/3,this.h); ctx.stroke();
    ctx.setLineDash([]);
    for(const c of this.cars){ ctx.fillStyle='#ff4d6d'; ctx.fillRect(lanes[c.lane]-22,c.y,44,60); }
    ctx.fillStyle='#fee440'; ctx.fillRect(lanes[this.lane]-22,this.h-120,44,60);
    this.drawHud();
  }
}
export const create: GameFactory=(c,h)=>new LaneRush(c,h);
