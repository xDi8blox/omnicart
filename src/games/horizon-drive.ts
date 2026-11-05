import type { GameFactory, GameHooks, GameInstance } from '../core/types';
import * as THREE from 'three';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import { attachThree, resizeThree } from '../shared/threeKit';
import { fitParent } from '../core/canvas';

class HorizonDriveGame implements GameInstance {
  private canvas: HTMLCanvasElement; private hooks: GameHooks;
  private kit!: ReturnType<typeof attachThree>;
  private car!: THREE.Group; private road!: THREE.Mesh; private city!: THREE.Group;
  private traffic: THREE.Object3D[] = [];
  private rainGeo!: THREE.BufferGeometry; private rainN = 400;
  private x = 0; private speed = 40; private nitro = 100;
  private score = 0; private dist = 0;
  private running=false; private paused=false; private ended=false; private started=false;
  private raf=0; private last=0; private w=800; private h=450; private hud!: HTMLDivElement;
  private onResize = () => this.layout();

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks){ this.canvas=canvas; this.hooks=hooks; }

  private layout(): void {
    const parent=this.canvas.parentElement??document.body;
    const {w,h}=fitParent(this.canvas, parent, 16/9, { setup2d: false, dprCap: 1.75 }); this.w=w; this.h=h;
    this.canvas.dataset.cssW=String(w); this.canvas.dataset.cssH=String(h);
    if(this.kit) resizeThree(this.kit,w,h);
  }

  start(): void {
    this.layout(); window.addEventListener('resize', this.onResize); input.attach(this.canvas); audio.ensure();
    this.kit = attachThree(this.canvas, this.w, this.h, 0.9);
    const {scene,camera}=this.kit;
    scene.background=new THREE.Color(0x04020a); scene.fog=new THREE.Fog(0x04020a,25,140);
    scene.add(new THREE.AmbientLight(0x221018,0.5));
    const key=new THREE.DirectionalLight(0xffe8d8,1.2); key.position.set(4,8,5); scene.add(key);
    scene.add(new THREE.PointLight(0x00e8ff,1.4,40).translateX(-6).translateY(3));
    scene.add(new THREE.PointLight(0xff2040,1.8,50).translateX(3).translateY(2).translateZ(-4));

    const roadCanvas=document.createElement('canvas'); roadCanvas.width=roadCanvas.height=512;
    const g=roadCanvas.getContext('2d')!; g.fillStyle='#0a0a10'; g.fillRect(0,0,512,512);
    g.fillStyle='rgba(255,255,255,0.1)'; for(let y=0;y<512;y+=64) g.fillRect(250,y+10,12,36);
    g.fillStyle='rgba(255,180,40,0.5)'; g.fillRect(20,0,8,512); g.fillRect(484,0,8,512);
    const roadTex=new THREE.CanvasTexture(roadCanvas); roadTex.wrapS=roadTex.wrapT=THREE.RepeatWrapping; roadTex.repeat.set(1,40);
    this.road=new THREE.Mesh(new THREE.PlaneGeometry(14,400), new THREE.MeshStandardMaterial({map:roadTex,color:0x2a2a38,metalness:0.95,roughness:0.1}));
    this.road.rotation.x=-Math.PI/2; this.road.position.z=-160; scene.add(this.road);
    for(const side of [-7.2,7.2]){
      const strip=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.08,400), new THREE.MeshBasicMaterial({color:side<0?0xff2040:0x00e8ff,toneMapped:false}));
      strip.position.set(side,0.05,-160); scene.add(strip);
    }

    this.city=new THREE.Group(); scene.add(this.city);
    for(let i=0;i<48;i++){
      const h=6+Math.random()*26, w=2+Math.random()*3.5;
      const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,2+Math.random()*3), new THREE.MeshStandardMaterial({
        color:0x101018, metalness:0.4, roughness:0.55, emissive:Math.random()>0.5?0xff2040:0x00a0ff, emissiveIntensity:0.2+Math.random()*0.3,
      }));
      const side=Math.random()>0.5?1:-1; b.position.set(side*(10+Math.random()*16), h/2, -Math.random()*300); this.city.add(b);
    }
    for(let i=0;i<18;i++) for(const side of [-8.5,8.5]){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.1,5,6), new THREE.MeshStandardMaterial({color:0x222228}));
      pole.position.set(side,2.5,-i*16); this.city.add(pole);
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,8), new THREE.MeshBasicMaterial({color:0xffe2a8,toneMapped:false}));
      lamp.position.set(side-Math.sign(side)*0.35,5,-i*16); this.city.add(lamp);
    }

    this.car=new THREE.Group();
    const bodyMat=new THREE.MeshStandardMaterial({color:0xff2040,metalness:0.8,roughness:0.22,emissive:0x500018,emissiveIntensity:0.5});
    const chassis=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.35,3.4), bodyMat); chassis.position.y=0.42; this.car.add(chassis);
    const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.4,1.35), new THREE.MeshStandardMaterial({color:0x061018,metalness:0.95,roughness:0.1,emissive:0x003040,emissiveIntensity:0.5}));
    cabin.position.set(0,0.88,-0.2); this.car.add(cabin);
    for(const x of [-0.45,0.45]){ const hl=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8), new THREE.MeshBasicMaterial({color:0xfff0c0,toneMapped:false})); hl.position.set(x,0.45,1.6); this.car.add(hl); }
    for(const x of [-0.5,0.5]){ const tl=new THREE.Mesh(new THREE.BoxGeometry(0.25,0.1,0.08), new THREE.MeshBasicMaterial({color:0xff1040,toneMapped:false})); tl.position.set(x,0.5,-1.62); this.car.add(tl); }
    const under=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.05,2.8), new THREE.MeshBasicMaterial({color:0xff2040,toneMapped:false})); under.position.y=0.12; this.car.add(under);
    this.car.position.set(0,0,2); scene.add(this.car);

    this.traffic=[];
    const cols=[0x00e8ff,0xf0c14b,0xff2bd6,0x4488ff];
    for(let i=0;i<10;i++){
      const g=new THREE.Group();
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.35,0.4,2.6), new THREE.MeshStandardMaterial({color:cols[i%4],metalness:0.7,roughness:0.28,emissive:cols[i%4],emissiveIntensity:0.2}));
      body.position.y=0.4; g.add(body);
      g.position.set((i%2?1:-1)*(1.8+(i%3)*0.7),0,-18-i*16); scene.add(g); this.traffic.push(g);
    }

    const rainPos=new Float32Array(this.rainN*3);
    for(let i=0;i<this.rainN;i++){ rainPos[i*3]=(Math.random()-0.5)*30; rainPos[i*3+1]=Math.random()*20; rainPos[i*3+2]=-Math.random()*80; }
    this.rainGeo=new THREE.BufferGeometry(); this.rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos,3));
    scene.add(new THREE.Points(this.rainGeo, new THREE.PointsMaterial({color:0x88aacc,size:0.05,transparent:true,opacity:0.5})));

    camera.position.set(0,2.8,8.5); camera.lookAt(0,0.6,-10);
    this.hud=document.createElement('div'); this.hud.style.cssText='position:absolute;inset:0;pointer-events:none;font-family:Orbitron,sans-serif;color:#fff';
    this.canvas.parentElement!.style.position='relative'; this.canvas.parentElement!.appendChild(this.hud);

    this.running=true; this.paused=false; this.ended=false; this.started=false;
    this.score=0; this.dist=0; this.speed=40; this.nitro=100; this.x=0; this.last=performance.now();
    this.paint();
    const loop=(now:number)=>{
      if(!this.running) return;
      const dt=Math.min(0.05,(now-this.last)/1000); this.last=now;
      if(!this.paused&&!this.ended) this.tick(dt);
      this.kit.composer.render(); input.endFrame(); this.raf=requestAnimationFrame(loop);
    };
    this.raf=requestAnimationFrame(loop);
  }

  private paint(): void {
    this.hud.innerHTML=`
      <div style="position:absolute;top:10px;left:14px;color:#ff2040;font-size:11px;font-weight:700">OMNICART</div>
      <div style="position:absolute;top:10px;left:0;right:0;text-align:center;font-weight:800;letter-spacing:.1em;font-size:16px">HORIZON DRIVE</div>
      <div style="position:absolute;top:8px;right:14px;text-align:right;font-size:13px;line-height:1.35">
        <div style="color:#00e8ff">${Math.floor(this.speed*3.6)} KM/H</div>
        <div style="color:#f0c14b">${(this.dist/1000).toFixed(2)} KM</div>
        <div style="color:#ff2040">NITRO ${Math.floor(this.nitro)}%</div>
      </div>
      ${!this.started&&!this.ended?'<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.45)"><div style="text-align:center"><div style="font-size:28px;font-weight:800">HORIZON DRIVE</div><div style="color:#9a8aa8;margin-top:8px">Steer · accelerate · nitro</div></div></div>':''}`;
  }

  private tick(dt: number): void {
    if(!this.started){ if(input.actionJust()||input.pointer.justDown||input.anyDir()){ this.started=true; audio.blip(); this.paint(); } return; }
    if(input.just('escape')||input.just('p')){ this.pause(); this.hooks.onPauseChange?.(true); return; }
    let steer=(input.left()?-1:0)+(input.right()?1:0);
    if(input.pointer.down) steer += (input.pointer.x/this.w-0.5)*2;
    this.x = THREE.MathUtils.clamp(this.x + steer*dt*5.5, -5.5, 5.5);
    const accel = input.up() || input.action() ? 1 : 0.35;
    const boosting = (input.pressed('shift')||input.just(' ')) && this.nitro>0;
    if(boosting){ this.nitro=Math.max(0,this.nitro-25*dt); this.speed=Math.min(95,this.speed+40*dt); }
    else { this.speed=THREE.MathUtils.lerp(this.speed, 35+accel*40+this.dist*0.002, dt*0.6); this.nitro=Math.min(100,this.nitro+8*dt); }
    this.car.position.x=this.x; this.car.rotation.y=-this.x*0.04; this.car.rotation.z=-this.x*0.03;
    this.dist+=this.speed*dt; this.score=Math.floor(this.dist)+Math.floor(this.dist/500)*100; this.hooks.onScore(this.score);
    this.road.position.z+=this.speed*dt; if(this.road.position.z>40) this.road.position.z-=40;
    (this.road.material as THREE.MeshStandardMaterial).map!.offset.y -= dt*2.2;
    this.city.children.forEach(b=>{ b.position.z+=this.speed*dt; if(b.position.z>20) b.position.z-=320; });
    for(const t of this.traffic){
      t.position.z += (this.speed*0.7)*dt;
      if(t.position.z>15){ t.position.z-=160; t.position.x=(Math.random()>0.5?1:-1)*(1.5+Math.random()*3); }
      if(Math.abs(t.position.x-this.car.position.x)<1.4 && Math.abs(t.position.z-this.car.position.z)<2.2){
        audio.boom(); this.ended=true; this.hooks.onGameOver(this.score,false); this.paint(); return;
      }
    }
    if(Math.abs(this.x)>5.8){ audio.hit(); this.ended=true; this.hooks.onGameOver(this.score,false); this.paint(); return; }
    const rp=this.rainGeo.getAttribute('position') as THREE.BufferAttribute;
    for(let i=0;i<this.rainN;i++){ rp.array[i*3+1]-=dt*28; rp.array[i*3+2]+=dt*40; if(rp.array[i*3+1]<0){ rp.array[i*3+1]=18; rp.array[i*3+2]=-Math.random()*80; } }
    rp.needsUpdate=true;
    this.kit.camera.position.x=this.car.position.x*0.45;
    this.kit.camera.lookAt(this.car.position.x,0.8,this.car.position.z-12);
    this.paint();
  }

  pause(): void { this.paused=true; }
  resume(): void { this.paused=false; this.last=performance.now(); }
  restart(): void { this.ended=false; this.paused=false; this.started=false; this.score=0; this.dist=0; this.speed=40; this.nitro=100; this.x=0; this.hooks.onScore(0); this.paint(); }
  destroy(): void { this.running=false; cancelAnimationFrame(this.raf); window.removeEventListener('resize',this.onResize); input.detach(); this.hud?.remove(); this.kit?.renderer.dispose(); }
  getScore(): number { return this.score; }
}
export const create: GameFactory = (c,h)=>new HorizonDriveGame(c,h);
