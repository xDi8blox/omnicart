import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

const SHAPES:number[][][]=[
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,0],[0,1,1]],
];
class ChronoDrop extends GameBase {
  private cols=10; private rows=20; private cell=0;
  private board:number[][]=[]; private piece:{m:number[][];x:number;y:number;id:number}|null=null;
  private hold:number|null=null; private held=false; private next:number[]=[];
  private grav=0; private speed=0.6;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#00f5d4');}
  protected onStart(){
    this.cell=Math.floor(Math.min((this.w-120)/this.cols,(this.h-50)/this.rows));
    this.board=Array.from({length:this.rows},()=>Array(this.cols).fill(0));
    this.next=[this.rand(),this.rand(),this.rand()]; this.hold=null; this.held=false; this.speed=0.6; this.spawn();
  }
  private rand(){ return (Math.random()*SHAPES.length)|0; }
  private spawn(){
    const id=this.next.shift()!; this.next.push(this.rand());
    this.piece={m:SHAPES[id].map(r=>[...r]),x:3,y:0,id}; this.held=false;
    if(this.collide(this.piece.m,this.piece.x,this.piece.y)) this.gameOver(false);
  }
  private collide(m:number[][],x:number,y:number){
    for(let r=0;r<m.length;r++) for(let c=0;c<m[r].length;c++){
      if(!m[r][c]) continue;
      const nx=x+c, ny=y+r;
      if(nx<0||nx>=this.cols||ny>=this.rows) return true;
      if(ny>=0 && this.board[ny][nx]) return true;
    }
    return false;
  }
  private rotate(m:number[][]){
    const R=m[0].length, C=m.length; const out=Array.from({length:R},()=>Array(C).fill(0));
    for(let r=0;r<C;r++) for(let c=0;c<R;c++) out[c][C-1-r]=m[r][c];
    return out;
  }
  private lock(){
    if(!this.piece) return;
    const {m,x,y,id}=this.piece;
    for(let r=0;r<m.length;r++) for(let c=0;c<m[r].length;c++) if(m[r][c]&&y+r>=0) this.board[y+r][x+c]=id+1;
    let cleared=0;
    for(let r=this.rows-1;r>=0;r--){
      if(this.board[r].every(v=>v)){ this.board.splice(r,1); this.board.unshift(Array(this.cols).fill(0)); cleared++; r++; }
    }
    if(cleared){ this.addScore([0,100,300,500,800][cleared]||800); audio.powerup(); this.speed=Math.max(0.12,this.speed*0.96); }
    else audio.blip(400);
    this.spawn();
  }
  protected update(dt:number){
    if(!this.piece) return;
    if(input.just('arrowleft')||input.just('a')){ if(!this.collide(this.piece.m,this.piece.x-1,this.piece.y)) this.piece.x--; }
    if(input.just('arrowright')||input.just('d')){ if(!this.collide(this.piece.m,this.piece.x+1,this.piece.y)) this.piece.x++; }
    if(input.just('arrowup')||input.just('w')){
      const rm=this.rotate(this.piece.m);
      if(!this.collide(rm,this.piece.x,this.piece.y)) this.piece.m=rm;
      else if(!this.collide(rm,this.piece.x-1,this.piece.y)){ this.piece.m=rm; this.piece.x--; }
      else if(!this.collide(rm,this.piece.x+1,this.piece.y)){ this.piece.m=rm; this.piece.x++; }
      audio.blip(600);
    }
    if(input.just('c')||input.just('shift')){
      if(!this.held){
        this.held=true; const cur=this.piece.id;
        if(this.hold==null){ this.hold=cur; this.spawn(); }
        else { const h=this.hold; this.hold=cur; this.piece={m:SHAPES[h].map(r=>[...r]),x:3,y:0,id:h}; }
        audio.blip(500);
      }
    }
    const soft=input.pressed('arrowdown')||input.pressed('s');
    if(input.just(' ')){
      while(!this.collide(this.piece.m,this.piece.x,this.piece.y+1)) this.piece.y++;
      this.lock(); return;
    }
    this.grav+=dt*(soft?4:1);
    if(this.grav>=this.speed){
      this.grav=0;
      if(!this.collide(this.piece.m,this.piece.x,this.piece.y+1)) this.piece.y++; else this.lock();
    }
  }
  protected render(){
    this.clear('#041410');
    const ox=(this.w-this.cols*this.cell)/2-40, oy=40;
    const ctx=this.ctx; const colors=['','#00f5d4','#ffe66b','#ff6bcb','#6bcbff','#80ffdb','#ff9f1c','#b967ff'];
    ctx.fillStyle='#0a1a18'; ctx.fillRect(ox,oy,this.cols*this.cell,this.rows*this.cell);
    for(let r=0;r<this.rows;r++) for(let c=0;c<this.cols;c++) if(this.board[r][c]){ ctx.fillStyle=colors[this.board[r][c]]; ctx.fillRect(ox+c*this.cell+1,oy+r*this.cell+1,this.cell-2,this.cell-2); }
    if(this.piece){
      ctx.fillStyle=colors[this.piece.id+1];
      for(let r=0;r<this.piece.m.length;r++) for(let c=0;c<this.piece.m[r].length;c++) if(this.piece.m[r][c])
        ctx.fillRect(ox+(this.piece.x+c)*this.cell+1,oy+(this.piece.y+r)*this.cell+1,this.cell-2,this.cell-2);
    }
    ctx.fillStyle='#aaa'; ctx.font='12px monospace'; ctx.fillText('NEXT', ox+this.cols*this.cell+16, oy+16);
    this.next.forEach((id,i)=>{
      const m=SHAPES[id]; ctx.fillStyle=colors[id+1];
      for(let r=0;r<m.length;r++) for(let c=0;c<m[r].length;c++) if(m[r][c]) ctx.fillRect(ox+this.cols*this.cell+20+c*12, oy+30+i*50+r*12,11,11);
    });
    ctx.fillText('HOLD', ox+this.cols*this.cell+16, oy+200);
    if(this.hold!=null){ const m=SHAPES[this.hold]; ctx.fillStyle=colors[this.hold+1];
      for(let r=0;r<m.length;r++) for(let c=0;c<m[r].length;c++) if(m[r][c]) ctx.fillRect(ox+this.cols*this.cell+20+c*12, oy+220+r*12,11,11); }
    this.drawHud();
  }
}
export const create: GameFactory=(c,h)=>new ChronoDrop(c,h);
