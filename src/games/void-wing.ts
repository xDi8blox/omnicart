import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Ent={x:number;y:number;w:number;h:number;hp:number;vx:number;vy:number;kind:'grunt'|'boss'};
class VoidWing extends GameBase {
  private player={x:0,y:0,w:36,h:28};
  private bullets:{x:number;y:number;vy:number}[]=[];
  private enemies:Ent[]=[];
  private wave=1; private cooldown=0; private spawnT=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#6bcbff');}
  protected onStart(){
    this.player={x:this.w/2-18,y:this.h-60,w:36,h:28};
    this.bullets=[]; this.enemies=[]; this.wave=1; this.cooldown=0; this.spawnT=0;
    this.spawnWave();
  }
  private spawnWave(){
    const n=4+this.wave*2;
    for(let i=0;i<n;i++){
      this.enemies.push({x:40+(i%8)*((this.w-80)/8),y:50+Math.floor(i/8)*40,w:28,h:22,hp:1+Math.floor(this.wave/3),vx:40+this.wave*5,vy:20,kind:'grunt'});
    }
    if(this.wave%3===0) this.enemies.push({x:this.w/2-40,y:60,w:80,h:40,hp:12+this.wave*2,vx:80,vy:10,kind:'boss'});
  }
  protected update(dt:number){
    const a=input.axis();
    this.player.x+=a.x*320*dt; this.player.y+=a.y*260*dt;
    if(input.pointer.down){ this.player.x=input.pointer.x-this.player.w/2; this.player.y=Math.min(this.h-40,Math.max(50,input.pointer.y)); }
    this.player.x=Math.max(0,Math.min(this.w-this.player.w,this.player.x));
    this.player.y=Math.max(40,Math.min(this.h-this.player.h,this.player.y));
    this.cooldown-=dt;
    if((input.action()||input.pointer.down) && this.cooldown<=0){
      this.bullets.push({x:this.player.x+this.player.w/2,y:this.player.y,vy:-480});
      this.cooldown=0.18; audio.blip(880);
    }
    for(const b of this.bullets) b.y+=b.vy*dt;
    this.bullets=this.bullets.filter(b=>b.y>-20);
    for(const e of this.enemies){
      e.x+=e.vx*dt; e.y+=e.vy*dt*0.2;
      if(e.x<10||e.x+e.w>this.w-10) e.vx*=-1;
    }
    for(const b of this.bullets){
      for(const e of this.enemies){
        if(e.hp<=0) continue;
        if(b.x>e.x&&b.x<e.x+e.w&&b.y>e.y&&b.y<e.y+e.h){
          e.hp--; b.y=-999; this.addScore(e.kind==='boss'?25:10); audio.hit();
          if(e.hp<=0){ audio.boom(); this.addScore(e.kind==='boss'?200:30); }
        }
      }
    }
    this.enemies=this.enemies.filter(e=>e.hp>0 && e.y<this.h+40);
    for(const e of this.enemies){
      if(e.x<this.player.x+this.player.w&&e.x+e.w>this.player.x&&e.y<this.player.y+this.player.h&&e.y+e.h>this.player.y){
        audio.boom(); this.gameOver(false); return;
      }
    }
    if(this.enemies.length===0){ this.wave++; this.addScore(100*this.wave); audio.powerup(); this.spawnWave(); }
  }
  protected render(){
    this.clear('#050818');
    const ctx=this.ctx;
    ctx.fillStyle='#6bcbff'; ctx.beginPath();
    ctx.moveTo(this.player.x+this.player.w/2,this.player.y);
    ctx.lineTo(this.player.x+this.player.w,this.player.y+this.player.h);
    ctx.lineTo(this.player.x,this.player.y+this.player.h); ctx.fill();
    ctx.fillStyle='#ffe66b';
    for(const b of this.bullets) ctx.fillRect(b.x-2,b.y-8,4,12);
    for(const e of this.enemies){
      ctx.fillStyle=e.kind==='boss'?'#ff4d6d':'#ff9f1c';
      ctx.fillRect(e.x,e.y,e.w,e.h);
    }
    this.drawHud(`WAVE ${this.wave}`);
  }
}
export const create: GameFactory=(c,h)=>new VoidWing(c,h);
