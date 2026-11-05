import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class LumenChase extends GameBase {
  private cell=24; private cols=0; private rows=0;
  private maze:number[][]=[];
  private px=1; private py=1; private dots:{x:number;y:number}[]=[];
  private ghosts:{x:number;y:number;vx:number;vy:number;mode:'chase'|'scatter';t:number;color:string}[]=[];
  private moveT=0; private sx=0; private sy=0; private power=0; private lives=3;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ff9f1c');}
  protected onStart(){
    this.cols=Math.floor(this.w/this.cell)|1; if(this.cols%2===0)this.cols--;
    this.rows=Math.floor((this.h-36)/this.cell)|1; if(this.rows%2===0)this.rows--;
    this.maze=Array.from({length:this.rows},()=>Array(this.cols).fill(0));
    for(let y=1;y<this.rows;y+=2) for(let x=1;x<this.cols;x+=2) this.maze[y][x]=1;
    for(let y=1;y<this.rows;y+=2) for(let x=1;x<this.cols-2;x+=2) if(Math.random()<0.75) this.maze[y][x+1]=1;
    for(let y=1;y<this.rows-2;y+=2) for(let x=1;x<this.cols;x+=2) if(Math.random()<0.75) this.maze[y+1][x]=1;
    // corridors
    for(let x=1;x<this.cols-1;x++) if(Math.random()<0.15) this.maze[Math.floor(this.rows/2)|1][x]=1;
    this.px=1; this.py=1; this.dots=[]; this.lives=3; this.power=0;
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++) if(this.maze[y][x]&&!(x===1&&y===1)) this.dots.push({x,y});
    const colors=['#4cc9f0','#f72585','#80ffdb','#ffe66b'];
    this.ghosts=[
      {x:this.cols-2,y:1,vx:-1,vy:0,mode:'chase',t:0,color:colors[0]},
      {x:1,y:this.rows-2,vx:0,vy:-1,mode:'scatter',t:2,color:colors[1]},
      {x:this.cols-2,y:this.rows-2,vx:-1,vy:0,mode:'chase',t:1,color:colors[2]},
    ];
    this.moveT=0; this._gacc=0;
  }
  private can(x:number,y:number){ return x>=0&&y>=0&&x<this.cols&&y<this.rows&&this.maze[y][x]===1; }
  private _gacc=0;
  private ghostStep(g:typeof this.ghosts[0]){
    g.t-=0.18; if(g.t<=0){ g.mode=g.mode==='chase'?'scatter':'chase'; g.t=g.mode==='chase'?5:2.5; }
    const opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([vx,vy])=>this.can(g.x+vx,g.y+vy) && !(vx===-g.vx && vy===-g.vy && Math.random()>0.15));
    if(!opts.length){ const any=[[1,0],[-1,0],[0,1],[0,-1]].filter(([vx,vy])=>this.can(g.x+vx,g.y+vy)); if(any.length){ const o=any[(Math.random()*any.length)|0]; g.vx=o[0]; g.vy=o[1]; } return; }
    let best=opts[0]; let bestD=1e9;
    const tx=g.mode==='chase'?this.px:(g.color.length%2?1:this.cols-2);
    const ty=g.mode==='chase'?this.py:(g.color.length%2?1:this.rows-2);
    for(const o of opts){
      const d=Math.abs(g.x+o[0]-tx)+Math.abs(g.y+o[1]-ty);
      const score=this.power>0?-d:d;
      if(score<bestD){ bestD=score; best=o; }
    }
    g.vx=best[0]; g.vy=best[1];
    if(this.can(g.x+g.vx,g.y+g.vy)){ g.x+=g.vx; g.y+=g.vy; }
  }
  protected update(dt:number){
    this.moveT-=dt; this.power=Math.max(0,this.power-dt);
    let dx=0,dy=0; const a=input.axis();
    if(a.x||a.y){ dx=Math.sign(a.x); dy=dx?0:Math.sign(a.y); }
    if(input.pointer.justDown){this.sx=input.pointer.x;this.sy=input.pointer.y;}
    if(input.pointer.justUp){
      const sx=input.pointer.x-this.sx, sy=input.pointer.y-this.sy;
      if(Math.abs(sx)+Math.abs(sy)>20){ if(Math.abs(sx)>Math.abs(sy)) dx=Math.sign(sx); else dy=Math.sign(sy); }
    }
    if(this.moveT<=0 && (dx||dy) && this.can(this.px+dx,this.py+dy)){ this.px+=dx; this.py+=dy; this.moveT=0.11; }
    const di=this.dots.findIndex(d=>d.x===this.px&&d.y===this.py);
    if(di>=0){
      this.dots.splice(di,1); this.addScore(10); audio.blip(900);
      if(this.dots.length%20===0){ this.power=5; audio.powerup(); this.burst(this.px*this.cell,this.py*this.cell,'#ffe66b',12); }
      if(this.dots.length===0) this.gameOver(true);
    }
    this._gacc+=dt;
    if(this._gacc>0.16){ this._gacc=0; for(const g of this.ghosts) this.ghostStep(g); }
    for(const g of this.ghosts){
      if(g.x===this.px&&g.y===this.py){
        if(this.power>0){ this.addScore(100); audio.boom(); this.burst(g.x*this.cell,g.y*this.cell,g.color,16); g.x=this.cols-2; g.y=1; }
        else { this.lives--; this.bump(0.35); audio.hit(); this.px=1; this.py=1; if(this.lives<=0) this.gameOver(false); }
      }
    }
  }
  protected render(){
    this.clear('#0a0810');
    const ox=(this.w-this.cols*this.cell)/2, oy=36+(this.h-36-this.rows*this.cell)/2;
    const ctx=this.ctx;
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++){
      if(!this.maze[y][x]){ ctx.fillStyle='#1a1030'; ctx.fillRect(ox+x*this.cell,oy+y*this.cell,this.cell,this.cell); }
    }
    ctx.fillStyle='#ffe66b';
    for(const d of this.dots){ ctx.beginPath(); ctx.arc(ox+d.x*this.cell+this.cell/2,oy+d.y*this.cell+this.cell/2,2.5,0,7); ctx.fill(); }
    ctx.fillStyle=this.power>0?'#fff':'#ff9f1c'; ctx.shadowBlur=10; ctx.shadowColor='#ff9f1c';
    ctx.beginPath(); ctx.arc(ox+this.px*this.cell+this.cell/2,oy+this.py*this.cell+this.cell/2,8,0,7); ctx.fill(); ctx.shadowBlur=0;
    for(const g of this.ghosts){ ctx.fillStyle=this.power>0?'#4cc9f0':g.color; ctx.fillRect(ox+g.x*this.cell+4,oy+g.y*this.cell+4,this.cell-8,this.cell-8); }
    this.drawHud(`ORBS ${this.dots.length} · HP ${this.lives}`);
  }
}
export const create: GameFactory=(c,h)=>new LumenChase(c,h);
