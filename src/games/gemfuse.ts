import type { GameFactory, GameHooks } from '../core/types';
import { GameBase } from '../core/GameBase';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import { fillVoidBg, glowCircle, roundRect, drawPremiumHud } from '../shared/fx';

const COLS = [
  { a:'#ff2040', b:'#ff8a9a', c:'#6a0010' },
  { a:'#00e8ff', b:'#a8f7ff', c:'#003344' },
  { a:'#f0c14b', b:'#fff0b0', c:'#5a4000' },
  { a:'#ff2bd6', b:'#ffb0f0', c:'#5a0048' },
  { a:'#7cff6b', b:'#d0ffc4', c:'#1a4a10' },
  { a:'#8a5cff', b:'#d4c0ff', c:'#2a1060' },
];

type Cell = { color: number; special: 0|1|2 }; // 0 none, 1 rocket, 2 bomb

class Gemfuse extends GameBase {
  private n=8; private cell=56; private ox=0; private oy=0;
  private board: Cell[][]=[]; private sel: {x:number;y:number}|null=null;
  private moves=25; private level=1; private started=false;
  private anim=0; private cascadeLock=false;

  constructor(c: HTMLCanvasElement, h: GameHooks){ super(c,h,'#00e8ff'); }

  protected onStart(): void {
    this.level=1; this.moves=25; this.started=false; this.sel=null; this.buildValid(); this.layoutBoard();
  }
  private layoutBoard(): void {
    this.cell=Math.floor(Math.min((this.w-80)/this.n,(this.h-100)/this.n));
    this.ox=(this.w-this.n*this.cell)/2; this.oy=60+(this.h-60-this.n*this.cell)/2;
  }
  private randCell(): Cell { return { color:(Math.random()*COLS.length)|0, special:0 }; }
  private buildValid(): void {
    do {
      this.board=Array.from({length:this.n},()=>Array.from({length:this.n},()=>this.randCell()));
    } while(this.findMatches().length || !this.hasMove());
  }
  private findMatches(): {x:number;y:number}[] {
    const hit=new Set<string>();
    const mark=(x:number,y:number)=>hit.add(x+','+y);
    for(let y=0;y<this.n;y++){
      let run=1;
      for(let x=1;x<=this.n;x++){
        if(x<this.n && this.board[y][x].color===this.board[y][x-1].color) run++;
        else { if(run>=3) for(let k=0;k<run;k++) mark(x-1-k,y); run=1; }
      }
    }
    for(let x=0;x<this.n;x++){
      let run=1;
      for(let y=1;y<=this.n;y++){
        if(y<this.n && this.board[y][x].color===this.board[y-1][x].color) run++;
        else { if(run>=3) for(let k=0;k<run;k++) mark(x,y-1-k); run=1; }
      }
    }
    return [...hit].map(s=>{ const [x,y]=s.split(',').map(Number); return {x,y}; });
  }
  private swap(a:{x:number;y:number}, b:{x:number;y:number}): void {
    const t=this.board[a.y][a.x]; this.board[a.y][a.x]=this.board[b.y][b.x]; this.board[b.y][b.x]=t;
  }
  private hasMove(): boolean {
    for(let y=0;y<this.n;y++) for(let x=0;x<this.n;x++){
      for(const [dx,dy] of [[1,0],[0,1]]){
        const nx=x+dx, ny=y+dy; if(nx>=this.n||ny>=this.n) continue;
        this.swap({x,y},{x:nx,y:ny});
        const ok=this.findMatches().length>0;
        this.swap({x,y},{x:nx,y:ny});
        if(ok) return true;
      }
    }
    return false;
  }
  private async resolve(): Promise<void> {
    this.cascadeLock=true; let chain=0;
    for(;;){
      const m=this.findMatches(); if(!m.length) break;
      chain++;
      // specials from large groups
      const groups=new Map<string, {x:number;y:number}[]>();
      // simple: if match length via counting neighbors — use match size heuristic
      for(const p of m){
        const cell=this.board[p.y][p.x];
        this.burst(this.ox+p.x*this.cell+this.cell/2, this.oy+p.y*this.cell+this.cell/2, COLS[cell.color].a, 10);
        if(cell.special===2){ // bomb clears neighbors
          for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
            const nx=p.x+dx, ny=p.y+dy; if(nx>=0&&ny>=0&&nx<this.n&&ny<this.n) this.board[ny][nx]={color:-1 as unknown as number, special:0};
          }
        } else if(cell.special===1){ // rocket row
          for(let x=0;x<this.n;x++) this.board[p.y][x]={color:-1 as unknown as number, special:0};
        }
        this.board[p.y][p.x]={color:-1 as unknown as number, special:0};
      }
      // create special if 4+ in a line roughly
      if(m.length>=4){
        const t=m[0]; this.board[t.y][t.x]={ color: (Math.random()*COLS.length)|0, special: m.length>=5?2:1 };
      }
      this.addScore(m.length*25*chain*this.level); audio.coin();
      // gravity
      for(let x=0;x<this.n;x++){
        let write=this.n-1;
        for(let y=this.n-1;y>=0;y--){
          if((this.board[y][x] as Cell).color !== -1 as unknown as number && this.board[y][x].color>=0){
            this.board[write][x]=this.board[y][x]; write--;
          }
        }
        while(write>=0){ this.board[write][x]=this.randCell(); write--; }
      }
      // cleanup sentinel
      for(let y=0;y<this.n;y++) for(let x=0;x<this.n;x++) if((this.board[y][x] as Cell).color < 0) this.board[y][x]=this.randCell();
      await new Promise(r=>setTimeout(r,140));
    }
    if(!this.hasMove()) this.buildValid();
    this.cascadeLock=false;
    if(this.moves<=0){ if(this.score>=this.level*800){ this.level++; this.moves=25+this.level*2; audio.win(); this.buildValid(); } else this.gameOver(false); }
  }

  protected update(_dt: number): void {
    this.layoutBoard();
    if(!this.started){ if(input.actionJust()||input.pointer.justDown){ this.started=true; audio.blip(); } return; }
    if(this.cascadeLock) return;
    if(input.pointer.justDown){
      const gx=((input.pointer.x-this.ox)/this.cell)|0; const gy=((input.pointer.y-this.oy)/this.cell)|0;
      if(gx<0||gy<0||gx>=this.n||gy>=this.n) return;
      if(!this.sel){ this.sel={x:gx,y:gy}; audio.blip(500); return; }
      const dx=Math.abs(gx-this.sel.x), dy=Math.abs(gy-this.sel.y);
      if(dx+dy===0){ this.sel=null; return; }
      if(dx+dy===1){
        this.swap(this.sel,{x:gx,y:gy});
        if(this.findMatches().length){ this.moves--; this.sel=null; void this.resolve(); }
        else { this.swap(this.sel,{x:gx,y:gy}); audio.hit(); this.sel=null; }
      } else this.sel={x:gx,y:gy};
    }
  }

  private drawGem(cx:number,cy:number,cell:Cell,glow=false): void {
    const col=COLS[cell.color]||COLS[0]; const r=this.cell*0.36; const ctx=this.ctx;
    ctx.save(); ctx.translate(cx,cy);
    if(glow) glowCircle(ctx,0,0,r*2.1,col.a+'99');
    ctx.beginPath(); for(let i=0;i<6;i++){ const a=(i/6)*Math.PI*2-Math.PI/2; ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); } ctx.closePath();
    const g=ctx.createLinearGradient(-r,-r,r,r); g.addColorStop(0,col.b); g.addColorStop(0.45,col.a); g.addColorStop(1,col.c);
    ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-r*0.25,-r*0.3,r*0.3,r*0.18,-0.5,0,Math.PI*2); ctx.fill();
    if(cell.special===1){ ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-r*0.5,0); ctx.lineTo(r*0.5,0); ctx.stroke(); }
    if(cell.special===2){ ctx.strokeStyle='#fff'; ctx.beginPath(); ctx.arc(0,0,r*0.35,0,Math.PI*2); ctx.stroke(); }
    ctx.restore();
  }

  protected render(): void {
    fillVoidBg(this.ctx,this.w,this.h); const ctx=this.ctx;
    roundRect(ctx,this.ox-14,this.oy-14,this.n*this.cell+28,this.n*this.cell+28,12);
    const fg=ctx.createLinearGradient(this.ox,this.oy,this.ox,this.oy+this.n*this.cell);
    fg.addColorStop(0,'rgba(40,10,24,0.95)'); fg.addColorStop(1,'rgba(12,6,18,0.95)');
    ctx.fillStyle=fg; ctx.fill(); ctx.strokeStyle='rgba(240,193,75,0.5)'; ctx.lineWidth=2; ctx.stroke();
    for(let y=0;y<this.n;y++) for(let x=0;x<this.n;x++){
      const cx=this.ox+x*this.cell+this.cell/2, cy=this.oy+y*this.cell+this.cell/2;
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(cx,cy,this.cell*0.4,0,Math.PI*2); ctx.fill();
      const glow=!!(this.sel&&this.sel.x===x&&this.sel.y===y);
      this.drawGem(cx,cy,this.board[y][x],glow);
      if(glow){ ctx.strokeStyle='#fff'; ctx.lineWidth=2; roundRect(ctx,this.ox+x*this.cell+4,this.oy+y*this.cell+4,this.cell-8,this.cell-8,8); ctx.stroke(); }
    }
    drawPremiumHud(ctx,this.w,{ title:'Gemfuse', stats:[
      {label:'SCORE',value:String(this.score),color:'#f0c14b'},
      {label:'MOVES',value:String(this.moves),color:'#00e8ff'},
      {label:'LVL',value:String(this.level),color:'#ff2bd6'},
    ]});
    if(!this.started){ ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,this.w,this.h);
      ctx.fillStyle='#fff'; ctx.font='800 26px Orbitron'; ctx.textAlign='center'; ctx.fillText('GEMFUSE',this.w/2,this.h/2-10);
      ctx.fillStyle='#9a8aa8'; ctx.font='600 14px Rajdhani'; ctx.fillText('Tap adjacent gems to swap · match 3+',this.w/2,this.h/2+18); }
  }
}
export const create: GameFactory=(c,h)=>new Gemfuse(c,h);
