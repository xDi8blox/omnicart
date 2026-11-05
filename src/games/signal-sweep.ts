import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class SignalSweep extends GameBase {
  private cols=10; private rows=8; private mines=12;
  private grid:{mine:boolean;n:number;open:boolean;flag:boolean}[][]=[];
  private cell=0; private ox=0; private oy=0; private first=true; private left=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#90be6d');}
  protected onStart(){
    this.cell=Math.floor(Math.min((this.w-20)/this.cols,(this.h-50)/this.rows));
    this.ox=(this.w-this.cols*this.cell)/2; this.oy=44;
    this.grid=Array.from({length:this.rows},()=>Array.from({length:this.cols},()=>({mine:false,n:0,open:false,flag:false})));
    this.first=true; this.left=this.cols*this.rows-this.mines;
  }
  private place(sx:number,sy:number){
    let placed=0;
    while(placed<this.mines){
      const x=(Math.random()*this.cols)|0, y=(Math.random()*this.rows)|0;
      if((x===sx&&y===sy)||this.grid[y][x].mine) continue;
      this.grid[y][x].mine=true; placed++;
    }
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++){
      if(this.grid[y][x].mine) continue;
      let n=0; for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
        const nx=x+dx,ny=y+dy; if(nx>=0&&ny>=0&&nx<this.cols&&ny<this.rows&&this.grid[ny][nx].mine) n++;
      } this.grid[y][x].n=n;
    }
  }
  private flood(x:number,y:number){
    const stack=[[x,y]];
    while(stack.length){
      const [cx,cy]=stack.pop()!;
      const c=this.grid[cy]?.[cx]; if(!c||c.open||c.flag) continue;
      c.open=true; this.left--; this.addScore(5);
      if(c.n===0 && !c.mine) for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) stack.push([cx+dx,cy+dy]);
    }
  }
  protected update(_dt:number){
    if(input.pointer.justDown || input.just('f')){
      const flag=input.just('f') || (input.pressed('shift'));
      // long-press approx: if shift virtual
      const x=Math.floor((input.pointer.x-this.ox)/this.cell);
      const y=Math.floor((input.pointer.y-this.oy)/this.cell);
      if(x<0||y<0||x>=this.cols||y>=this.rows) return;
      const c=this.grid[y][x];
      if(flag || input.pressed('control')){ if(!c.open){ c.flag=!c.flag; audio.click(); } return; }
      if(c.flag||c.open) return;
      if(this.first){ this.place(x,y); this.first=false; }
      if(c.mine){ c.open=true; audio.boom(); this.gameOver(false); return; }
      this.flood(x,y); audio.blip();
      if(this.left<=0) this.gameOver(true);
    }
  }
  protected render(){
    this.clear('#0c140c');
    const ctx=this.ctx;
    for(let y=0;y<this.rows;y++) for(let x=0;x<this.cols;x++){
      const c=this.grid[y][x];
      ctx.fillStyle=c.open?'#1a2a1a':'#2a4a2a';
      ctx.fillRect(this.ox+x*this.cell+1,this.oy+y*this.cell+1,this.cell-2,this.cell-2);
      if(c.flag){ ctx.fillStyle='#f00'; ctx.fillText('⚑', this.ox+x*this.cell+this.cell*0.3, this.oy+y*this.cell+this.cell*0.7); }
      if(c.open){
        if(c.mine){ ctx.fillStyle='#f44'; ctx.beginPath(); ctx.arc(this.ox+x*this.cell+this.cell/2,this.oy+y*this.cell+this.cell/2,this.cell*0.25,0,7); ctx.fill(); }
        else if(c.n){ ctx.fillStyle='#90be6d'; ctx.font=`bold ${this.cell*0.5}px monospace`; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText(String(c.n), this.ox+x*this.cell+this.cell/2, this.oy+y*this.cell+this.cell/2); }
      }
    }
    this.drawHud(`LEFT ${this.left}`);
  }
}
export const create: GameFactory=(c,h)=>new SignalSweep(c,h);
