import type { GameFactory, GameHooks } from '../core/types';
import { GameBase } from '../core/GameBase';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import { fillVoidBg, glowCircle, roundRect, drawPremiumHud } from '../shared/fx';

type Ball = { x: number; y: number; vx: number; vy: number };
type Bumper = { x: number; y: number; r: number; pulse: number };

class Fluxball extends GameBase {
  private ball: Ball = { x:0,y:0,vx:0,vy:0 };
  private flipL = 0.4; private flipR = -0.4; // radians
  private flipLKick=0; private flipRKick=0;
  private bumpers: Bumper[]=[];
  private launched=false; private ballsLeft=3; private mult=1; private multT=0;
  private started=false; private table = { x:0,y:0,w:0,h:0 };

  constructor(c: HTMLCanvasElement, h: GameHooks){ super(c,h,'#f0c14b'); }

  protected onStart(): void {
    this.ballsLeft=3; this.mult=1; this.multT=0; this.started=false; this.launched=false;
    this.layoutTable(); this.resetBall();
    this.bumpers=[
      {x:this.table.x+this.table.w*0.35,y:this.table.y+this.table.h*0.28,r:28,pulse:0},
      {x:this.table.x+this.table.w*0.65,y:this.table.y+this.table.h*0.28,r:28,pulse:0},
      {x:this.table.x+this.table.w*0.5,y:this.table.y+this.table.h*0.42,r:32,pulse:0},
      {x:this.table.x+this.table.w*0.28,y:this.table.y+this.table.h*0.5,r:22,pulse:0},
      {x:this.table.x+this.table.w*0.72,y:this.table.y+this.table.h*0.5,r:22,pulse:0},
    ];
  }
  private layoutTable(): void {
    this.table.w=Math.min(420, this.w*0.55); this.table.h=Math.min(560, this.h-80);
    this.table.x=(this.w-this.table.w)/2; this.table.y=50+(this.h-50-this.table.h)/2;
  }
  private resetBall(): void {
    this.ball={ x:this.table.x+this.table.w-28, y:this.table.y+this.table.h-80, vx:0, vy:0 };
    this.launched=false;
  }

  protected update(dt: number): void {
    this.layoutTable();
    if(!this.started){ if(input.actionJust()||input.pointer.justDown){ this.started=true; audio.blip(); } return; }
    // flippers
    const leftDown=input.pressed('z')||input.left()||(input.pointer.down && input.pointer.x<this.w/2);
    const rightDown=input.pressed('m')||input.right()||(input.pointer.down && input.pointer.x>=this.w/2 && !input.action());
    const targetL=leftDown?-0.55:0.45; const targetR=rightDown?0.55:-0.45;
    const prevL=this.flipL, prevR=this.flipR;
    this.flipL += (targetL-this.flipL)*Math.min(1,dt*18);
    this.flipR += (targetR-this.flipR)*Math.min(1,dt*18);
    this.flipLKick = leftDown && prevL>targetL+0.2 ? 1 : Math.max(0,this.flipLKick-dt*4);
    this.flipRKick = rightDown && prevR<targetR-0.2 ? 1 : Math.max(0,this.flipRKick-dt*4);

    if(!this.launched){
      if(input.actionJust()||(input.pointer.justDown && Math.abs(input.pointer.x-(this.table.x+this.table.w-28))<40)){
        this.launched=true; this.ball.vy=-520-Math.random()*80; this.ball.vx=-40; audio.blip(300);
      }
      return;
    }
    this.multT=Math.max(0,this.multT-dt); if(this.multT<=0) this.mult=1;
    // physics
    this.ball.vy += 520*dt; // gravity
    this.ball.vx *= (1-0.15*dt); this.ball.vy *= (1-0.05*dt);
    this.ball.x += this.ball.vx*dt; this.ball.y += this.ball.vy*dt;
    const L=this.table.x+18, R=this.table.x+this.table.w-18, T=this.table.y+18, B=this.table.y+this.table.h-18;
    if(this.ball.x<L){ this.ball.x=L; this.ball.vx=Math.abs(this.ball.vx)*0.85; }
    if(this.ball.x>R){ this.ball.x=R; this.ball.vx=-Math.abs(this.ball.vx)*0.85; }
    if(this.ball.y<T){ this.ball.y=T; this.ball.vy=Math.abs(this.ball.vy)*0.85; }
    // drain
    const mid=this.table.x+this.table.w/2;
    if(this.ball.y>B-10 && this.ball.x>mid-50 && this.ball.x<mid+50){
      this.ballsLeft--; audio.lose();
      if(this.ballsLeft<=0){ this.gameOver(false); return; }
      this.resetBall(); return;
    }
    if(this.ball.y>B){ this.ball.y=B; this.ball.vy=-Math.abs(this.ball.vy)*0.6; }

    // bumpers
    for(const b of this.bumpers){
      b.pulse=Math.max(0,b.pulse-dt);
      const dx=this.ball.x-b.x, dy=this.ball.y-b.y; const d=Math.hypot(dx,dy);
      if(d<b.r+8){
        const nx=dx/Math.max(0.01,d), ny=dy/Math.max(0.01,d);
        this.ball.x=b.x+nx*(b.r+8); this.ball.y=b.y+ny*(b.r+8);
        const dot=this.ball.vx*nx+this.ball.vy*ny;
        this.ball.vx=(this.ball.vx-2*dot*nx)*0.3 + nx*320;
        this.ball.vy=(this.ball.vy-2*dot*ny)*0.3 + ny*320;
        b.pulse=1; this.mult=Math.min(10,this.mult+1); this.multT=2.5;
        this.addScore(25*this.mult); audio.blip(700+this.mult*40); this.burst(b.x,b.y,'#ff2040',10);
      }
    }
    // flipper collision (approx segments)
    this.hitFlipper(this.table.x+this.table.w*0.28, this.table.y+this.table.h*0.82, this.flipL, this.flipLKick, 1);
    this.hitFlipper(this.table.x+this.table.w*0.72, this.table.y+this.table.h*0.82, this.flipR, this.flipRKick, -1);
    // ramp bonus zones
    if(this.ball.y<this.table.y+this.table.h*0.22 && (this.ball.x<this.table.x+60 || this.ball.x>this.table.x+this.table.w-60)){
      this.addScore(2*this.mult);
    }
  }

  private hitFlipper(fx:number, fy:number, ang:number, kick:number, side:number): void {
    const len=70; const ex=fx+Math.cos(ang)*len*side; const ey=fy+Math.sin(ang)*len;
    // closest point on segment
    const dx=ex-fx, dy=ey-fy; const t=Math.max(0,Math.min(1, ((this.ball.x-fx)*dx+(this.ball.y-fy)*dy)/(dx*dx+dy*dy)));
    const cx=fx+dx*t, cy=fy+dy*t; const dist=Math.hypot(this.ball.x-cx,this.ball.y-cy);
    if(dist<12){
      const nx=(this.ball.x-cx)/Math.max(0.01,dist), ny=(this.ball.y-cy)/Math.max(0.01,dist);
      this.ball.x=cx+nx*12; this.ball.y=cy+ny*12;
      const boost=220+kick*480;
      this.ball.vx=nx*boost*0.4 + this.ball.vx*0.3; this.ball.vy=ny*boost - Math.abs(this.ball.vy)*0.2;
      if(kick>0.2){ audio.hit(); this.addScore(5*this.mult); }
    }
  }

  protected render(): void {
    fillVoidBg(this.ctx,this.w,this.h); const ctx=this.ctx; const t=this.table;
    // table
    const tg=ctx.createLinearGradient(t.x,t.y,t.x,t.y+t.h);
    tg.addColorStop(0,'#220814'); tg.addColorStop(0.5,'#100610'); tg.addColorStop(1,'#1a0810');
    ctx.fillStyle=tg; roundRect(ctx,t.x,t.y,t.w,t.h,16); ctx.fill();
    ctx.strokeStyle='rgba(255,32,64,0.55)'; ctx.lineWidth=3; ctx.stroke();
    ctx.strokeStyle='rgba(0,232,255,0.35)'; ctx.beginPath(); ctx.arc(t.x+t.w/2,t.y+t.h*0.3,70,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='rgba(240,193,75,0.35)'; ctx.font='700 22px Cinzel, serif'; ctx.textAlign='center';
    ctx.fillText('FLUXBALL', t.x+t.w/2, t.y+t.h*0.62);
    // apron lights
    for(let i=0;i<14;i++){ const lx=t.x+20+(i/13)*(t.w-40); glowCircle(ctx,lx,t.y+t.h-14,6,i%2?'rgba(255,32,64,0.8)':'rgba(0,232,255,0.8)'); }
    // ramps
    ctx.strokeStyle='rgba(0,232,255,0.7)'; ctx.lineWidth=6; ctx.lineCap='round';
    ctx.beginPath(); ctx.arc(t.x+t.w*0.22,t.y+t.h*0.35,55,-1.2,0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(t.x+t.w*0.78,t.y+t.h*0.35,55,Math.PI-0.6,Math.PI+1.2); ctx.stroke();
    for(const b of this.bumpers){
      glowCircle(ctx,b.x,b.y,b.r*(1.2+b.pulse*0.4),'rgba(255,32,64,0.55)');
      const g=ctx.createRadialGradient(b.x-6,b.y-6,4,b.x,b.y,b.r);
      g.addColorStop(0,'#ff9ab0'); g.addColorStop(0.5,'#ff2040'); g.addColorStop(1,'#400010');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#00e8ff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(b.x,b.y,b.r+4,0,Math.PI*2); ctx.stroke();
    }
    // flippers
    this.drawFlip(t.x+t.w*0.28, t.y+t.h*0.82, this.flipL, 1);
    this.drawFlip(t.x+t.w*0.72, t.y+t.h*0.82, this.flipR, -1);
    glowCircle(ctx,this.ball.x,this.ball.y,16,'rgba(0,232,255,0.7)');
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(this.ball.x,this.ball.y,7,0,Math.PI*2); ctx.fill();
    drawPremiumHud(ctx,this.w,{ title:'Fluxball', stats:[
      {label:'SCORE',value:String(this.score),color:'#f0c14b'},
      {label:'BALL',value:String(this.ballsLeft),color:'#00e8ff'},
      {label:'MULT',value:'x'+this.mult,color:'#ff2040'},
    ]});
    if(!this.started){ ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,this.w,this.h);
      ctx.fillStyle='#fff'; ctx.font='800 26px Orbitron'; ctx.textAlign='center'; ctx.fillText('FLUXBALL',this.w/2,this.h/2-10);
      ctx.fillStyle='#9a8aa8'; ctx.font='600 14px Rajdhani'; ctx.fillText('Z/M flippers · Space plunger',this.w/2,this.h/2+18); }
  }
  private drawFlip(x:number,y:number,ang:number,side:number): void {
    const ctx=this.ctx; ctx.save(); ctx.translate(x,y); ctx.rotate(ang);
    const g=ctx.createLinearGradient(0,-6,side*70,6); g.addColorStop(0,'#fff'); g.addColorStop(0.3,'#f0c14b'); g.addColorStop(1,'#5a4000');
    ctx.fillStyle=g; roundRect(ctx, side>0?0:-70, -7, 70, 14, 7); ctx.fill();
    glowCircle(ctx,0,0,12,'rgba(240,193,75,0.5)'); ctx.restore();
  }
}
export const create: GameFactory=(c,h)=>new Fluxball(c,h);
