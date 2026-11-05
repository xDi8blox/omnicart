import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class GlyphGrid extends GameBase {
  private grid:number[][]=[]; private given:boolean[][]=[]; private notes:boolean[][][]=[];
  private sel={x:0,y:0}; private cell=0; private ox=0; private oy=0; private noteMode=false; private hints=3;
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
  private diffRemove(): number {
    const d=(window as unknown as {__OMNICART_DIFF__?:string}).__OMNICART_DIFF__||'normal';
    return d==='easy'?32:d==='hard'?52:42;
  }
  protected onStart(){
    this.cell=Math.floor(Math.min(this.w-20,this.h-70)/9);
    this.ox=(this.w-9*this.cell)/2; this.oy=48;
    const full=Array.from({length:9},()=>Array(9).fill(0)); this.fill(full);
    this.solution=full.map(r=>[...r]);
    this.grid=full.map(r=>[...r]); this.given=Array.from({length:9},()=>Array(9).fill(true));
    this.notes=Array.from({length:9},()=>Array.from({length:9},()=>Array(9).fill(false)));
    let remove=this.diffRemove(); this.hints=3;
    while(remove--){ const r=(Math.random()*9)|0,c=(Math.random()*9)|0; if(this.grid[r][c]){ this.grid[r][c]=0; this.given[r][c]=false; } }
    this.sel={x:0,y:0}; this.noteMode=false;
  }
  private solution:number[][]=[];
  private checkWin(){
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) if(this.grid[r][c]!==this.solution[r][c]) return false;
    return true;
  }
  protected update(_dt:number){
    if(input.just('arrowleft')||input.just('a')) this.sel.x=(this.sel.x+8)%9;
    if(input.just('arrowright')||input.just('d')) this.sel.x=(this.sel.x+1)%9;
    if(input.just('arrowup')||input.just('w')) this.sel.y=(this.sel.y+8)%9;
    if(input.just('arrowdown')||input.just('s')) this.sel.y=(this.sel.y+1)%9;
    if(input.just('n')||input.just('shift')) this.noteMode=!this.noteMode;
    if(input.just('h') && this.hints>0 && !this.given[this.sel.y][this.sel.x]){
      this.grid[this.sel.y][this.sel.x]=this.solution[this.sel.y][this.sel.x];
      this.hints--; this.addScore(5); audio.powerup(); this.burst(this.ox+this.sel.x*this.cell+this.cell/2,this.oy+this.sel.y*this.cell+this.cell/2,'#4ea8de',10);
      if(this.checkWin()) this.gameOver(true);
    }
    if(input.pointer.justDown){
      const x=Math.floor((input.pointer.x-this.ox)/this.cell), y=Math.floor((input.pointer.y-this.oy)/this.cell);
      if(x>=0&&y>=0&&x<9&&y<9) this.sel={x,y};
      // number pad area
      if(y>=9 || input.pointer.y>this.oy+9*this.cell){
        const nx=Math.floor((input.pointer.x-this.ox)/(this.cell));
        if(nx>=0&&nx<9) this.place(nx+1);
      }
    }
    for(let n=1;n<=9;n++) if(input.just(String(n))) this.place(n);
    if(input.just('backspace')||input.just('0')||input.just('delete')) if(!this.given[this.sel.y][this.sel.x]){ this.grid[this.sel.y][this.sel.x]=0; this.notes[this.sel.y][this.sel.x].fill(false); }
  }
  private place(n:number){
    if(this.given[this.sel.y][this.sel.x]) return;
    if(this.noteMode){ this.notes[this.sel.y][this.sel.x][n-1]=!this.notes[this.sel.y][this.sel.x][n-1]; audio.click(); return; }
    this.grid[this.sel.y][this.sel.x]=n; this.notes[this.sel.y][this.sel.x].fill(false); audio.blip(); this.addScore(1);
    if(n!==this.solution[this.sel.y][this.sel.x]){ this.bump(0.15); audio.hit(); }
    else this.burst(this.ox+this.sel.x*this.cell+this.cell/2,this.oy+this.sel.y*this.cell+this.cell/2,'#80ffdb',6);
    if(this.checkWin()) this.gameOver(true);
  }
  protected render(){
    this.clear('#081018');
    const ctx=this.ctx;
    for(let r=0;r<9;r++) for(let c=0;c<9;c++){
      ctx.fillStyle=(Math.floor(r/3)+Math.floor(c/3))%2?'#102030':'#0c1824';
      ctx.fillRect(this.ox+c*this.cell,this.oy+r*this.cell,this.cell,this.cell);
      if(this.grid[r][c]){
        const wrong=!this.given[r][c] && this.grid[r][c]!==this.solution[r][c];
        ctx.fillStyle=this.given[r][c]?'#4ea8de':wrong?'#ff6b6b':'#ffe66b';
        ctx.font=`bold ${this.cell*0.5}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(String(this.grid[r][c]), this.ox+c*this.cell+this.cell/2, this.oy+r*this.cell+this.cell/2);
      } else {
        ctx.fillStyle='#567'; ctx.font=`${this.cell*0.2}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
        for(let n=0;n<9;n++) if(this.notes[r][c][n]){
          const nx=n%3, ny=(n/3)|0;
          ctx.fillText(String(n+1), this.ox+c*this.cell+(nx+0.5)*this.cell/3, this.oy+r*this.cell+(ny+0.5)*this.cell/3);
        }
      }
    }
    ctx.strokeStyle='#4ea8de'; ctx.lineWidth=2; ctx.strokeRect(this.ox+this.sel.x*this.cell,this.oy+this.sel.y*this.cell,this.cell,this.cell);
    ctx.lineWidth=3; ctx.strokeRect(this.ox,this.oy,9*this.cell,9*this.cell);
    for(let i=1;i<3;i++){ ctx.beginPath(); ctx.moveTo(this.ox+i*3*this.cell,this.oy); ctx.lineTo(this.ox+i*3*this.cell,this.oy+9*this.cell); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.ox,this.oy+i*3*this.cell); ctx.lineTo(this.ox+9*this.cell,this.oy+i*3*this.cell); ctx.stroke(); }
    // on-screen number pad
    for(let n=1;n<=9;n++){
      const x=this.ox+(n-1)*this.cell; const y=this.oy+9*this.cell+8;
      ctx.fillStyle='#152535'; ctx.fillRect(x+2,y,this.cell-4,22);
      ctx.fillStyle='#cde'; ctx.font='12px monospace'; ctx.textAlign='center'; ctx.fillText(String(n), x+this.cell/2, y+15);
    }
    ctx.fillStyle='#888'; ctx.font='11px monospace'; ctx.textAlign='left';
    ctx.fillText(`N notes · H hint (${this.hints}) · ${this.noteMode?'NOTES':'DIGITS'}`, 12, this.h-8);
    this.drawHud();
  }
}
export const create: GameFactory=(c,h)=>new GlyphGrid(c,h);
