import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class Fluxball extends GameBase {
  private ball={x:0,y:0,vx:0,vy:0,r:8};
  private left=false; private right=false; private launched=false;
  private bumpers:{x:number;y:number;r:number}[]=[];
  private flipL={x:0,y:0}; private flipR={x:0,y:0};
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ff4d6d');}
  protected onStart(){
    this.launched=false;
    this.ball={x:this.w-30,y:this.h-80,vx:0,vy:0,r:8};
    this.flipL={x:this.w*0.28,y:this.h-50}; this.flipR={x:this.w*0.72,y:this.h-50};
    this.bumpers=[{x:this.w*0.5,y:this.h*0.35,r:22},{x:this.w*0.35,y:this.h*0.5,r:18},{x:this.w*0.65,y:this.h*0.5,r:18},{x:this.w*0.5,y:this.h*0.22,r:16}];
  }
  protected update(dt:number){
    this.left=input.pressed('z')||input.pressed('arrowleft')||input.pressed('a');
    this.right=input.pressed('m')||input.pressed('arrowright')||input.pressed('d')||input.pressed('/');
    if(!this.launched){
      if(input.actionJust()||input.pointer.justDown){ this.launched=true; this.ball.vx=-80; this.ball.vy=-520; audio.blip(); }
      return;
    }
    this.ball.vy+=700*dt; this.ball.x+=this.ball.vx*dt; this.ball.y+=this.ball.vy*dt;
    if(this.ball.x<20){ this.ball.x=20; this.ball.vx=Math.abs(this.ball.vx)*0.9; }
    if(this.ball.x>this.w-20){ this.ball.x=this.w-20; this.ball.vx=-Math.abs(this.ball.vx)*0.9; }
    if(this.ball.y<40){ this.ball.y=40; this.ball.vy=Math.abs(this.ball.vy)*0.9; }
    if(this.ball.y>this.h+40){ audio.hit(); this.gameOver(false); return; }
    for(const b of this.bumpers){
      const dx=this.ball.x-b.x, dy=this.ball.y-b.y, d=Math.hypot(dx,dy);
      if(d<b.r+this.ball.r){
        const nx=dx/d, ny=dy/d; this.ball.x=b.x+nx*(b.r+this.ball.r); this.ball.y=b.y+ny*(b.r+this.ball.r);
        const dot=this.ball.vx*nx+this.ball.vy*ny;
        this.ball.vx=(this.ball.vx-2*dot*nx)*1.05; this.ball.vy=(this.ball.vy-2*dot*ny)*1.05;
        this.addScore(25); audio.coin();
      }
    }
    // flippers as circles when raised
    const fl=this.left? -0.7:0.3, fr=this.right?0.7:-0.3;
    const checkFlip=(fx:number,fy:number,up:boolean)=>{
      if(!up) return;
      if(Math.hypot(this.ball.x-fx,this.ball.y-fy)<40 && this.ball.y>fy-20){
        this.ball.vy=-Math.abs(this.ball.vy)*0.3-420; this.ball.vx+=(fx<this.w/2?-1:1)*120; audio.blip(500); this.addScore(5);
      }
    };
    checkFlip(this.flipL.x,this.flipL.y,this.left);
    checkFlip(this.flipR.x,this.flipR.y,this.right);
  }
  protected render(){
    this.clear('#100810');
    const ctx=this.ctx;
    ctx.strokeStyle='#ff4d6d'; ctx.lineWidth=3; ctx.strokeRect(12,36,this.w-24,this.h-48);
    for(const b of this.bumpers){ ctx.fillStyle='#ffe66b'; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,7); ctx.fill(); }
    ctx.strokeStyle='#6bcbff'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.moveTo(this.flipL.x-30,this.flipL.y+(this.left?-10:8)); ctx.lineTo(this.flipL.x+30,this.flipL.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(this.flipR.x+30,this.flipR.y+(this.right?-10:8)); ctx.lineTo(this.flipR.x-30,this.flipR.y); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(this.ball.x,this.ball.y,this.ball.r,0,7); ctx.fill();
    if(!this.launched){ ctx.fillStyle='#aaa'; ctx.font='14px monospace'; ctx.fillText('SPACE / TAP to launch', this.w/2-80, this.h/2); }
    this.drawHud();
  }
}
export const create: GameFactory=(c,h)=>new Fluxball(c,h);
