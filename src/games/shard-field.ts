import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Rock={x:number;y:number;r:number;vx:number;vy:number;alive:boolean};
class ShardField extends GameBase {
  private ship={x:0,y:0,a:0,vx:0,vy:0};
  private rocks:Rock[]=[]; private bullets:{x:number;y:number;vx:number;vy:number;life:number}[]=[];
  private dash=0; private lives=3; private cool=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ffe66b');}
  protected onStart(){
    this.ship={x:this.w/2,y:this.h/2,a:-Math.PI/2,vx:0,vy:0};
    this.rocks=[]; this.bullets=[]; this.dash=0; this.lives=3; this.cool=0;
    for(let i=0;i<6;i++) this.spawn(30+Math.random()*20);
  }
  private spawn(r:number){
    let x=0,y=0;
    do{ x=Math.random()*this.w; y=Math.random()*this.h; } while(Math.hypot(x-this.ship.x,y-this.ship.y)<120);
    const a=Math.random()*Math.PI*2, sp=40+Math.random()*60;
    this.rocks.push({x,y,r,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,alive:true});
  }
  protected update(dt:number){
    if(input.pressed('arrowleft')||input.pressed('a')) this.ship.a-=3.2*dt;
    if(input.pressed('arrowright')||input.pressed('d')) this.ship.a+=3.2*dt;
    if(input.pressed('arrowup')||input.pressed('w')){ this.ship.vx+=Math.cos(this.ship.a)*220*dt; this.ship.vy+=Math.sin(this.ship.a)*220*dt; }
    this.dash=Math.max(0,this.dash-dt);
    if((input.just('shift')||input.just('x'))&&this.dash<=0){ this.ship.x+=Math.cos(this.ship.a)*90; this.ship.y+=Math.sin(this.ship.a)*90; this.dash=1.2; audio.powerup(); }
    this.cool-=dt;
    if(input.action()&&this.cool<=0){
      this.bullets.push({x:this.ship.x,y:this.ship.y,vx:Math.cos(this.ship.a)*420,vy:Math.sin(this.ship.a)*420,life:1.2});
      this.cool=0.2; audio.blip(700);
    }
    this.ship.vx*=0.99; this.ship.vy*=0.99;
    this.ship.x=(this.ship.x+this.ship.vx*dt+this.w)%this.w;
    this.ship.y=(this.ship.y+this.ship.vy*dt+this.h)%this.h;
    for(const b of this.bullets){ b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; }
    this.bullets=this.bullets.filter(b=>b.life>0);
    for(const r of this.rocks){
      if(!r.alive) continue;
      r.x=(r.x+r.vx*dt+this.w)%this.w; r.y=(r.y+r.vy*dt+this.h)%this.h;
      if(Math.hypot(r.x-this.ship.x,r.y-this.ship.y)<r.r+10){ this.lives--; audio.boom(); r.alive=false; if(this.lives<=0){this.gameOver(false);return;} this.ship.x=this.w/2; this.ship.y=this.h/2; this.ship.vx=0; this.ship.vy=0; }
      for(const b of this.bullets){
        if(b.life>0 && Math.hypot(r.x-b.x,r.y-b.y)<r.r){
          b.life=0; r.alive=false; audio.hit(); this.addScore(Math.floor(40-r.r/2));
          if(r.r>18){ for(let i=0;i<2;i++){ const a=Math.random()*6.28; this.rocks.push({x:r.x,y:r.y,r:r.r*0.55,vx:Math.cos(a)*80,vy:Math.sin(a)*80,alive:true}); } }
        }
      }
    }
    this.rocks=this.rocks.filter(r=>r.alive);
    if(this.rocks.length===0){ this.addScore(150); audio.win(); for(let i=0;i<6+Math.floor(this.score/200);i++) this.spawn(28+Math.random()*18); }
  }
  protected render(){
    this.clear('#0a0a12');
    const ctx=this.ctx;
    for(const r of this.rocks){ ctx.strokeStyle='#ffe66b'; ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.stroke(); }
    ctx.save(); ctx.translate(this.ship.x,this.ship.y); ctx.rotate(this.ship.a);
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-10,8); ctx.lineTo(-6,0); ctx.lineTo(-10,-8); ctx.fill();
    ctx.restore();
    ctx.fillStyle='#6bcbff'; for(const b of this.bullets) ctx.fillRect(b.x-2,b.y-2,4,4);
    this.drawHud(`LIVES ${this.lives}`);
  }
}
export const create: GameFactory=(c,h)=>new ShardField(c,h);
