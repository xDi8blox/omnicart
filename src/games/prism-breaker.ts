import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Brick={x:number;y:number;w:number;h:number;hp:number;boss:boolean;alive:boolean};
class PrismBreaker extends GameBase {
  private paddle={x:0,y:0,w:100,h:14};
  private ball={x:0,y:0,vx:0,vy:0,r:7,stuck:true};
  private bricks:Brick[]=[];
  private power=0; // 0 none 1 wide 2 multi handled as bigger paddle / faster
  private lives=3;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ff6bcb');}
  protected onStart(){
    this.lives=3; this.power=0; this.paddle.w=100;
    this.paddle.x=this.w/2-50; this.paddle.y=this.h-40;
    this.ball={x:this.paddle.x+50,y:this.paddle.y-10,vx:0,vy:0,r:7,stuck:true};
    this.bricks=[];
    const cols=10, rows=6, bw=(this.w-40)/cols, bh=18;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const boss=r===0&&(c===2||c===7);
      this.bricks.push({x:20+c*bw,y:50+r*(bh+6),w:bw-4,h:bh,hp:boss?5:1+(r<2?1:0),boss,alive:true});
    }
  }
  protected update(dt:number){
    const a=input.axis();
    this.paddle.x += a.x*420*dt;
    if(input.pointer.down) this.paddle.x = input.pointer.x - this.paddle.w/2;
    this.paddle.x=Math.max(8,Math.min(this.w-this.paddle.w-8,this.paddle.x));
    if(this.ball.stuck){
      this.ball.x=this.paddle.x+this.paddle.w/2; this.ball.y=this.paddle.y-12;
      if(input.actionJust()||input.pointer.justUp){ this.ball.stuck=false; this.ball.vx=180; this.ball.vy=-280; audio.blip(); }
      return;
    }
    this.ball.x+=this.ball.vx*dt; this.ball.y+=this.ball.vy*dt;
    if(this.ball.x<this.ball.r||this.ball.x>this.w-this.ball.r){ this.ball.vx*=-1; audio.blip(400); }
    if(this.ball.y<40+this.ball.r){ this.ball.vy=Math.abs(this.ball.vy); audio.blip(400); }
    if(this.ball.y>this.h){ this.lives--; audio.hit(); if(this.lives<=0) this.gameOver(false); else { this.ball.stuck=true; this.ball.vx=0; this.ball.vy=0; } return; }
    // paddle
    if(this.ball.vy>0 && this.ball.y+this.ball.r>this.paddle.y && this.ball.y<this.paddle.y+this.paddle.h &&
       this.ball.x>this.paddle.x && this.ball.x<this.paddle.x+this.paddle.w){
      const t=(this.ball.x-(this.paddle.x+this.paddle.w/2))/(this.paddle.w/2);
      this.ball.vx=t*320; this.ball.vy=-Math.abs(this.ball.vy)*1.02; audio.blip(520);
    }
    for(const b of this.bricks){
      if(!b.alive) continue;
      if(this.ball.x>b.x && this.ball.x<b.x+b.w && this.ball.y>b.y && this.ball.y<b.y+b.h){
        b.hp--; this.ball.vy*=-1;
        if(b.hp<=0){ b.alive=false; audio.coin(); this.addScore(b.boss?100:20); if(Math.random()<0.15){ this.paddle.w=Math.min(160,this.paddle.w+20); audio.powerup(); } }
        else audio.hit();
        break;
      }
    }
    if(this.bricks.every(b=>!b.alive)) this.gameOver(true);
  }
  protected render(){
    this.clear('#120814');
    const ctx=this.ctx;
    ctx.fillStyle='#ff6bcb'; ctx.fillRect(this.paddle.x,this.paddle.y,this.paddle.w,this.paddle.h);
    ctx.beginPath(); ctx.arc(this.ball.x,this.ball.y,this.ball.r,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
    for(const b of this.bricks){
      if(!b.alive) continue;
      ctx.fillStyle=b.boss?'#ffe66b':`hsl(${300+b.hp*40},80%,55%)`;
      ctx.fillRect(b.x,b.y,b.w,b.h);
      if(b.boss){ ctx.strokeStyle='#fff'; ctx.strokeRect(b.x,b.y,b.w,b.h); }
    }
    this.drawHud(`LIVES ${this.lives}`);
  }
}
export const create: GameFactory=(c,h)=>new PrismBreaker(c,h);
