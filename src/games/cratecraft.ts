import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

const LEVELS = [
  ['######','#@   #','# $  #','#  . #','#  $.#','######'],
  ['  ####','###  #','#@$  #','### $ #','#.##  #','#   ###','#####'],
  ['######','#....#','# $$ #','# $@$#','# $$ #','#    #','######'],
];
class Cratecraft extends GameBase {
  private map:string[][]=[]; private px=0; private py=0; private level=0; private cell=0; private ox=0; private oy=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#43aa8b');}
  protected onStart(){ this.level=0; this.load(); }
  private load(){
    const raw=LEVELS[this.level%LEVELS.length];
    this.map=raw.map(r=>[...r]);
    for(let y=0;y<this.map.length;y++) for(let x=0;x<this.map[y].length;x++) if(this.map[y][x]==='@'||this.map[y][x]==='+'){ this.px=x; this.py=y; this.map[y][x]=this.map[y][x]==='+'?'.':' '; }
    const rows=this.map.length, cols=Math.max(...this.map.map(r=>r.length));
    this.cell=Math.floor(Math.min((this.w-20)/cols,(this.h-50)/rows));
    this.ox=(this.w-cols*this.cell)/2; this.oy=44;
  }
  private at(x:number,y:number){ return this.map[y]?.[x] ?? '#'; }
  private set(x:number,y:number,ch:string){ this.map[y][x]=ch; }
  private tryMove(dx:number,dy:number){
    const nx=this.px+dx, ny=this.py+dy; const t=this.at(nx,ny);
    if(t==='#') return;
    if(t==='$'||t==='*'){
      const bx=nx+dx, by=ny+dy; const beyond=this.at(bx,by);
      if(beyond==='#'||beyond==='$'||beyond==='*') return;
      this.set(bx,by, beyond==='.'?'*':'$');
      this.set(nx,ny, t==='*'?'.':' ');
      audio.blip(300);
    }
    this.px=nx; this.py=ny; this.addScore(1); audio.click();
    // win?
    if(!this.map.some(r=>r.includes('$'))){ this.addScore(100); audio.win();
      if(this.level>=LEVELS.length-1) this.gameOver(true);
      else { this.level++; this.load(); }
    }
  }
  protected update(_dt:number){
    if(input.just('arrowleft')||input.just('a')) this.tryMove(-1,0);
    if(input.just('arrowright')||input.just('d')) this.tryMove(1,0);
    if(input.just('arrowup')||input.just('w')) this.tryMove(0,-1);
    if(input.just('arrowdown')||input.just('s')) this.tryMove(0,1);
  }
  protected render(){
    this.clear('#081410');
    const ctx=this.ctx;
    for(let y=0;y<this.map.length;y++) for(let x=0;x<this.map[y].length;x++){
      const ch=this.map[y][x];
      const px=this.ox+x*this.cell, py=this.oy+y*this.cell;
      if(ch==='#'){ ctx.fillStyle='#1a3030'; ctx.fillRect(px,py,this.cell,this.cell); }
      else { ctx.fillStyle='#0c2018'; ctx.fillRect(px,py,this.cell,this.cell); }
      if(ch==='.'||ch==='*'){ ctx.strokeStyle='#ffe66b'; ctx.strokeRect(px+this.cell*0.3,py+this.cell*0.3,this.cell*0.4,this.cell*0.4); }
      if(ch==='$'||ch==='*'){ ctx.fillStyle='#43aa8b'; ctx.fillRect(px+4,py+4,this.cell-8,this.cell-8); }
    }
    ctx.fillStyle='#ff9f1c'; ctx.beginPath(); ctx.arc(this.ox+this.px*this.cell+this.cell/2,this.oy+this.py*this.cell+this.cell/2,this.cell*0.3,0,7); ctx.fill();
    this.drawHud(`LVL ${this.level+1}`);
  }
}
export const create: GameFactory=(c,h)=>new Cratecraft(c,h);
