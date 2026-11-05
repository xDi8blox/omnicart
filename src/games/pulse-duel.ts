import type { GameFactory, GameHooks, GameInstance } from '../core/types';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import { attachThree, resizeThree } from '../shared/threeKit';
import { fitParent } from '../core/canvas';

type F = {
  root: THREE.Group; mixer: THREE.AnimationMixer; x: number; hp: number;
  facing: number; state: string; timer: number; atk: number; block: boolean; vy: number; onGround: boolean;
  combo: number; acts: Record<string, THREE.AnimationAction>;
};

class PulseDuelGame implements GameInstance {
  private canvas: HTMLCanvasElement; private hooks: GameHooks;
  private kit!: ReturnType<typeof attachThree>;
  private p1!: F; private p2!: F; private clips: THREE.AnimationClip[] = [];
  private impact!: THREE.Mesh;
  private wins = [0, 0]; private round = 1; private roundT = 0;
  private score = 0; private running=false; private paused=false; private ended=false; private started=false;
  private raf=0; private last=0; private w=800; private h=450; private hud!: HTMLDivElement;
  private onResize=()=>this.layout();

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks){ this.canvas=canvas; this.hooks=hooks; }

  private layout(): void {
    const parent=this.canvas.parentElement??document.body;
    const {w,h}=fitParent(this.canvas,parent,16/9); this.w=w; this.h=h;
    this.canvas.dataset.cssW=String(w); this.canvas.dataset.cssH=String(h);
    if(this.kit) resizeThree(this.kit,w,h);
  }

  start(): void { void this.boot(); }
  private async boot(): Promise<void> {
    this.layout(); window.addEventListener('resize',this.onResize); input.attach(this.canvas); audio.ensure();
    this.kit=attachThree(this.canvas,this.w,this.h,0.65);
    const {scene,camera}=this.kit;
    scene.background=new THREE.Color(0x09050e); scene.fog=new THREE.FogExp2(0x09050e,0.02);
    scene.add(new THREE.AmbientLight(0x221018,0.6));
    const key=new THREE.DirectionalLight(0xffe8d8,1.8); key.position.set(4,8,5); scene.add(key);
    scene.add(new THREE.PointLight(0x00e8ff,1.6,40).translateX(-6).translateY(3));
    scene.add(new THREE.PointLight(0xff2040,2.2,50).translateX(3).translateY(2).translateZ(-6));

    const floor=new THREE.Mesh(new THREE.CircleGeometry(11,48), new THREE.MeshStandardMaterial({
      color:0x2a1820, metalness:0.65, roughness:0.3, emissive:0x1a0508, emissiveIntensity:0.5,
    }));
    floor.rotation.x=-Math.PI/2; scene.add(floor);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(11,0.14,8,48), new THREE.MeshBasicMaterial({color:0xff2040,toneMapped:false}));
    rim.rotation.x=Math.PI/2; rim.position.y=0.06; scene.add(rim);
    for(let i=0;i<8;i++){
      const a=(i/8)*Math.PI*2;
      const p=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.55,7,8), new THREE.MeshStandardMaterial({
        color:0x1a1018, metalness:0.6, roughness:0.35, emissive:i%2?0x00e8ff:0xff2040, emissiveIntensity:0.4,
      }));
      p.position.set(Math.cos(a)*10.2,3.5,Math.sin(a)*10.2); scene.add(p);
    }
    this.impact=new THREE.Mesh(new THREE.RingGeometry(0.5,1.6,32), new THREE.MeshBasicMaterial({color:0xff2040,transparent:true,opacity:0,side:THREE.DoubleSide,toneMapped:false}));
    this.impact.rotation.x=-Math.PI/2; this.impact.position.y=0.08; scene.add(this.impact);

    const loader=new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
    const base=import.meta.env.BASE_URL || './';
    const [male,female,anim1,anim2]=await Promise.all([
      loader.loadAsync(base+'assets/male.glb'),
      loader.loadAsync(base+'assets/female.glb'),
      loader.loadAsync(base+'assets/anim1.glb'),
      loader.loadAsync(base+'assets/anim2.glb'),
    ]);
    this.clips=[...anim1.animations,...anim2.animations];
    this.p1=this.makeFighter(male.scene as THREE.Group, 0xff2040, -2.2, 1);
    this.p2=this.makeFighter(female.scene as THREE.Group, 0x00e8ff, 2.2, -1);
    camera.position.set(0,2.4,7.6); camera.lookAt(0,1.15,0);

    this.hud=document.createElement('div'); this.hud.style.cssText='position:absolute;inset:0;pointer-events:none;font-family:Orbitron,sans-serif;color:#fff';
    this.canvas.parentElement!.style.position='relative'; this.canvas.parentElement!.appendChild(this.hud);

    this.running=true; this.paused=false; this.ended=false; this.started=false;
    this.wins=[0,0]; this.round=1; this.score=0; this.resetRound(); this.last=performance.now(); this.paint();
    const loop=(now:number)=>{
      if(!this.running) return;
      const dt=Math.min(0.05,(now-this.last)/1000); this.last=now;
      if(!this.paused&&!this.ended) this.tick(dt);
      this.kit.composer.render(); input.endFrame(); this.raf=requestAnimationFrame(loop);
    };
    this.raf=requestAnimationFrame(loop);
  }

  private pick(names: string[]): THREE.AnimationClip | undefined {
    return this.clips.find(c=>names.some(n=>c.name.toLowerCase().includes(n.toLowerCase())));
  }

  private makeFighter(src: THREE.Group, tint: number, x: number, facing: number): F {
    const root=SkeletonUtils.clone(src) as THREE.Group;
    root.traverse(o=>{
      const m=o as THREE.Mesh; if(!m.isMesh) return; m.castShadow=true;
      const mats=Array.isArray(m.material)?m.material:[m.material];
      for(const mat of mats){ const sm=mat as THREE.MeshStandardMaterial; if(sm?.color){ sm.color.lerp(new THREE.Color(tint),0.2); sm.emissive=new THREE.Color(tint); sm.emissiveIntensity=0.15; sm.needsUpdate=true; } }
    });
    root.scale.setScalar(1.7); root.position.set(x,0,0); root.rotation.y=facing>0?0.4:Math.PI-0.4;
    this.kit.scene.add(root);
    const mixer=new THREE.AnimationMixer(root);
    const acts: Record<string, THREE.AnimationAction> = {};
    const map: Record<string,string[]> = {
      idle:['Idle_Loop','Sword_Idle'], walk:['Walk_Loop','Jog_Fwd'], punch:['Punch_Jab','Punch_Cross'],
      kick:['Melee_Hook','OverhandThrow'], hit:['Hit_Chest','Hit_Head'], block:['Idle_FoldArms'],
    };
    for(const [k,names] of Object.entries(map)){ const c=this.pick(names); if(c) acts[k]=mixer.clipAction(c); }
    acts.idle?.play();
    return { root, mixer, x, hp:100, facing, state:'idle', timer:0, atk:0, block:false, vy:0, onGround:true, combo:0, acts };
  }

  private play(f: F, name: string, loop=false): void {
    const a=f.acts[name]; if(!a) return;
    Object.values(f.acts).forEach(x=>{ if(x!==a) x.fadeOut(0.1); });
    a.reset().setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce, loop?Infinity:1).fadeIn(0.08).play();
    if(!loop) a.clampWhenFinished=true;
  }

  private resetRound(): void {
    this.p1.hp=100; this.p2.hp=100; this.p1.x=-2.2; this.p2.x=2.2; this.p1.combo=0;
    this.p1.state='idle'; this.p2.state='idle'; this.roundT=60; this.play(this.p1,'idle',true); this.play(this.p2,'idle',true);
  }

  private paint(): void {
    const p1w=this.p1.hp, p2w=this.p2.hp;
    this.hud.innerHTML=`
      <div style="position:absolute;top:10px;left:14px;color:#ff2040;font-size:11px;font-weight:700">OMNICART</div>
      <div style="position:absolute;top:8px;left:0;right:0;text-align:center;font-weight:800;letter-spacing:.1em;font-size:16px">PULSE DUEL</div>
      <div style="position:absolute;top:36px;left:16px;right:16px;display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center">
        <div style="height:10px;background:#200;border:1px solid #fff3;overflow:hidden"><div style="height:100%;width:${p1w}%;background:linear-gradient(90deg,#6a0012,#ff2040,#ff8a1a)"></div></div>
        <div style="font-size:11px;color:#f0c14b;border:1px solid #f0c14b66;padding:2px 8px;border-radius:99px">R${this.round} · ${this.wins[0]}-${this.wins[1]}</div>
        <div style="height:10px;background:#002;border:1px solid #fff3;overflow:hidden;transform:scaleX(-1)"><div style="height:100%;width:${p2w}%;background:linear-gradient(90deg,#003344,#00e8ff);transform:scaleX(-1)"></div></div>
      </div>
      <div style="position:absolute;top:56px;right:16px;color:#00e8ff;font-size:14px">${Math.ceil(this.roundT)}s · COMBO ${this.p1.combo}</div>
      ${!this.started&&!this.ended?'<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.5)"><div style="text-align:center"><div style="font-size:28px;font-weight:800">PULSE DUEL</div><div style="color:#9a8aa8;margin-top:8px">J punch · K kick · Shift block · ↑ jump · best of 3</div></div></div>':''}`;
  }

  private hit(attacker: F, defender: F, dmg: number): void {
    if(defender.block) dmg*=0.35;
    defender.hp=Math.max(0,defender.hp-dmg); defender.state='hit'; defender.timer=0.25; this.play(defender,'hit');
    audio.hit(); attacker.combo++; this.score+=Math.floor(dmg)*attacker.combo; this.hooks.onScore(this.score);
    this.impact.position.x=(attacker.x+defender.x)/2; (this.impact.material as THREE.MeshBasicMaterial).opacity=0.8;
    this.impact.scale.setScalar(1.2); defender.x+=attacker.facing*0.35;
  }

  private tick(dt: number): void {
    if(!this.started){ if(input.actionJust()||input.pointer.justDown||input.anyDir()){ this.started=true; audio.blip(); this.paint(); } return; }
    if(input.just('escape')||input.just('p')){ this.pause(); this.hooks.onPauseChange?.(true); return; }
    this.roundT-=dt; this.p1.mixer.update(dt); this.p2.mixer.update(dt);
    (this.impact.material as THREE.MeshBasicMaterial).opacity*=0.9;

    // player
    const f=this.p1; f.timer=Math.max(0,f.timer-dt); f.atk=Math.max(0,f.atk-dt);
    if(f.state==='hit'&&f.timer<=0) { f.state='idle'; this.play(f,'idle',true); }
    if(f.state!=='attack'&&f.state!=='hit'){
      f.block=input.pressed('shift')||input.pressed('l');
      if(f.block) this.play(f,'block',true);
      const ax=(input.left()?-1:0)+(input.right()?1:0);
      if(!f.block && ax){ f.x+=ax*dt*3.2; f.facing=ax>0?1:-1; f.root.rotation.y=f.facing>0?0.4:Math.PI-0.4; this.play(f,'walk',true); }
      else if(!f.block) this.play(f,'idle',true);
      if((input.upJust()||input.just(' ')) && f.onGround){ f.vy=6; f.onGround=false; audio.jump(); }
      if(input.just('j')&&f.atk<=0){ f.state='attack'; f.timer=0.28; f.atk=0.35; this.play(f,'punch'); audio.blip(500);
        if(Math.abs(f.x-this.p2.x)<2.2) this.hit(f,this.p2,8+f.combo); }
      if(input.just('k')&&f.atk<=0){ f.state='attack'; f.timer=0.38; f.atk=0.5; this.play(f,'kick'); audio.blip(380);
        if(Math.abs(f.x-this.p2.x)<2.5) this.hit(f,this.p2,12+f.combo*2); }
      if(f.timer<=0&&f.state==='attack'){ f.state='idle'; this.play(f,'idle',true); }
    }
    f.vy-=18*dt; f.root.position.y=Math.max(0,(f.root.position.y||0)+f.vy*dt);
    if(f.root.position.y<=0){ f.root.position.y=0; f.vy=0; f.onGround=true; }
    f.x=THREE.MathUtils.clamp(f.x,-8,8); f.root.position.x=f.x;

    // CPU
    const c=this.p2; c.timer=Math.max(0,c.timer-dt); c.atk=Math.max(0,c.atk-dt);
    if(c.state==='hit'&&c.timer<=0){ c.state='idle'; this.play(c,'idle',true); }
    if(c.state!=='attack'&&c.state!=='hit'){
      const dx=this.p1.x-c.x; c.facing=dx>0?1:-1; c.root.rotation.y=c.facing>0?0.4:Math.PI-0.4;
      if(Math.abs(dx)>2.0){ c.x+=Math.sign(dx)*dt*2.4; this.play(c,'walk',true); }
      else {
        c.block=Math.random()<0.01; 
        if(c.atk<=0 && Math.random()<0.025){ c.state='attack'; c.timer=0.3; c.atk=0.55; this.play(c,'punch');
          if(Math.abs(c.x-this.p1.x)<2.2){ if(this.p1.block) audio.blip(200); else this.hit(c,this.p1,7); this.p1.combo=0; } }
        else if(c.atk<=0 && Math.random()<0.012){ c.state='attack'; c.timer=0.4; c.atk=0.7; this.play(c,'kick');
          if(Math.abs(c.x-this.p1.x)<2.5){ if(!this.p1.block) this.hit(c,this.p1,11); this.p1.combo=0; } }
        else this.play(c,'idle',true);
      }
      if(c.timer<=0&&c.state==='attack'){ c.state='idle'; this.play(c,'idle',true); }
    }
    c.x=THREE.MathUtils.clamp(c.x,-8,8); c.root.position.x=c.x;

    // round end
    if(this.p1.hp<=0||this.p2.hp<=0||this.roundT<=0){
      const p1win=this.p2.hp<this.p1.hp;
      if(p1win) this.wins[0]++; else this.wins[1]++;
      audio.win();
      if(this.wins[0]>=2||this.wins[1]>=2){ this.ended=true; this.hooks.onGameOver(this.score, this.wins[0]>=2); this.paint(); return; }
      this.round++; this.resetRound();
    }
    this.kit.camera.position.x=THREE.MathUtils.lerp(this.kit.camera.position.x, (this.p1.x+this.p2.x)*0.15, 0.05);
    this.kit.camera.lookAt((this.p1.x+this.p2.x)/2,1.2,0);
    this.paint();
  }

  pause(): void { this.paused=true; }
  resume(): void { this.paused=false; this.last=performance.now(); }
  restart(): void { this.ended=false; this.paused=false; this.started=false; this.wins=[0,0]; this.round=1; this.score=0; this.resetRound(); this.hooks.onScore(0); this.paint(); }
  destroy(): void { this.running=false; cancelAnimationFrame(this.raf); window.removeEventListener('resize',this.onResize); input.detach(); this.hud?.remove(); this.kit?.renderer.dispose(); }
  getScore(): number { return this.score; }
}

export const create: GameFactory = (c,h) => new PulseDuelGame(c,h);
