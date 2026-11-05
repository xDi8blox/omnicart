import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class Shift15 extends GameBase {
  private n=4; private tiles:number[]=[]; private cell=0; private ox=0; private oy=0; private moves=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#f4a261');}
  protected onStart(){
    this.cell=Math.floor(Math.min(this.w-40,this.h-70)/this.n);
    this.ox=(this.w-this.n*this.cell)/2; this.oy=50; this.moves=0;
    this.tiles=[...Array(this.n*this.n).keys()];
    // shuffle solvable
    for(let i=0;i<200;i++){ const z=this.tiles.indexOf(0); const opts=[];
      const x=z%this.n,y=(z/this.n)|0;
      if(x>0)opts.push(z-1); if(x<this.n-1)opts.push(z+1); if(y>0)opts.push(z-this.n); if(y<this.n-1)opts.push(z+this.n);
      const j=opts[(Math.random()*opts.length)|0]; [this.tiles[z],this.tiles[j]]=[this.tiles[j],this.tiles[z]]; }
  }
  private tryMove(idx:number){
    const z=this.tiles.indexOf(0); const zx=z%this.n,zy=(z/this.n)|0, ix=idx%this.n,iy=(idx/this.n)|0;
    if(Math.abs(zx-ix)+Math.abs(zy-iy)===1){ [this.tiles[z],this.tiles[idx]]=[this.tiles[idx],this.tiles[z]]; this.moves++; this.addScore(1); audio.blip();
      if(this.tiles.every((v,i)=>i===this.tiles.length-1?v===0:v===i+1)) this.gameOver(true);
    }
  }
  protected update(_dt:number){
    if(input.pointer.justDown){
      const x=Math.floor((input.pointer.x-this.ox)/this.cell), y=Math.floor((input.pointer.y-this.oy)/this.cell);
      if(x>=0&&y>=0&&x<this.n&&y<this.n) this.tryMove(y*this.n+x);
    }
    const z=this.tiles.indexOf(0);
    if(input.just('arrowleft')||input.just('a')) if(z%this.n<this.n-1) this.tryMove(z+1);
    if(input.just('arrowright')||input.just('d')) if(z%this.n>0) this.tryMove(z-1);
    if(input.just('arrowup')||input.just('w')) if(((z/this.n)|0)<this.n-1) this.tryMove(z+this.n);
    if(input.just('arrowdown')||input.just('s')) if(((z/this.n)|0)>0) this.tryMove(z-this.n);
  }
  protected render(){
    this.clear('#1a1008');
    const ctx=this.ctx;
    for(let i=0;i<this.tiles.length;i++){
      const v=this.tiles[i]; if(!v) continue;
      const x=i%this.n, y=(i/this.n)|0;
      ctx.fillStyle='#f4a261'; ctx.fillRect(this.ox+x*this.cell+3,this.oy+y*this.cell+3,this.cell-6,this.cell-6);
      ctx.fillStyle='#111'; ctx.font=`bold ${this.cell*0.4}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(String(v), this.ox+x*this.cell+this.cell/2, this.oy+y*this.cell+this.cell/2);
    }
    this.drawHud(`MOVES ${this.moves}`);
  }
}
export const create: GameFactory=(c,h)=>new Shift15(c,h);
