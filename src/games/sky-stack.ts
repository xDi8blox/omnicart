import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class SkyStack extends GameBase {
  private blocks:{x:number;w:number}[]=[];
  private cur={x:0,w:160,dir:1,speed:180};
  private dropping=false; private dy=0; private targetY=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#80ffdb');}
  protected onStart(){
    this.blocks=[{x:this.w/2-80,w:160}];
    this.cur={x:0,w:160,dir:1,speed:180}; this.dropping=false; this.dy=0;
    this.targetY=this.h-40;
  }
  protected update(dt:number){
    if(this.dropping){
      this.dy+=600*dt;
      const placeY=this.h-40-this.blocks.length*22;
      if(this.dy>=placeY){
        const prev=this.blocks[this.blocks.length-1];
        const left=Math.max(this.cur.x,prev.x);
        const right=Math.min(this.cur.x+this.cur.w,prev.x+prev.w);
        const w=right-left;
        if(w<12){ audio.hit(); this.gameOver(false); return; }
        this.blocks.push({x:left,w});
        this.addScore(Math.floor(w)); audio.coin();
        this.cur={x:0,w,dir:1,speed:180+this.blocks.length*6}; this.dropping=false; this.dy=0;
        if(this.blocks.length>=25) this.gameOver(true);
      }
      return;
    }
    this.cur.x+=this.cur.dir*this.cur.speed*dt;
    if(this.cur.x<0||this.cur.x+this.cur.w>this.w) this.cur.dir*=-1;
    if(input.actionJust()||input.pointer.justDown){ this.dropping=true; this.dy=40; audio.blip(); }
  }
  protected render(){
    this.clear('#061816');
    const ctx=this.ctx;
    for(let i=0;i<this.blocks.length;i++){
      const b=this.blocks[i]; const y=this.h-40-i*22;
      ctx.fillStyle=`hsl(${160+i*8},80%,55%)`; ctx.fillRect(b.x,y,b.w,20);
    }
    if(!this.dropping){
      ctx.fillStyle='#80ffdb'; ctx.fillRect(this.cur.x,60,this.cur.w,20);
    } else {
      ctx.fillStyle='#80ffdb'; ctx.fillRect(this.cur.x,this.dy,this.cur.w,20);
    }
    this.drawHud(`FLOOR ${this.blocks.length}`);
  }
}
export const create: GameFactory=(c,h)=>new SkyStack(c,h);
