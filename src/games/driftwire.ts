import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class Driftwire extends GameBase {
  private car={x:0,y:0,a:0,vx:0,vy:0,s:0};
  private checkpoints:{x:number;y:number}[]=[]; private cp=0; private lap=1; private t=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#00bbf9');}
  protected onStart(){
    this.car={x:this.w/2,y:this.h*0.75,a:-Math.PI/2,vx:0,vy:0,s:0};
    this.checkpoints=[{x:this.w/2,y:80},{x:this.w-80,y:this.h/2},{x:this.w/2,y:this.h-80},{x:80,y:this.h/2}];
    this.cp=0; this.lap=1; this.t=0;
  }
  protected update(dt:number){
    this.t+=dt;
    if(input.pressed('arrowleft')||input.pressed('a')) this.car.a-=2.4*dt*(0.4+this.car.s/200);
    if(input.pressed('arrowright')||input.pressed('d')) this.car.a+=2.4*dt*(0.4+this.car.s/200);
    const throttle=!(input.pressed(' ')||input.pressed('arrowdown'));
    if(throttle) this.car.s=Math.min(280,this.car.s+140*dt); else this.car.s=Math.max(0,this.car.s-220*dt);
    this.car.vx=Math.cos(this.car.a)*this.car.s; this.car.vy=Math.sin(this.car.a)*this.car.s;
    this.car.x+=this.car.vx*dt; this.car.y+=this.car.vy*dt;
    // track bounds soft
    const cx=this.w/2, cy=this.h/2; const dx=this.car.x-cx, dy=this.car.y-cy; const dist=Math.hypot(dx,dy);
    if(dist>Math.min(this.w,this.h)*0.42){ this.car.s*=0.96; audio.hit(); }
    this.car.x=Math.max(20,Math.min(this.w-20,this.car.x)); this.car.y=Math.max(40,Math.min(this.h-20,this.car.y));
    const target=this.checkpoints[this.cp];
    if(Math.hypot(this.car.x-target.x,this.car.y-target.y)<36){ this.cp++; this.addScore(50); audio.coin();
      if(this.cp>=this.checkpoints.length){ this.cp=0; this.lap++; this.addScore(200); if(this.lap>3) this.gameOver(true); }
    }
  }
  protected render(){
    this.clear('#061018');
    const ctx=this.ctx; const cx=this.w/2, cy=this.h/2, R=Math.min(this.w,this.h)*0.42;
    ctx.strokeStyle='#123'; ctx.lineWidth=50; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.stroke();
    ctx.strokeStyle='#00bbf9'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.stroke();
    for(let i=0;i<this.checkpoints.length;i++){ const p=this.checkpoints[i]; ctx.fillStyle=i===this.cp?'#ffe66b':'#234'; ctx.beginPath(); ctx.arc(p.x,p.y,10,0,7); ctx.fill(); }
    ctx.save(); ctx.translate(this.car.x,this.car.y); ctx.rotate(this.car.a);
    ctx.fillStyle='#00bbf9'; ctx.fillRect(-10,-6,20,12); ctx.restore();
    this.drawHud(`LAP ${this.lap}/3`);
  }
}
export const create: GameFactory=(c,h)=>new Driftwire(c,h);
