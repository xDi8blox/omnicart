import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Rock={x:number;y:number;r:number;vx:number;vy:number;alive:boolean};
class ShardField extends GameBase {
  private ship={x:0,y:0,a:0,vx:0,vy:0};
  private rocks:Rock[]=[]; private bullets:{x:number;y:number;vx:number;vy:number;life:number}[]=[];
  private dash=0; private lives=3; private cool=0; private invuln=0; private wave=1;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ffe66b');}
  protected onStart(){
    this.ship={x:this.w/2,y:this.h/2,a:-Math.PI/2,vx:0,vy:0};
    this.rocks=[]; this.bullets=[]; this.dash=0; this.lives=3; this.cool=0; this.invuln=0; this.wave=1;
    this.spawnWave();
  }
  private spawnWave(){ for(let i=0;i<5+this.wave;i++) this.spawn(26+Math.random()*18); }
  private spawn(r:number){
    let x=0,y=0; do{ x=Math.random()*this.w; y=Math.random()*this.h; } while(Math.hypot(x-this.ship.x,y-this.ship.y)<140);
    const a=Math.random()*Math.PI*2, sp=50+Math.random()*70+this.wave*5;
    this.rocks.push({x,y,r,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,alive:true});
  }
  protected update(dt:number){
    this.invuln=Math.max(0,this.invuln-dt); this.dash=Math.max(0,this.dash-dt); this.cool-=dt;
    if(input.pressed('arrowleft')||input.pressed('a')) this.ship.a-=3.4*dt;
    if(input.pressed('arrowright')||input.pressed('d')) this.ship.a+=3.4*dt;
    if(input.pressed('arrowup')||input.pressed('w')){ this.ship.vx+=Math.cos(this.ship.a)*260*dt; this.ship.vy+=Math.sin(this.ship.a)*260*dt; }
    if((input.just('shift')||input.just('x'))&&this.dash<=0){
      this.ship.x+=Math.cos(this.ship.a)*110; this.ship.y+=Math.sin(this.ship.a)*110;
      this.dash=1.0; this.invuln=0.35; audio.powerup(); this.burst(this.ship.x,this.ship.y,'#ffe66b',14);
    }
    if(input.action()&&this.cool<=0){
      this.bullets.push({x:this.ship.x,y:this.ship.y,vx:Math.cos(this.ship.a)*460,vy:Math.sin(this.ship.a)*460,life:1.1});
      this.cool=0.16; audio.blip(700);
    }
    this.ship.vx*=0.992; this.ship.vy*=0.992;
    this.ship.x=(this.ship.x+this.ship.vx*dt+this.w)%this.w;
    this.ship.y=(this.ship.y+this.ship.vy*dt+this.h)%this.h;
    for(const b of this.bullets){ b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt; }
    this.bullets=this.bullets.filter(b=>b.life>0);
    for(const r of this.rocks){
      if(!r.alive) continue;
      r.x=(r.x+r.vx*dt+this.w)%this.w; r.y=(r.y+r.vy*dt+this.h)%this.h;
      if(this.invuln<=0 && Math.hypot(r.x-this.ship.x,r.y-this.ship.y)<r.r+10){
        this.lives--; this.bump(0.4); audio.boom(); this.invuln=1.5; this.burst(this.ship.x,this.ship.y,'#ff4d6d',20);
        if(this.lives<=0){ this.gameOver(false); return; }
      }
      for(const b of this.bullets){
        if(b.life>0 && Math.hypot(r.x-b.x,r.y-b.y)<r.r){
          b.life=0; r.alive=false; audio.hit(); this.addScore(Math.floor(50-r.r)); this.burst(r.x,r.y,'#ffe66b',12);
          if(r.r>16){ for(let i=0;i<2;i++){ const a=Math.random()*6.28; this.rocks.push({x:r.x,y:r.y,r:r.r*0.55,vx:Math.cos(a)*90,vy:Math.sin(a)*90,alive:true}); } }
        }
      }
    }
    this.rocks=this.rocks.filter(r=>r.alive);
    if(this.rocks.length===0){ this.wave++; this.addScore(200*this.wave); audio.win(); this.spawnWave(); }
  }
  protected render(){
    this.clear('#0a0a12');
    const ctx=this.ctx;
    for(const r of this.rocks){ ctx.strokeStyle='#ffe66b'; ctx.lineWidth=2; ctx.beginPath();
      for(let i=0;i<7;i++){ const a=(i/7)*Math.PI*2; const rr=r.r*(0.85+((i*37)%10)/40); const x=r.x+Math.cos(a)*rr, y=r.y+Math.sin(a)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
      ctx.closePath(); ctx.stroke(); }
    ctx.save(); ctx.translate(this.ship.x,this.ship.y); ctx.rotate(this.ship.a);
    ctx.globalAlpha=this.invuln>0?0.5:1; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-10,8); ctx.lineTo(-6,0); ctx.lineTo(-10,-8); ctx.fill();
    ctx.restore(); ctx.globalAlpha=1;
    ctx.fillStyle='#6bcbff'; for(const b of this.bullets) ctx.fillRect(b.x-2,b.y-2,4,4);
    this.drawHud(`LIVES ${this.lives} · WAVE ${this.wave}`);
  }
}
export const create: GameFactory=(c,h)=>new ShardField(c,h);
