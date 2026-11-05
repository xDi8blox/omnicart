import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

const WORDS=['NEON','CART','ARCADE','PULSE','DRIFT','GLOW','PIXEL','QUEST','HYPER','BLAZE','VORTEX','FLUX'];
class Lexigrid extends GameBase {
  private size=10; private grid:string[][]=[]; private words:string[]=[]; private found=new Set<string>();
  private cell=0; private ox=0; private oy=0; private drag:{x:number;y:number}[]=[]; private dragging=false;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#9b5de5');}
  protected onStart(){
    this.cell=Math.floor(Math.min(this.w-30,this.h-100)/this.size);
    this.ox=(this.w-this.size*this.cell)/2; this.oy=44;
    this.grid=Array.from({length:this.size},()=>Array(this.size).fill(''));
    this.words=WORDS.slice(0,6); this.found.clear(); this.drag=[]; this.dragging=false;
    for(const w of this.words){
      for(let attempt=0;attempt<40;attempt++){
        const horiz=Math.random()<0.5; const x=(Math.random()*(this.size-(horiz?w.length:1)))|0; const y=(Math.random()*(this.size-(horiz?1:w.length)))|0;
        let ok=true; for(let i=0;i<w.length;i++){ const cx=x+(horiz?i:0), cy=y+(horiz?0:i); const ch=this.grid[cy][cx]; if(ch && ch!==w[i]){ok=false;break;} }
        if(!ok) continue;
        for(let i=0;i<w.length;i++){ const cx=x+(horiz?i:0), cy=y+(horiz?0:i); this.grid[cy][cx]=w[i]; }
        break;
      }
    }
    const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for(let y=0;y<this.size;y++) for(let x=0;x<this.size;x++) if(!this.grid[y][x]) this.grid[y][x]=letters[(Math.random()*26)|0];
  }
  private cellAt(px:number,py:number){ return {x:Math.floor((px-this.ox)/this.cell), y:Math.floor((py-this.oy)/this.cell)}; }
  protected update(_dt:number){
    if(input.pointer.justDown){ const p=this.cellAt(input.pointer.x,input.pointer.y); if(p.x>=0&&p.y>=0&&p.x<this.size&&p.y<this.size){ this.dragging=true; this.drag=[p]; } }
    if(this.dragging && input.pointer.down){
      const p=this.cellAt(input.pointer.x,input.pointer.y);
      if(p.x>=0&&p.y>=0&&p.x<this.size&&p.y<this.size){
        const last=this.drag[this.drag.length-1];
        if(last && (p.x!==last.x||p.y!==last.y)) this.drag=[this.drag[0],p];
      }
    }
    if(input.pointer.justUp && this.dragging){
      this.dragging=false;
      if(this.drag.length>=2){
        const a=this.drag[0], b=this.drag[this.drag.length-1];
        const dx=Math.sign(b.x-a.x), dy=Math.sign(b.y-a.y);
        let word=''; let x=a.x,y=a.y;
        while(true){ word+=this.grid[y][x]; if(x===b.x&&y===b.y) break; x+=dx; y+=dy; if(x<0||y<0||x>=this.size||y>=this.size) break; }
        const hit=this.words.find(w=>w===word||w===[...word].reverse().join(''));
        if(hit && !this.found.has(hit)){ this.found.add(hit); this.addScore(hit.length*10); audio.coin(); if(this.found.size===this.words.length) this.gameOver(true); }
        else audio.hit();
      }
      this.drag=[];
    }
  }
  protected render(){
    this.clear('#100818');
    const ctx=this.ctx;
    for(let y=0;y<this.size;y++) for(let x=0;x<this.size;x++){
      ctx.fillStyle='#1a1030'; ctx.fillRect(this.ox+x*this.cell+1,this.oy+y*this.cell+1,this.cell-2,this.cell-2);
      ctx.fillStyle='#e0d0ff'; ctx.font=`bold ${this.cell*0.45}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(this.grid[y][x], this.ox+x*this.cell+this.cell/2, this.oy+y*this.cell+this.cell/2);
    }
    if(this.drag.length>=2){ const a=this.drag[0],b=this.drag[this.drag.length-1];
      ctx.strokeStyle='#9b5de5'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(this.ox+a.x*this.cell+this.cell/2,this.oy+a.y*this.cell+this.cell/2);
      ctx.lineTo(this.ox+b.x*this.cell+this.cell/2,this.oy+b.y*this.cell+this.cell/2); ctx.stroke(); }
    ctx.fillStyle='#aaa'; ctx.font='12px monospace'; ctx.textAlign='left';
    ctx.fillText(this.words.map(w=>this.found.has(w)?`[${w}]`:w).join('  '), 12, this.h-12);
    this.drawHud(`${this.found.size}/${this.words.length}`);
  }
}
export const create: GameFactory=(c,h)=>new Lexigrid(c,h);
