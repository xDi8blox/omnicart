import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class EchoPairs extends GameBase {
  private cols=4; private rows=3; private cards:{v:number;open:boolean;done:boolean}[]=[];
  private first=-1; private lock=0; private cellW=0; private cellH=0; private ox=0; private oy=0; private left=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#e63946');}
  protected onStart(){
    const vals=[1,1,2,2,3,3,4,4,5,5,6,6];
    for(let i=vals.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [vals[i],vals[j]]=[vals[j],vals[i]]; }
    this.cards=vals.map(v=>({v,open:false,done:false}));
    this.cellW=Math.floor((this.w-40)/this.cols); this.cellH=Math.floor((this.h-70)/this.rows);
    this.ox=20; this.oy=50; this.first=-1; this.lock=0; this.left=6;
  }
  protected update(dt:number){
    this.lock=Math.max(0,this.lock-dt);
    if(this.lock>0) return;
    if(this.first>=0 && this.cards[this.first].open && !this.cards[this.first].done){
      // wait for second
    }
    if(input.pointer.justDown){
      const x=Math.floor((input.pointer.x-this.ox)/this.cellW), y=Math.floor((input.pointer.y-this.oy)/this.cellH);
      if(x<0||y<0||x>=this.cols||y>=this.rows) return;
      const i=y*this.cols+x; const c=this.cards[i]; if(c.done||c.open) return;
      c.open=true; audio.blip();
      if(this.first<0) this.first=i;
      else {
        if(this.cards[this.first].v===c.v){ this.cards[this.first].done=true; c.done=true; this.addScore(50); audio.coin(); this.left--; this.first=-1; if(this.left<=0) this.gameOver(true); }
        else { const a=this.first,b=i; this.lock=0.7; this.first=-1; setTimeout(()=>{ this.cards[a].open=false; this.cards[b].open=false; audio.hit(); },650); }
      }
    }
  }
  protected render(){
    this.clear('#14080c');
    const ctx=this.ctx; const glyphs=['◆','●','★','▲','■','✚'];
    for(let i=0;i<this.cards.length;i++){
      const c=this.cards[i]; const x=i%this.cols, y=(i/this.cols)|0;
      ctx.fillStyle=c.done?'#2a1014':c.open?'#e63946':'#3a1820';
      ctx.fillRect(this.ox+x*this.cellW+4,this.oy+y*this.cellH+4,this.cellW-8,this.cellH-8);
      if(c.open||c.done){ ctx.fillStyle='#fff'; ctx.font=`${this.cellH*0.4}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(glyphs[c.v-1], this.ox+x*this.cellW+this.cellW/2, this.oy+y*this.cellH+this.cellH/2); }
    }
    this.drawHud(`PAIRS ${6-this.left}/6`);
  }
}
export const create: GameFactory=(c,h)=>new EchoPairs(c,h);
