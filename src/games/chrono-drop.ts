import type { GameFactory, GameHooks } from '../core/types';
import { GameBase } from '../core/GameBase';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import { fillVoidBg, glowCircle, roundRect, drawPremiumHud } from '../shared/fx';

const SHAPES: number[][][] = [
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[0,1,0],[1,1,1]],
  [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,1,0],[0,1,1]],
];
const COLORS = ['#00e8ff','#ff2040','#f0c14b','#ff2bd6','#7cff6b','#8a5cff','#ff8a1a'];
// SRS-ish wall kicks for JLSTZ
const KICKS: [number, number][][] = [
  [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
];

type Piece = { shape: number[][]; color: string; x: number; y: number; rot: number; idx: number };

class ChronoDrop extends GameBase {
  private cols=10; private rows=18; private cell=28;
  private ox=0; private oy=0;
  private grid: (string|null)[][] = [];
  private piece!: Piece; private hold: Piece|null=null; private holdUsed=false;
  private next: number[]=[]; private bag: number[]=[];
  private fall=0; private das=0; private flashRows: number[]=[]; private flashT=0;
  private level=1; private lines=0; private started=false; private lockT=0;

  constructor(c: HTMLCanvasElement, h: GameHooks){ super(c,h,'#8a5cff'); }

  protected onStart(): void {
    this.level=1; this.lines=0; this.hold=null; this.holdUsed=false; this.started=false;
    this.grid=Array.from({length:this.rows},()=>Array(this.cols).fill(null));
    this.bag=[]; this.next=[];
    while(this.next.length<5) this.next.push(this.pull());
    this.spawn(); this.layoutBoard();
  }
  private layoutBoard(): void {
    this.cell=Math.floor(Math.min((this.w-280)/this.cols,(this.h-80)/this.rows));
    this.ox=(this.w-this.cols*this.cell)/2-20;
    this.oy=56+(this.h-56-this.rows*this.cell)/2;
  }
  private pull(): number {
    if(!this.bag.length){ this.bag=[0,1,2,3,4,5,6]; for(let i=this.bag.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]]; } }
    return this.bag.pop()!;
  }
  private spawn(): void {
    const idx=this.next.shift()!; this.next.push(this.pull());
    this.piece={ shape: SHAPES[idx].map(r=>[...r]), color: COLORS[idx], x:3, y:0, rot:0, idx };
    this.holdUsed=false; this.lockT=0;
    if(this.collides(this.piece.x,this.piece.y,this.piece.shape)) this.gameOver(false);
  }
  private collides(px:number,py:number,shape:number[][]): boolean {
    for(let y=0;y<shape.length;y++) for(let x=0;x<shape[y].length;x++){
      if(!shape[y][x]) continue;
      const gx=px+x, gy=py+y;
      if(gx<0||gx>=this.cols||gy>=this.rows) return true;
      if(gy>=0 && this.grid[gy][gx]) return true;
    }
    return false;
  }
  private rotate(dir: number): void {
    const src=this.piece.shape;
    const N=Math.max(src.length, src[0].length);
    const padded=Array.from({length:N},(_,y)=>Array.from({length:N},(_,x)=>src[y]?.[x]??0));
    const rot=dir>0
      ? padded[0].map((_,i)=>padded.map(r=>r[i]).reverse())
      : padded[0].map((_,i)=>padded.map(r=>r[N-1-i]));
    const from=this.piece.rot; const to=(from+dir+4)%4;
    const kicks=KICKS[from] || KICKS[0];
    for(const [kx,ky] of kicks){
      if(!this.collides(this.piece.x+kx*dir, this.piece.y+ky, rot)){
        this.piece.shape=rot; this.piece.x+=kx*dir; this.piece.y+=ky; this.piece.rot=to; audio.blip(600); return;
      }
    }
  }
  private hardDrop(): void {
    while(!this.collides(this.piece.x,this.piece.y+1,this.piece.shape)){ this.piece.y++; this.addScore(2); }
    this.lock();
  }
  private lock(): void {
    for(let y=0;y<this.piece.shape.length;y++) for(let x=0;x<this.piece.shape[y].length;x++){
      if(!this.piece.shape[y][x]) continue;
      const gy=this.piece.y+y, gx=this.piece.x+x;
      if(gy>=0&&gy<this.rows) this.grid[gy][gx]=this.piece.color;
    }
    audio.hit();
    const cleared:number[]=[];
    for(let y=0;y<this.rows;y++) if(this.grid[y].every(c=>c)) cleared.push(y);
    if(cleared.length){
      this.flashRows=cleared; this.flashT=0.35;
      const scores=[0,100,300,500,800];
      this.addScore(scores[cleared.length]*this.level);
      this.lines+=cleared.length;
      this.level=1+Math.floor(this.lines/10);
      audio.powerup();
      for(const y of cleared){ this.grid.splice(y,1); this.grid.unshift(Array(this.cols).fill(null)); }
    }
    this.spawn();
  }
  private doHold(): void {
    if(this.holdUsed) return;
    this.holdUsed=true; audio.blip(400);
    const cur={...this.piece, shape:SHAPES[this.piece.idx].map(r=>[...r]), rot:0, x:3, y:0};
    if(!this.hold){ this.hold=cur; this.spawn(); }
    else { const tmp=this.hold; this.hold=cur; this.piece={...tmp, x:3,y:0,rot:0, shape:SHAPES[tmp.idx].map(r=>[...r])}; }
  }

  protected update(dt: number): void {
    this.layoutBoard();
    if(!this.started){ if(input.actionJust()||input.pointer.justDown){ this.started=true; audio.blip(); } return; }
    if(this.flashT>0){ this.flashT-=dt; }
    if(input.leftJust()) { if(!this.collides(this.piece.x-1,this.piece.y,this.piece.shape)) this.piece.x--; }
    if(input.rightJust()) { if(!this.collides(this.piece.x+1,this.piece.y,this.piece.shape)) this.piece.x++; }
    if(input.upJust()||input.just('x')) this.rotate(1);
    if(input.just('z')) this.rotate(-1);
    if(input.just('c')||input.just('shift')) this.doHold();
    if(input.just(' ')) this.hardDrop();
    // DAS continuous
    if(input.left()){ this.das+=dt; if(this.das>0.15){ this.das=0.05; if(!this.collides(this.piece.x-1,this.piece.y,this.piece.shape)) this.piece.x--; } }
    else if(input.right()){ this.das+=dt; if(this.das>0.15){ this.das=0.05; if(!this.collides(this.piece.x+1,this.piece.y,this.piece.shape)) this.piece.x++; } }
    else this.das=0;

    const grav=Math.max(0.08, 0.7 - (this.level-1)*0.05);
    this.fall+=dt*(input.down()?4:1);
    while(this.fall>=grav){
      this.fall-=grav;
      if(!this.collides(this.piece.x,this.piece.y+1,this.piece.shape)){ this.piece.y++; this.lockT=0; }
      else { this.lockT+=grav; if(this.lockT>0.5) this.lock(); }
    }
  }

  private drawBlock(x:number,y:number,color:string,ghost=false): void {
    const px=this.ox+x*this.cell, py=this.oy+y*this.cell; const ctx=this.ctx;
    if(ghost){ ctx.strokeStyle=color; ctx.lineWidth=2; roundRect(ctx,px+2,py+2,this.cell-4,this.cell-4,4); ctx.stroke(); return; }
    const g=ctx.createLinearGradient(px,py,px+this.cell,py+this.cell);
    g.addColorStop(0,'#fff'); g.addColorStop(0.22,color); g.addColorStop(0.7,color); g.addColorStop(1,'#100818');
    ctx.fillStyle=g; roundRect(ctx,px+1,py+1,this.cell-2,this.cell-2,4); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.35)'; roundRect(ctx,px+4,py+3,this.cell-10,5,2); ctx.fill();
  }
  private drawMini(shape:number[][], color:string, cx:number, cy:number): void {
    const s=16; const pw=shape[0].length*s, ph=shape.length*s;
    const sx=cx-pw/2, sy=cy-ph/2;
    for(let y=0;y<shape.length;y++) for(let x=0;x<shape[y].length;x++) if(shape[y][x]){
      const g=this.ctx.createLinearGradient(sx+x*s,sy+y*s,sx+x*s+s,sy+y*s+s);
      g.addColorStop(0,'#fff'); g.addColorStop(0.3,color); g.addColorStop(1,'#1a0810');
      this.ctx.fillStyle=g; roundRect(this.ctx,sx+x*s+1,sy+y*s+1,s-2,s-2,3); this.ctx.fill();
    }
  }

  protected render(): void {
    fillVoidBg(this.ctx,this.w,this.h); const ctx=this.ctx;
    ctx.fillStyle='rgba(8,4,12,0.75)'; ctx.strokeStyle='rgba(255,32,64,0.45)';
    roundRect(ctx,this.ox-140,this.oy,110,130,8); ctx.fill(); ctx.stroke();
    roundRect(ctx,this.ox+this.cols*this.cell+24,this.oy,130,240,8); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#9a8aa8'; ctx.font='600 11px Orbitron'; ctx.textAlign='center';
    ctx.fillText('HOLD', this.ox-85, this.oy+22); ctx.fillText('NEXT', this.ox+this.cols*this.cell+89, this.oy+22);
    if(this.hold) this.drawMini(SHAPES[this.hold.idx], COLORS[this.hold.idx], this.ox-85, this.oy+75);
    this.next.slice(0,3).forEach((idx,i)=>this.drawMini(SHAPES[idx], COLORS[idx], this.ox+this.cols*this.cell+89, this.oy+70+i*70));

    ctx.fillStyle='rgba(12,6,18,0.95)'; ctx.fillRect(this.ox-3,this.oy-3,this.cols*this.cell+6,this.rows*this.cell+6);
    ctx.strokeStyle='rgba(0,232,255,0.4)'; ctx.lineWidth=2; ctx.strokeRect(this.ox-3,this.oy-3,this.cols*this.cell+6,this.rows*this.cell+6);
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++) if(this.grid[y][x]) this.drawBlock(x,y,this.grid[y][x]!);

    let gy=this.piece.y; while(!this.collides(this.piece.x,gy+1,this.piece.shape)) gy++;
    for(let y=0;y<this.piece.shape.length;y++) for(let x=0;x<this.piece.shape[y].length;x++) if(this.piece.shape[y][x]) this.drawBlock(this.piece.x+x,gy+y,this.piece.color,true);
    for(let y=0;y<this.piece.shape.length;y++) for(let x=0;x<this.piece.shape[y].length;x++) if(this.piece.shape[y][x]) this.drawBlock(this.piece.x+x,this.piece.y+y,this.piece.color);

    if(this.flashT>0){ ctx.fillStyle=`rgba(255,255,255,${this.flashT})`; ctx.fillRect(this.ox,this.oy,this.cols*this.cell,this.rows*this.cell);
      glowCircle(ctx,this.ox+this.cols*this.cell/2,this.oy+this.rows*this.cell/2,140,`rgba(0,232,255,${this.flashT})`); }

    drawPremiumHud(ctx,this.w,{ title:'Chrono Drop', stats:[
      {label:'SCORE',value:String(this.score),color:'#f0c14b'},
      {label:'LINES',value:String(this.lines),color:'#00e8ff'},
      {label:'LVL',value:String(this.level),color:'#ff2bd6'},
    ]});
    if(!this.started){ ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,this.w,this.h);
      ctx.fillStyle='#fff'; ctx.font='800 26px Orbitron'; ctx.textAlign='center'; ctx.fillText('CHRONO DROP',this.w/2,this.h/2-10);
      ctx.fillStyle='#9a8aa8'; ctx.font='600 14px Rajdhani'; ctx.fillText('↑ rotate · C hold · Space hard drop',this.w/2,this.h/2+18); }
  }
}
export const create: GameFactory=(c,h)=>new ChronoDrop(c,h);
