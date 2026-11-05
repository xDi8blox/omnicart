import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

// pipe types: 0 empty 1─ 2│ 3└ 4┘ 5┐ 6┌ 7┼  source/drain fixed
class Conduit extends GameBase {
  private n=6; private grid:number[][]=[]; private cell=0; private ox=0; private oy=0;
  private sx=0; private sy=0; private dx=0; private dy=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#2ec4b6');}
  protected onStart(){
    this.cell=Math.floor(Math.min(this.w-40,this.h-70)/this.n);
    this.ox=(this.w-this.n*this.cell)/2; this.oy=50;
    this.sx=0; this.sy=0; this.dx=this.n-1; this.dy=this.n-1;
    this.grid=Array.from({length:this.n},()=>Array.from({length:this.n},()=>1+((Math.random()*6)|0)));
    this.grid[this.sy][this.sx]=1; this.grid[this.dy][this.dx]=1;
  }
  private exits(t:number):[number,number][]{
    // dirs N E S W as dy,dx pairs from center openings
    const map:Record<number,[number,number][]>={
      1:[[0,-1],[0,1]], 2:[[-1,0],[1,0]],
      3:[[-1,0],[0,1]], 4:[[-1,0],[0,-1]], 5:[[1,0],[0,-1]], 6:[[1,0],[0,1]],
      7:[[-1,0],[1,0],[0,-1],[0,1]],
    }; return map[t]||[];
  }
  private connected(){
    const seen=new Set<string>(); const q:[[number,number]]=[[this.sx,this.sy]]; seen.add('0,0');
    while(q.length){
      const [x,y]=q.shift()!;
      if(x===this.dx&&y===this.dy) return true;
      for(const [dy,dx] of this.exits(this.grid[y][x])){
        const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=this.n||ny>=this.n) continue;
        const key=`${nx},${ny}`; if(seen.has(key)) continue;
        // neighbor must have reciprocal opening
        const need: [number,number]=[-dy,-dx];
        if(this.exits(this.grid[ny][nx]).some(([a,b])=>a===need[0]&&b===need[1])){ seen.add(key); q.push([nx,ny]); }
      }
    } return false;
  }
  private rot(t:number){ return ({1:2,2:1,3:5,5:4,4:6,6:3,7:7} as Record<number,number>)[t]||t; }
  protected update(_dt:number){
    if(input.pointer.justDown){
      const x=Math.floor((input.pointer.x-this.ox)/this.cell), y=Math.floor((input.pointer.y-this.oy)/this.cell);
      if(x>=0&&y>=0&&x<this.n&&y<this.n && !(x===this.sx&&y===this.sy) && !(x===this.dx&&y===this.dy)){
        this.grid[y][x]=this.rot(this.grid[y][x]); audio.click(); this.addScore(1);
        if(this.connected()){ this.addScore(100); this.gameOver(true); }
      }
    }
  }
  protected render(){
    this.clear('#061816');
    const ctx=this.ctx;
    for(let y=0;y<this.n;y++) for(let x=0;x<this.n;x++){
      const cx=this.ox+x*this.cell+this.cell/2, cy=this.oy+y*this.cell+this.cell/2;
      ctx.fillStyle='#0a2420'; ctx.fillRect(this.ox+x*this.cell+2,this.oy+y*this.cell+2,this.cell-4,this.cell-4);
      ctx.strokeStyle=(x===this.sx&&y===this.sy)?'#ffe66b':(x===this.dx&&y===this.dy)?'#ff4d6d':'#2ec4b6';
      ctx.lineWidth=5; ctx.lineCap='round';
      for(const [dy,dx] of this.exits(this.grid[y][x])){ ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+dx*this.cell*0.4,cy+dy*this.cell*0.4); ctx.stroke(); }
    }
    this.drawHud(this.connected()?'FLOW!':'TAP ROTATE');
  }
}
export const create: GameFactory=(c,h)=>new Conduit(c,h);
