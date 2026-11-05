import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Rival={x:number;y:number;a:number;hp:number;s:number};
class ArenaKart extends GameBase {
  private me={x:0,y:0,a:0,s:0,hp:5,cool:0,item:0};
  private rivals:Rival[]=[]; private pickups:{x:number;y:number;t:number}[]=[];
  private shots:{x:number;y:number;vx:number;vy:number;life:number}[]=[];
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ff6b35');}
  protected onStart(){
    this.me={x:this.w/2,y:this.h/2+70,a:-Math.PI/2,s:0,hp:5,cool:0,item:0};
    this.rivals=[{x:this.w/2-90,y:this.h/2,a:0,hp:4,s:0},{x:this.w/2+90,y:this.h/2,a:Math.PI,hp:4,s:0},{x:this.w/2,y:this.h/2-90,a:1.2,hp:4,s:0}];
    this.pickups=[{x:100,y:100,t:0},{x:this.w-100,y:100,t:0},{x:100,y:this.h-100,t:0},{x:this.w-100,y:this.h-100,t:0}];
    this.shots=[];
  }
  protected update(dt:number){
    if(input.pressed('arrowleft')||input.pressed('a')) this.me.a-=3*dt;
    if(input.pressed('arrowright')||input.pressed('d')) this.me.a+=3*dt;
    if(input.pressed('arrowup')||input.pressed('w')) this.me.s=Math.min(260,this.me.s+200*dt); else this.me.s=Math.max(0,this.me.s-120*dt);
    this.me.x+=Math.cos(this.me.a)*this.me.s*dt; this.me.y+=Math.sin(this.me.a)*this.me.s*dt;
    this.me.x=Math.max(24,Math.min(this.w-24,this.me.x)); this.me.y=Math.max(48,Math.min(this.h-24,this.me.y));
    this.me.cool-=dt;
    for(const p of this.pickups){ p.t+=dt;
      if(Math.hypot(p.x-this.me.x,p.y-this.me.y)<26){ this.me.item=1; p.x=50+Math.random()*(this.w-100); p.y=60+Math.random()*(this.h-120); audio.powerup(); this.burst(this.me.x,this.me.y,'#ffe66b',10); }
    }
    if(input.actionJust() && this.me.item && this.me.cool<=0){
      this.shots.push({x:this.me.x,y:this.me.y,vx:Math.cos(this.me.a)*400,vy:Math.sin(this.me.a)*400,life:1.3});
      this.me.item=0; this.me.cool=0.25; audio.blip(500);
    }
    for(const s of this.shots){ s.x+=s.vx*dt; s.y+=s.vy*dt; s.life-=dt; }
    this.shots=this.shots.filter(s=>s.life>0);
    for(const r of this.rivals){
      if(r.hp<=0) continue;
      // seek player or nearest pickup
      let tx=this.me.x, ty=this.me.y;
      if(Math.random()<0.01){ const p=this.pickups[(Math.random()*this.pickups.length)|0]; tx=p.x; ty=p.y; }
      const ang=Math.atan2(ty-r.y,tx-r.x);
      r.a += Math.atan2(Math.sin(ang-r.a),Math.cos(ang-r.a))*2.4*dt;
      r.s=Math.min(200,r.s+100*dt); r.x+=Math.cos(r.a)*r.s*dt; r.y+=Math.sin(r.a)*r.s*dt;
      r.x=Math.max(24,Math.min(this.w-24,r.x)); r.y=Math.max(48,Math.min(this.h-24,r.y));
      for(const s of this.shots) if(s.life>0 && Math.hypot(s.x-r.x,s.y-r.y)<20){ r.hp--; s.life=0; this.addScore(50); audio.hit(); this.burst(r.x,r.y,'#ff4d6d',12); this.bump(0.1); }
      if(Math.hypot(r.x-this.me.x,r.y-this.me.y)<24){ this.me.hp--; audio.boom(); this.bump(0.3); r.x+=Math.cos(r.a)*50; r.y+=Math.sin(r.a)*50; if(this.me.hp<=0){ this.gameOver(false); return; } }
    }
    this.rivals=this.rivals.filter(r=>r.hp>0);
    if(!this.rivals.length) this.gameOver(true);
  }
  protected render(){
    this.clear('#140a06');
    const ctx=this.ctx;
    ctx.strokeStyle='#ff6b35'; ctx.lineWidth=3; ctx.strokeRect(14,42,this.w-28,this.h-56);
    for(const p of this.pickups){ ctx.fillStyle='#ffe66b'; ctx.beginPath(); ctx.arc(p.x,p.y,7+Math.sin(p.t*4),0,7); ctx.fill(); }
    ctx.fillStyle='#6bcbff'; for(const s of this.shots) ctx.fillRect(s.x-3,s.y-3,6,6);
    for(const r of this.rivals){ ctx.save(); ctx.translate(r.x,r.y); ctx.rotate(r.a); ctx.fillStyle='#ff4d6d'; ctx.fillRect(-14,-9,28,18); ctx.restore();
      ctx.fillStyle='#400'; ctx.fillRect(r.x-16,r.y-22,32,4); ctx.fillStyle='#f44'; ctx.fillRect(r.x-16,r.y-22,32*(r.hp/4),4); }
    ctx.save(); ctx.translate(this.me.x,this.me.y); ctx.rotate(this.me.a); ctx.fillStyle='#ff6b35'; ctx.fillRect(-14,-9,28,18); ctx.restore();
    this.drawHud(`HP ${this.me.hp} · ITEM ${this.me.item?'●':'-'} · FOES ${this.rivals.length}`);
  }
}
export const create: GameFactory=(c,h)=>new ArenaKart(c,h);
