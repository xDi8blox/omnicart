import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

type Boss={x:number;y:number;hp:number;max:number;phase:number;t:number;kind:number};
class ApexGauntlet extends GameBase {
  private p={x:0,y:0,cool:0,dash:0};
  private boss:Boss|null=null; private bullets:{x:number;y:number;vx:number;vy:number;enemy:boolean}[]=[];
  private index=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#9b2226');}
  protected onStart(){ this.p={x:this.w/2,y:this.h-70,cool:0,dash:0}; this.bullets=[]; this.index=0; this.nextBoss(); }
  private nextBoss(){
    const kinds=[{hp:30},{hp:45},{hp:60}];
    if(this.index>=kinds.length){ this.gameOver(true); return; }
    const k=kinds[this.index];
    this.boss={x:this.w/2,y:90,hp:k.hp,max:k.hp,phase:0,t:0,kind:this.index};
    this.index++; audio.powerup();
  }
  protected update(dt:number){
    if(!this.boss) return;
    const a=input.axis(); this.p.x+=a.x*280*dt; this.p.y+=a.y*240*dt;
    this.p.x=Math.max(20,Math.min(this.w-20,this.p.x)); this.p.y=Math.max(60,Math.min(this.h-20,this.p.y));
    this.p.cool-=dt; this.p.dash=Math.max(0,this.p.dash-dt);
    if(input.just('shift')&&this.p.dash<=0){ this.p.x+=a.x*60; this.p.y+=a.y*60; this.p.dash=1; audio.blip(200); }
    if((input.action()||input.pointer.down)&&this.p.cool<=0){ this.bullets.push({x:this.p.x,y:this.p.y,vx:0,vy:-420,enemy:false}); this.p.cool=0.15; audio.blip(800); }
    this.boss.t+=dt; this.boss.x=this.w/2+Math.sin(this.boss.t*(1+this.boss.kind))* (80+this.boss.kind*30);
    if(this.boss.t%0.6<dt){ const n=4+this.boss.kind*2; for(let i=0;i<n;i++){ const ang=(i/n)*Math.PI*2+this.boss.t; this.bullets.push({x:this.boss.x,y:this.boss.y,vx:Math.cos(ang)*140,vy:Math.sin(ang)*140,enemy:true}); } }
    for(const b of this.bullets){ b.x+=b.vx*dt; b.y+=b.vy*dt; }
    for(const b of this.bullets){
      if(!b.enemy && Math.hypot(b.x-this.boss.x,b.y-this.boss.y)<40){ this.boss.hp--; b.y=-999; this.addScore(5); audio.hit(); }
      if(b.enemy && Math.hypot(b.x-this.p.x,b.y-this.p.y)<14){ audio.boom(); this.gameOver(false); return; }
    }
    this.bullets=this.bullets.filter(b=>b.y>-40&&b.y<this.h+40&&b.x>-40&&b.x<this.w+40);
    if(this.boss.hp<=0){ this.addScore(300); this.boss=null; this.bullets=this.bullets.filter(b=>!b.enemy); this.nextBoss(); }
  }
  protected render(){
    this.clear('#100808');
    const ctx=this.ctx;
    ctx.fillStyle='#00f0ff'; ctx.beginPath(); ctx.moveTo(this.p.x,this.p.y-12); ctx.lineTo(this.p.x+10,this.p.y+12); ctx.lineTo(this.p.x-10,this.p.y+12); ctx.fill();
    if(this.boss){
      ctx.fillStyle='#9b2226'; ctx.fillRect(this.boss.x-40,this.boss.y-24,80,48);
      ctx.fillStyle='#400'; ctx.fillRect(this.w*0.2,20,this.w*0.6,10);
      ctx.fillStyle='#ef476f'; ctx.fillRect(this.w*0.2,20,this.w*0.6*(this.boss.hp/this.boss.max),10);
    }
    for(const b of this.bullets){ ctx.fillStyle=b.enemy?'#ff4d6d':'#ffe66b'; ctx.fillRect(b.x-3,b.y-3,6,6); }
    this.drawHud(`BOSS ${this.index}/3`);
  }
}
export const create: GameFactory=(c,h)=>new ApexGauntlet(c,h);
