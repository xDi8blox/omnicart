import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

const COLORS=['#f72585','#4cc9f0','#ffe66b','#80ffdb','#b967ff','#ff9f1c'];
class Gemfuse extends GameBase {
  private n=8; private grid:number[][]=[]; private sel:{x:number;y:number}|null=null;
  private cell=0; private ox=0; private oy=0; private moves=30;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#f72585');}
  protected onStart(){
    this.cell=Math.floor(Math.min(this.w,this.h-50)/this.n);
    this.ox=(this.w-this.n*this.cell)/2; this.oy=44+(this.h-44-this.n*this.cell)/2;
    this.moves=30; this.sel=null;
    do { this.grid=Array.from({length:this.n},()=>Array.from({length:this.n},()=>(Math.random()*COLORS.length)|0)); }
    while(this.findMatches().length);
  }
  private findMatches(){
    const m: {x:number;y:number}[]=[];
    for(let y=0;y<this.n;y++) for(let x=0;x<this.n-2;x++) if(this.grid[y][x]===this.grid[y][x+1]&&this.grid[y][x]===this.grid[y][x+2]){ m.push({x,y},{x:x+1,y},{x:x+2,y}); }
    for(let x=0;x<this.n;x++) for(let y=0;y<this.n-2;y++) if(this.grid[y][x]===this.grid[y+1][x]&&this.grid[y][x]===this.grid[y+2][x]){ m.push({x,y},{x,y:y+1},{x,y:y+2}); }
    const key=new Set(m.map(p=>`${p.x},${p.y}`));
    return [...key].map(s=>{const [x,y]=s.split(',').map(Number);return {x,y};});
  }
  private resolve(){
    let total=0;
    for(;;){
      const m=this.findMatches(); if(!m.length) break;
      total+=m.length*10;
      for(const p of m) this.grid[p.y][p.x]=-1;
      for(let x=0;x<this.n;x++){
        let w=this.n-1;
        for(let y=this.n-1;y>=0;y--) if(this.grid[y][x]>=0){ this.grid[w][x]=this.grid[y][x]; w--; }
        for(let y=w;y>=0;y--) this.grid[y][x]=(Math.random()*COLORS.length)|0;
      }
    }
    if(total){ this.addScore(total); audio.coin(); }
  }
  protected update(_dt:number){
    if(input.pointer.justDown){
      const x=Math.floor((input.pointer.x-this.ox)/this.cell);
      const y=Math.floor((input.pointer.y-this.oy)/this.cell);
      if(x<0||y<0||x>=this.n||y>=this.n) return;
      if(!this.sel){ this.sel={x,y}; audio.click(); }
      else {
        const dx=Math.abs(this.sel.x-x), dy=Math.abs(this.sel.y-y);
        if(dx+dy===1){
          const a=this.sel; const t=this.grid[a.y][a.x]; this.grid[a.y][a.x]=this.grid[y][x]; this.grid[y][x]=t;
          if(!this.findMatches().length){ this.grid[y][x]=this.grid[a.y][a.x]; this.grid[a.y][a.x]=t; audio.hit(); }
          else { this.moves--; this.resolve(); if(this.moves<=0) this.gameOver(this.score>=200); }
        }
        this.sel=null;
      }
    }
  }
  protected render(){
    this.clear('#140810');
    const ctx=this.ctx;
    for(let y=0;y<this.n;y++) for(let x=0;x<this.n;x++){
      ctx.fillStyle=COLORS[this.grid[y][x]];
      ctx.beginPath(); ctx.roundRect?.(this.ox+x*this.cell+3,this.oy+y*this.cell+3,this.cell-6,this.cell-6,6);
      if(!ctx.roundRect) ctx.fillRect(this.ox+x*this.cell+3,this.oy+y*this.cell+3,this.cell-6,this.cell-6); else ctx.fill();
    }
    if(this.sel){ ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.strokeRect(this.ox+this.sel.x*this.cell+2,this.oy+this.sel.y*this.cell+2,this.cell-4,this.cell-4); }
    this.drawHud(`MOVES ${this.moves}`);
  }
}
export const create: GameFactory=(c,h)=>new Gemfuse(c,h);
