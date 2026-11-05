import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class Helix2048 extends GameBase {
  private n=4; private grid:number[][]=[]; private cell=0; private ox=0; private oy=0;
  private sx=0; private sy=0; private won=false;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#ffd166');}
  protected onStart(){
    this.cell=Math.floor(Math.min(this.w-40,this.h-80)/this.n);
    this.ox=(this.w-this.n*this.cell)/2; this.oy=50;
    this.grid=Array.from({length:this.n},()=>Array(this.n).fill(0));
    this.won=false; this.addTile(); this.addTile();
  }
  private addTile(){
    const empty:{x:number;y:number}[]=[];
    for(let y=0;y<this.n;y++) for(let x=0;x<this.n;x++) if(!this.grid[y][x]) empty.push({x,y});
    if(!empty.length) return false;
    const p=empty[(Math.random()*empty.length)|0]; this.grid[p.y][p.x]=Math.random()<0.9?2:4; return true;
  }
  private slide(dir:number){ // 0L 1R 2U 3D
    const g=this.grid.map(r=>[...r]); let moved=false; let gained=0;
    const line=(vals:number[])=>{
      const a=vals.filter(v=>v); const out:number[]=[];
      for(let i=0;i<a.length;i++){
        if(i+1<a.length && a[i]===a[i+1]){ out.push(a[i]*2); gained+=a[i]*2; i++; }
        else out.push(a[i]);
      }
      while(out.length<this.n) out.push(0); return out;
    };
    if(dir===0) for(let y=0;y<this.n;y++){ const n=line(g[y]); if(n.some((v,i)=>v!==g[y][i])) moved=true; g[y]=n; }
    if(dir===1) for(let y=0;y<this.n;y++){ const n=line([...g[y]].reverse()).reverse(); if(n.some((v,i)=>v!==g[y][i])) moved=true; g[y]=n; }
    if(dir===2) for(let x=0;x<this.n;x++){ const col=line(g.map(r=>r[x])); for(let y=0;y<this.n;y++){ if(g[y][x]!==col[y]) moved=true; g[y][x]=col[y]; } }
    if(dir===3) for(let x=0;x<this.n;x++){ const col=line(g.map(r=>r[x]).reverse()).reverse(); for(let y=0;y<this.n;y++){ if(g[y][x]!==col[y]) moved=true; g[y][x]=col[y]; } }
    this.grid=g; if(gained) this.addScore(gained);
    return moved;
  }
  private afterMove(){
    this.addTile(); audio.blip();
    if(this.grid.some(r=>r.some(v=>v>=2048)) && !this.won){ this.won=true; this.gameOver(true); return; }
    const moves=[0,1,2,3].some(d=>{ const bak=this.grid.map(r=>[...r]); const m=this.slide(d); this.grid=bak; return m; });
    if(!moves && !this.grid.some(r=>r.includes(0))) this.gameOver(false);
  }
  protected update(_dt:number){
    let dir=-1;
    if(input.just('arrowleft')||input.just('a')) dir=0;
    if(input.just('arrowright')||input.just('d')) dir=1;
    if(input.just('arrowup')||input.just('w')) dir=2;
    if(input.just('arrowdown')||input.just('s')) dir=3;
    if(input.pointer.justDown){this.sx=input.pointer.x;this.sy=input.pointer.y;}
    if(input.pointer.justUp){
      const dx=input.pointer.x-this.sx, dy=input.pointer.y-this.sy;
      if(Math.abs(dx)+Math.abs(dy)>30){ dir=Math.abs(dx)>Math.abs(dy)?(dx<0?0:1):(dy<0?2:3); }
    }
    if(dir>=0 && this.slide(dir)) this.afterMove();
  }
  protected render(){
    this.clear('#1a1408');
    const ctx=this.ctx;
    for(let y=0;y<this.n;y++) for(let x=0;x<this.n;x++){
      const v=this.grid[y][x];
      ctx.fillStyle=v?`hsl(${40+Math.log2(v)*12},80%,45%)`:'#2a2418';
      ctx.fillRect(this.ox+x*this.cell+4,this.oy+y*this.cell+4,this.cell-8,this.cell-8);
      if(v){ ctx.fillStyle='#111'; ctx.font=`bold ${this.cell*0.35}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(String(v), this.ox+x*this.cell+this.cell/2, this.oy+y*this.cell+this.cell/2); }
    }
    this.drawHud();
  }
}
export const create: GameFactory=(c,h)=>new Helix2048(c,h);
