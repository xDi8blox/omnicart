import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Rival={x:number;y:number;a:number;hp:number};
class ArenaKart extends GameBase {
  private me={x:0,y:0,a:0,s:0,hp:3,cool:0,item:0};
  private rivals:Rival[]=[]; private pickups:{x:number;y:number}[]=[];
  private shots:{x:number;y:number;vx:number;vy:number;life:number}[]=[];
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ff6b35');}
  protected onStart(){
    this.me={x:this.w/2,y:this.h/2+60,a:-Math.PI/2,s:0,hp:3,cool:0,item:0};
    this.rivals=[{x:this.w/2-80,y:this.h/2,a:0,hp:3},{x:this.w/2+80,y:this.h/2,a:Math.PI,hp:3},{x:this.w/2,y:this.h/2-80,a:1,hp:3}];
    this.pickups=[{x:100,y:100},{x:this.w-100,y:100},{x:100,y:this.h-100},{x:this.w-100,y:this.h-100}];
    this.shots=[];
  }
  protected update(dt:number){
    if(input.pressed('arrowleft')||input.pressed('a')) this.me.a-=2.8*dt;
    if(input.pressed('arrowright')||input.pressed('d')) this.me.a+=2.8*dt;
    if(input.pressed('arrowup')||input.pressed('w')) this.me.s=Math.min(240,this.me.s+180*dt); else this.me.s=Math.max(0,this.me.s-100*dt);
    this.me.x+=Math.cos(this.me.a)*this.me.s*dt; this.me.y+=Math.sin(this.me.a)*this.me.s*dt;
    this.me.x=Math.max(20,Math.min(this.w-20,this.me.x)); this.me.y=Math.max(40,Math.min(this.h-20,this.me.y));
    this.me.cool-=dt;
    for(const p of this.pickups) if(Math.hypot(p.x-this.me.x,p.y-this.me.y)<24){ this.me.item=1; p.x=40+Math.random()*(this.w-80); p.y=50+Math.random()*(this.h-100); audio.powerup(); }
    if(input.actionJust() && this.me.item && this.me.cool<=0){
      this.shots.push({x:this.me.x,y:this.me.y,vx:Math.cos(this.me.a)*360,vy:Math.sin(this.me.a)*360,life:1.2});
      this.me.item=0; this.me.cool=0.3; audio.blip(500);
    }
    for(const s of this.shots){ s.x+=s.vx*dt; s.y+=s.vy*dt; s.life-=dt; }
    this.shots=this.shots.filter(s=>s.life>0);
    for(const r of this.rivals){
      if(r.hp<=0) continue;
      const ang=Math.atan2(this.me.y-r.y,this.me.x-r.x);
      r.a += Math.atan2(Math.sin(ang-r.a),Math.cos(ang-r.a))*2*dt;
      r.x+=Math.cos(r.a)*120*dt; r.y+=Math.sin(r.a)*120*dt;
      r.x=Math.max(20,Math.min(this.w-20,r.x)); r.y=Math.max(40,Math.min(this.h-20,r.y));
      for(const s of this.shots) if(s.life>0 && Math.hypot(s.x-r.x,s.y-r.y)<18){ r.hp--; s.life=0; this.addScore(40); audio.hit(); }
      if(Math.hypot(r.x-this.me.x,r.y-this.me.y)<22){ this.me.hp--; audio.boom(); r.x+=Math.cos(r.a)*40; if(this.me.hp<=0){ this.gameOver(false); return; } }
    }
    this.rivals=this.rivals.filter(r=>r.hp>0);
    if(!this.rivals.length) this.gameOver(true);
  }
  protected render(){
    this.clear('#140a06');
    const ctx=this.ctx;
    ctx.strokeStyle='#ff6b35'; ctx.strokeRect(16,40,this.w-32,this.h-56);
    ctx.fillStyle='#ffe66b'; for(const p of this.pickups){ ctx.beginPath(); ctx.arc(p.x,p.y,8,0,7); ctx.fill(); }
    ctx.fillStyle='#6bcbff'; for(const s of this.shots) ctx.fillRect(s.x-3,s.y-3,6,6);
    for(const r of this.rivals){ ctx.save(); ctx.translate(r.x,r.y); ctx.rotate(r.a); ctx.fillStyle='#ff4d6d'; ctx.fillRect(-12,-8,24,16); ctx.restore(); }
    ctx.save(); ctx.translate(this.me.x,this.me.y); ctx.rotate(this.me.a); ctx.fillStyle='#ff6b35'; ctx.fillRect(-12,-8,24,16); ctx.restore();
    this.drawHud(`HP ${this.me.hp} ITEM ${this.me.item?'●':'-'}`);
  }
}
export const create: GameFactory=(c,h)=>new ArenaKart(c,h);
