import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class LumenChase extends GameBase {
  private cell=24; private cols=0; private rows=0;
  private maze:number[][]=[]; // 0 wall 1 path
  private px=1; private py=1; private dots:{x:number;y:number}[]=[];
  private ghosts:{x:number;y:number;vx:number;vy:number}[]=[];
  private moveT=0; private sx=0; private sy=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ff9f1c');}
  protected onStart(){
    this.cols=Math.floor(this.w/this.cell)|1; if(this.cols%2===0)this.cols--;
    this.rows=Math.floor((this.h-36)/this.cell)|1; if(this.rows%2===0)this.rows--;
    this.maze=Array.from({length:this.rows},()=>Array(this.cols).fill(0));
    // simple maze carve
    for(let y=1;y<this.rows;y+=2) for(let x=1;x<this.cols;x+=2) this.maze[y][x]=1;
    for(let y=1;y<this.rows;y+=2) for(let x=1;x<this.cols-2;x+=2) if(Math.random()<0.7) this.maze[y][x+1]=1;
    for(let y=1;y<this.rows-2;y+=2) for(let x=1;x<this.cols;x+=2) if(Math.random()<0.7) this.maze[y+1][x]=1;
    this.px=1; this.py=1; this.dots=[];
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++) if(this.maze[y][x]&&!(x===1&&y===1)) this.dots.push({x,y});
    this.ghosts=[
      {x:this.cols-2,y:1,vx:-1,vy:0},
      {x:1,y:this.rows-2,vx:0,vy:-1},
      {x:this.cols-2,y:this.rows-2,vx:-1,vy:0},
    ];
    this.moveT=0;
  }
  private can(x:number,y:number){ return x>=0&&y>=0&&x<this.cols&&y<this.rows&&this.maze[y][x]===1; }
  protected update(dt:number){
    this.moveT-=dt;
    let dx=0,dy=0; const a=input.axis();
    if(a.x||a.y){ dx=Math.sign(a.x); dy=dx?0:Math.sign(a.y); }
    if(input.pointer.justDown){this.sx=input.pointer.x;this.sy=input.pointer.y;}
    if(input.pointer.justUp){
      const sx=input.pointer.x-this.sx, sy=input.pointer.y-this.sy;
      if(Math.abs(sx)+Math.abs(sy)>20){ if(Math.abs(sx)>Math.abs(sy)) dx=Math.sign(sx); else dy=Math.sign(sy); }
    }
    if(this.moveT<=0 && (dx||dy) && this.can(this.px+dx,this.py+dy)){ this.px+=dx; this.py+=dy; this.moveT=0.12; }
    const di=this.dots.findIndex(d=>d.x===this.px&&d.y===this.py);
    if(di>=0){ this.dots.splice(di,1); this.addScore(10); audio.blip(900); if(this.dots.length===0) this.gameOver(true); }
    // ghosts simple
    for(const g of this.ghosts){
      if(Math.random()<0.02 || !this.can(g.x+g.vx,g.y+g.vy)){
        const opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([vx,vy])=>this.can(g.x+vx,g.y+vy));
        if(opts.length){ const o=opts[(Math.random()*opts.length)|0]; g.vx=o[0]; g.vy=o[1]; }
      }
      if(this.moveT<=0){ /* sync roughly */ }
    }
    this._gacc=(this._gacc??0)+dt;
    if(this._gacc>0.18){
      this._gacc=0;
      for(const g of this.ghosts){ if(this.can(g.x+g.vx,g.y+g.vy)){ g.x+=g.vx; g.y+=g.vy; } }
    }
    for(const g of this.ghosts) if(g.x===this.px&&g.y===this.py){ audio.hit(); this.gameOver(false); }
  }
  private _gacc=0;
  protected render(){
    this.clear('#0a0810');
    const ox=(this.w-this.cols*this.cell)/2, oy=36+(this.h-36-this.rows*this.cell)/2;
    const ctx=this.ctx;
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++){
      if(!this.maze[y][x]){ ctx.fillStyle='#1a1030'; ctx.fillRect(ox+x*this.cell,oy+y*this.cell,this.cell,this.cell); }
    }
    ctx.fillStyle='#ffe66b';
    for(const d of this.dots){ ctx.beginPath(); ctx.arc(ox+d.x*this.cell+this.cell/2,oy+d.y*this.cell+this.cell/2,3,0,7); ctx.fill(); }
    ctx.fillStyle='#ff9f1c'; ctx.beginPath(); ctx.arc(ox+this.px*this.cell+this.cell/2,oy+this.py*this.cell+this.cell/2,8,0,7); ctx.fill();
    ctx.fillStyle='#4cc9f0';
    for(const g of this.ghosts){ ctx.fillRect(ox+g.x*this.cell+4,oy+g.y*this.cell+4,this.cell-8,this.cell-8); }
    this.drawHud(`ORBS ${this.dots.length}`);
  }
}
export const create: GameFactory=(c,h)=>new LumenChase(c,h);
