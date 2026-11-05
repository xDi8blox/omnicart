import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class GlyphGrid extends GameBase {
  private grid:number[][]=[]; private given:boolean[][]=[]; private sel={x:0,y:0}; private cell=0; private ox=0; private oy=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#4ea8de');}
  private shuffle<T>(a:T[]){ for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; }
  private ok(g:number[][],r:number,c:number,v:number){
    for(let i=0;i<9;i++) if(g[r][i]===v||g[i][c]===v) return false;
    const br=(r/3|0)*3, bc=(c/3|0)*3;
    for(let y=0;y<3;y++) for(let x=0;x<3;x++) if(g[br+y][bc+x]===v) return false;
    return true;
  }
  private fill(g:number[][]):boolean{
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(!g[r][c]){
      for(const v of this.shuffle([1,2,3,4,5,6,7,8,9])) if(this.ok(g,r,c,v)){ g[r][c]=v; if(this.fill(g)) return true; g[r][c]=0; }
      return false;
    } return true;
  }
  protected onStart(){
    this.cell=Math.floor(Math.min(this.w-20,this.h-60)/9);
    this.ox=(this.w-9*this.cell)/2; this.oy=48;
    const full=Array.from({length:9},()=>Array(9).fill(0)); this.fill(full);
    this.grid=full.map(r=>[...r]); this.given=Array.from({length:9},()=>Array(9).fill(true));
    let remove=40;
    while(remove--){ const r=(Math.random()*9)|0,c=(Math.random()*9)|0; if(this.grid[r][c]){ this.grid[r][c]=0; this.given[r][c]=false; } }
    this.sel={x:0,y:0};
  }
  protected update(_dt:number){
    const a=input.axis();
    if(input.just('arrowleft')||input.just('a')) this.sel.x=(this.sel.x+8)%9;
    if(input.just('arrowright')||input.just('d')) this.sel.x=(this.sel.x+1)%9;
    if(input.just('arrowup')||input.just('w')) this.sel.y=(this.sel.y+8)%9;
    if(input.just('arrowdown')||input.just('s')) this.sel.y=(this.sel.y+1)%9;
    if(input.pointer.justDown){
      const x=Math.floor((input.pointer.x-this.ox)/this.cell), y=Math.floor((input.pointer.y-this.oy)/this.cell);
      if(x>=0&&y>=0&&x<9&&y<9) this.sel={x,y};
    }
    for(let n=1;n<=9;n++) if(input.just(String(n))){
      if(!this.given[this.sel.y][this.sel.x]){ this.grid[this.sel.y][this.sel.x]=n; audio.blip(); this.addScore(1);
        if(this.grid.every((row,r)=>row.every((v,c)=>v&& (this.given[r][c]||true))) && this.grid.every((row,r)=>row.every((v,c)=>{
          // quick validate unique
          return true;
        }))) {
          // check complete unique
          let good=true;
          for(let r=0;r<9;r++){ const s=new Set(this.grid[r]); if(s.has(0)||s.size<9) good=false; }
          for(let c=0;c<9;c++){ const s=new Set(this.grid.map(r=>r[c])); if(s.has(0)||s.size<9) good=false; }
          if(good && this.grid.every(r=>!r.includes(0))) this.gameOver(true);
        }
      }
    }
    if(input.just('backspace')||input.just('0')||input.just('delete')) if(!this.given[this.sel.y][this.sel.x]) this.grid[this.sel.y][this.sel.x]=0;
  }
  protected render(){
    this.clear('#081018');
    const ctx=this.ctx;
    for(let r=0;r<9;r++) for(let c=0;c<9;c++){
      ctx.fillStyle=(Math.floor(r/3)+Math.floor(c/3))%2?'#102030':'#0c1824';
      ctx.fillRect(this.ox+c*this.cell,this.oy+r*this.cell,this.cell,this.cell);
      if(this.grid[r][c]){ ctx.fillStyle=this.given[r][c]?'#4ea8de':'#ffe66b'; ctx.font=`bold ${this.cell*0.5}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(String(this.grid[r][c]), this.ox+c*this.cell+this.cell/2, this.oy+r*this.cell+this.cell/2); }
    }
    ctx.strokeStyle='#4ea8de'; ctx.lineWidth=2; ctx.strokeRect(this.ox+this.sel.x*this.cell,this.oy+this.sel.y*this.cell,this.cell,this.cell);
    ctx.lineWidth=3; for(let i=0;i<=3;i++){ ctx.strokeRect(this.ox,this.oy,9*this.cell,9*this.cell); ctx.beginPath(); ctx.moveTo(this.ox+i*3*this.cell,this.oy); ctx.lineTo(this.ox+i*3*this.cell,this.oy+9*this.cell); ctx.stroke(); ctx.beginPath(); ctx.moveTo(this.ox,this.oy+i*3*this.cell); ctx.lineTo(this.ox+9*this.cell,this.oy+i*3*this.cell); ctx.stroke(); }
    // number pad hint
    ctx.fillStyle='#888'; ctx.font='12px monospace'; ctx.textAlign='left'; ctx.fillText('Keys 1-9 · arrows/tap select', 12, this.h-10);
    this.drawHud();
  }
}
export const create: GameFactory=(c,h)=>new GlyphGrid(c,h);
