import type { GameFactory, GameHooks } from '../core/types';
import { GameBase } from '../core/GameBase';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import { fillVoidBg, glowCircle, drawPremiumHud } from '../shared/fx';

type Ghost = { x: number; y: number; dir: {x:number;y:number}; color: string; mode: 'chase'|'scatter'|'fright'; fright: number };

const LEVELS = [
  [
    '#####################',
    '#........#..........#',
    '#.###.###.#.###.###.#',
    '#o...............#o.#',
    '#.#.##.#####.##.#.#.#',
    '#......#...#........#',
    '###.#.##.#.##.#.#####',
    '#...#.#.....#.#.....#',
    '###.#.#####.#.#.#####',
    '#.........P.........#',
    '#.###.###.#.###.###.#',
    '#o....#...#.......o.#',
    '#.#####.###.#####.#.#',
    '#........#..........#',
    '#####################',
  ],
  [
    '#####################',
    '#o....#.....#......o#',
    '#.###.#.###.#.###.#.#',
    '#...................#',
    '###.#.#####.#####.###',
    '#...#.....#.....#...#',
    '#.#####.#.#.#.#####.#',
    '#.......#P#.........#',
    '#.#####.#.#.#.#####.#',
    '#...#.....#.....#...#',
    '###.#.#####.#####.###',
    '#...................#',
    '#.###.#.###.#.###.#.#',
    '#o....#.....#......o#',
    '#####################',
  ],
];

class LumenChase extends GameBase {
  private grid: string[][]=[]; private cell=24; private ox=0; private oy=0;
  private px=0; private py=0; private pdir={x:0,y:0}; private want={x:0,y:0};
  private ghosts: Ghost[]=[]; private level=0; private lives=3; private pellets=0;
  private started=false; private moveAcc=0; private sx=0; private sy=0; private modeT=0;

  constructor(c: HTMLCanvasElement, h: GameHooks){ super(c,h,'#ff2040'); }

  protected onStart(): void { this.level=0; this.lives=3; this.started=false; this.loadLevel(); }

  private loadLevel(): void {
    const src=LEVELS[this.level%LEVELS.length];
    this.grid=src.map(r=>r.split(''));
    this.cell=Math.floor(Math.min((this.w-40)/this.grid[0].length,(this.h-80)/this.grid.length));
    this.ox=(this.w-this.grid[0].length*this.cell)/2;
    this.oy=56+(this.h-56-this.grid.length*this.cell)/2;
    this.pellets=0; this.modeT=0;
    for(let y=0;y<this.grid.length;y++) for(let x=0;x<this.grid[0].length;x++){
      if(this.grid[y][x]==='P'){ this.px=x; this.py=y; this.grid[y][x]='.'; }
      if(this.grid[y][x]==='.'||this.grid[y][x]==='o') this.pellets++;
    }
    this.pdir={x:0,y:0}; this.want={x:0,y:0};
    const colors=['#ff2040','#ff2bd6','#00e8ff','#f0c14b'];
    this.ghosts=colors.map((c,i)=>({ x:9+(i%2), y:5, dir:{x:i%2?1:-1,y:0}, color:c, mode:'scatter' as const, fright:0 }));
  }

  private wall(x:number,y:number): boolean {
    if(y<0||y>=this.grid.length||x<0||x>=this.grid[0].length) return true;
    return this.grid[y][x]==='#';
  }

  protected update(dt: number): void {
    if(!this.started){ if(input.actionJust()||input.pointer.justDown||input.anyDir()){ this.started=true; audio.blip(); } return; }
    if(input.left()) this.want={x:-1,y:0}; if(input.right()) this.want={x:1,y:0};
    if(input.up()) this.want={x:0,y:-1}; if(input.down()) this.want={x:0,y:1};
    if(input.pointer.justDown){ this.sx=input.pointer.x; this.sy=input.pointer.y; }
    if(input.pointer.down){ const dx=input.pointer.x-this.sx, dy=input.pointer.y-this.sy;
      if(Math.abs(dx)+Math.abs(dy)>20){ if(Math.abs(dx)>Math.abs(dy)) this.want={x:dx<0?-1:1,y:0}; else this.want={x:0,y:dy<0?-1:1}; } }

    this.modeT+=dt;
    const scatter = Math.floor(this.modeT/7)%2===1;
    this.moveAcc+=dt;
    const step=Math.max(0.09, 0.14 - this.level*0.01);
    while(this.moveAcc>=step){
      this.moveAcc-=step;
      if(!this.wall(this.px+this.want.x, this.py+this.want.y)) this.pdir={...this.want};
      if(!this.wall(this.px+this.pdir.x, this.py+this.pdir.y)){ this.px+=this.pdir.x; this.py+=this.pdir.y; }
      const tile=this.grid[this.py][this.px];
      if(tile==='.'){ this.grid[this.py][this.px]=' '; this.pellets--; this.addScore(10); audio.blip(700); }
      if(tile==='o'){ this.grid[this.py][this.px]=' '; this.pellets--; this.addScore(50); audio.powerup();
        for(const g of this.ghosts){ g.mode='fright'; g.fright=6; g.dir={x:-g.dir.x,y:-g.dir.y}; } }
      for(const g of this.ghosts){
        if(g.fright>0){ g.fright-=step; if(g.fright<=0) g.mode=scatter?'scatter':'chase'; }
        else g.mode=scatter?'scatter':'chase';
        const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].filter(d=>!(d.x===-g.dir.x&&d.y===-g.dir.y) && !this.wall(g.x+d.x,g.y+d.y));
        if(!dirs.length){ g.dir={x:-g.dir.x,y:-g.dir.y}; }
        else {
          let target={x:this.px,y:this.py};
          if(g.mode==='scatter') target={x:g.color==='#ff2040'?1:19, y:g.color==='#00e8ff'?13:1};
          if(g.mode==='fright') target={x:(Math.random()*20)|0,y:(Math.random()*14)|0};
          dirs.sort((a,b)=>Math.hypot(g.x+a.x-target.x,g.y+a.y-target.y)-Math.hypot(g.x+b.x-target.x,g.y+b.y-target.y));
          g.dir = g.mode==='fright' ? dirs[dirs.length-1] : dirs[0];
        }
        g.x+=g.dir.x; g.y+=g.dir.y;
        if(g.x===this.px && g.y===this.py){
          if(g.mode==='fright'){ this.addScore(200); audio.coin(); g.x=9; g.y=5; g.mode='scatter'; g.fright=0; this.burst(this.ox+g.x*this.cell, this.oy+g.y*this.cell, g.color, 16); }
          else { this.lives--; audio.boom(); this.bump(0.4); this.px=10; this.py=9; this.invulnGhosts();
            if(this.lives<=0){ this.gameOver(false); return; } }
        }
      }
      if(this.pellets<=0){ this.level++; this.addScore(500*(this.level)); audio.win(); this.loadLevel(); }
    }
  }
  private invulnGhosts(): void { for(const g of this.ghosts){ g.x=8+((Math.random()*4)|0); g.y=5; } }

  protected render(): void {
    fillVoidBg(this.ctx,this.w,this.h); const ctx=this.ctx;
    for(let y=0;y<this.grid.length;y++) for(let x=0;x<this.grid[0].length;x++){
      const px=this.ox+x*this.cell, py=this.oy+y*this.cell;
      if(this.grid[y][x]==='#'){
        const g=ctx.createLinearGradient(px,py,px+this.cell,py+this.cell);
        g.addColorStop(0,'#3a1528'); g.addColorStop(0.5,'#1a0a14'); g.addColorStop(1,'#0c0610');
        ctx.fillStyle=g; ctx.fillRect(px,py,this.cell+0.5,this.cell+0.5);
        ctx.strokeStyle='rgba(255,32,64,0.45)'; ctx.strokeRect(px+2,py+2,this.cell-4,this.cell-4);
      } else {
        ctx.fillStyle='rgba(8,4,12,0.85)'; ctx.fillRect(px,py,this.cell,this.cell);
        if(this.grid[y][x]==='.'){ glowCircle(ctx,px+this.cell/2,py+this.cell/2,4,'rgba(240,193,75,0.45)'); ctx.fillStyle='#f0c14b'; ctx.beginPath(); ctx.arc(px+this.cell/2,py+this.cell/2,2,0,Math.PI*2); ctx.fill(); }
        if(this.grid[y][x]==='o'){ glowCircle(ctx,px+this.cell/2,py+this.cell/2,12,'rgba(255,140,40,0.7)'); ctx.fillStyle='#ff8a1a'; ctx.beginPath(); ctx.arc(px+this.cell/2,py+this.cell/2,5,0,Math.PI*2); ctx.fill(); }
      }
    }
    const pcx=this.ox+this.px*this.cell+this.cell/2, pcy=this.oy+this.py*this.cell+this.cell/2;
    glowCircle(ctx,pcx,pcy,this.cell*1.4,'rgba(0,232,255,0.35)');
    const mouth=0.35+Math.sin(performance.now()*0.012)*0.25;
    ctx.fillStyle='#00e8ff'; ctx.beginPath(); ctx.moveTo(pcx,pcy); ctx.arc(pcx,pcy,this.cell*0.38,mouth,Math.PI*2-mouth); ctx.closePath(); ctx.fill();
    for(const g of this.ghosts){
      const gx=this.ox+g.x*this.cell+this.cell/2, gy=this.oy+g.y*this.cell+this.cell/2;
      const col=g.mode==='fright'?'#4466ff':g.color;
      glowCircle(ctx,gx,gy,22,col+'88');
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(gx,gy-2,this.cell*0.3,Math.PI,0);
      ctx.lineTo(gx+this.cell*0.3,gy+this.cell*0.28); ctx.lineTo(gx+this.cell*0.12,gy+this.cell*0.14);
      ctx.lineTo(gx,gy+this.cell*0.28); ctx.lineTo(gx-this.cell*0.12,gy+this.cell*0.14); ctx.lineTo(gx-this.cell*0.3,gy+this.cell*0.28); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(gx-5,gy-4,4,0,Math.PI*2); ctx.arc(gx+5,gy-4,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#050208'; ctx.beginPath(); ctx.arc(gx-3,gy-4,2,0,Math.PI*2); ctx.arc(gx+7,gy-4,2,0,Math.PI*2); ctx.fill();
    }
    drawPremiumHud(ctx,this.w,{ title:'Lumen Chase', stats:[
      {label:'SCORE',value:String(this.score),color:'#f0c14b'},
      {label:'LEFT',value:String(this.pellets),color:'#00e8ff'},
      {label:'LIVES',value:'♥'.repeat(this.lives),color:'#ff2040'},
    ]});
    if(!this.started){ ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,this.w,this.h);
      ctx.fillStyle='#fff'; ctx.font='800 26px Orbitron'; ctx.textAlign='center'; ctx.fillText('LUMEN CHASE',this.w/2,this.h/2-10);
      ctx.fillStyle='#9a8aa8'; ctx.font='600 14px Rajdhani'; ctx.fillText('Eat pellets · power orbs reverse ghosts',this.w/2,this.h/2+18); }
  }
}
export const create: GameFactory=(c,h)=>new LumenChase(c,h);
