import { GameBase } from '../core/GameBase';
import type { GameHooks, GameFactory } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';

class SkyStack extends GameBase {
  private blocks:{x:number;w:number;color:string}[]=[];
  private cur={x:0,w:160,dir:1,speed:180};
  private dropping=false; private dy=0; private perfect=0;
  constructor(c:HTMLCanvasElement,h:GameHooks){super(c,h,'#80ffdb');}
  protected onStart(){
    this.blocks=[{x:this.w/2-80,w:160,color:'#80ffdb'}];
    this.cur={x:0,w:160,dir:1,speed:180}; this.dropping=false; this.dy=0; this.perfect=0;
  }
  protected update(dt:number){
    if(this.dropping){
      this.dy+=700*dt;
      const placeY=this.h-40-this.blocks.length*22;
      if(this.dy>=placeY){
        const prev=this.blocks[this.blocks.length-1];
        const left=Math.max(this.cur.x,prev.x); const right=Math.min(this.cur.x+this.cur.w,prev.x+prev.w);
        const w=right-left;
        if(w<10){ this.bump(0.4); audio.hit(); this.gameOver(false); return; }
        const perfect=Math.abs(w-prev.w)<4;
        if(perfect){ this.perfect++; this.addScore(50); audio.powerup(); this.burst(left+w/2,placeY,'#fff',16); }
        else { this.perfect=0; this.addScore(Math.floor(w)); audio.coin(); this.burst(left+w/2,placeY,'#80ffdb',8); }
        const hue=160+this.blocks.length*8;
        this.blocks.push({x:left,w,color:`hsl(${hue},80%,55%)`});
        this.cur={x:Math.random()<0.5?0:this.w-w,w,dir:Math.random()<0.5?1:-1,speed:170+this.blocks.length*8}; this.dropping=false; this.dy=0;
        if(this.blocks.length>=25) this.gameOver(true);
      }
      return;
    }
    this.cur.x+=this.cur.dir*this.cur.speed*dt;
    if(this.cur.x<0||this.cur.x+this.cur.w>this.w){ this.cur.dir*=-1; this.cur.x=Math.max(0,Math.min(this.w-this.cur.w,this.cur.x)); }
    if(input.actionJust()||input.pointer.justDown){ this.dropping=true; this.dy=50; audio.blip(); }
  }
  protected render(){
    this.clear('#061816');
    const ctx=this.ctx;
    const offset=Math.max(0, this.blocks.length*22 - (this.h-120));
    for(let i=0;i<this.blocks.length;i++){
      const b=this.blocks[i]; const y=this.h-40-i*22+offset;
      ctx.fillStyle=b.color; ctx.fillRect(b.x,y,b.w,20);
      ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(b.x,y,b.w,4);
    }
    if(!this.dropping){ ctx.fillStyle='#80ffdb'; ctx.shadowBlur=12; ctx.shadowColor='#80ffdb'; ctx.fillRect(this.cur.x,55,this.cur.w,20); ctx.shadowBlur=0; }
    else { ctx.fillStyle='#80ffdb'; ctx.fillRect(this.cur.x,this.dy,this.cur.w,20); }
    this.drawHud(`FLOOR ${this.blocks.length}${this.perfect>=2?' · PERFECT':''}`);
  }
}
export const create: GameFactory=(c,h)=>new SkyStack(c,h);
