import type { GameFactory, GameHooks, GameInstance } from '../core/types';
import * as THREE from 'three';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import { attachThree, resizeThree } from '../shared/threeKit';
import { fitParent } from '../core/canvas';
import { isMobile } from '../shared/fx';

class HoverTubeGame implements GameInstance {
  private canvas: HTMLCanvasElement;
  private hooks: GameHooks;
  private kit!: ReturnType<typeof attachThree>;
  private bike!: THREE.Group;
  private thrust!: THREE.Mesh;
  private obstacles: { mesh: THREE.Mesh; a: number }[] = [];
  private tunnel!: THREE.Group;
  private lineGeo!: THREE.BufferGeometry;
  private lineCount = 280;
  private angle = Math.PI * 1.5;
  private speed = 42;
  private nitro = 1;
  private score = 0;
  private dist = 0;
  private running = false;
  private paused = false;
  private ended = false;
  private started = false;
  private raf = 0;
  private last = 0;
  private w = 800;
  private h = 450;
  private hud!: HTMLDivElement;
  private onResize = () => this.layout();

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks) {
    this.canvas = canvas;
    this.hooks = hooks;
  }

  private layout(): void {
    const parent = this.canvas.parentElement ?? document.body;
    const { w, h } = fitParent(this.canvas, parent, 16 / 9, { setup2d: false, dprCap: 1.75 });
    this.w = w; this.h = h;
    this.canvas.dataset.cssW = String(w);
    this.canvas.dataset.cssH = String(h);
    if (this.kit) resizeThree(this.kit, w, h);
  }

  start(): void {
    this.layout();
    window.addEventListener('resize', this.onResize);
    input.attach(this.canvas);
    audio.ensure();
    this.kit = attachThree(this.canvas, this.w, this.h, 1.0);
    const { scene, camera } = this.kit;
    scene.fog = new THREE.FogExp2(0x06020a, 0.022);
    scene.background = new THREE.Color(0x06020a);
    scene.add(new THREE.AmbientLight(0x221018, 0.55));
    const fill = new THREE.PointLight(0x00e8ff, 1.6, 40); fill.position.set(-4, 2, 2); scene.add(fill);
    const rim = new THREE.PointLight(0xff2040, 2.2, 50); rim.position.set(3, 1, -4); scene.add(rim);

    this.tunnel = new THREE.Group(); scene.add(this.tunnel);
    for (let i = 0; i < 40; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: i % 3 === 0 ? 0x1a1024 : 0x100818, metalness: 0.85, roughness: 0.25,
        side: THREE.BackSide, emissive: i % 2 ? 0x001018 : 0x180008, emissiveIntensity: 0.5,
      });
      const m = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.2, 4, isMobile() ? 24 : 32, 1, true), mat);
      m.rotation.x = Math.PI / 2; m.position.z = -i * 4; this.tunnel.add(m);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.15, 0.06, 8, 48),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x00e8ff : 0xff2040, toneMapped: false }));
      ring.position.z = -i * 4; this.tunnel.add(ring);
    }

    this.bike = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.1, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0xffcc33, metalness: 0.7, roughness: 0.25, emissive: 0x442200, emissiveIntensity: 0.6 }));
    body.rotation.z = Math.PI / 2; this.bike.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0xff2040, metalness: 0.6, roughness: 0.3, emissive: 0xff2040, emissiveIntensity: 0.8 }));
    nose.rotation.z = -Math.PI / 2; nose.position.x = 0.85; this.bike.add(nose);
    this.thrust = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), new THREE.MeshBasicMaterial({ color: 0x00e8ff, toneMapped: false }));
    this.thrust.position.x = -0.75; this.bike.add(this.thrust);
    scene.add(this.bike);

    const linePos = new Float32Array(this.lineCount * 3);
    for (let i = 0; i < this.lineCount; i++) {
      const a = Math.random() * Math.PI * 2; const r = 1.5 + Math.random() * 3.5;
      linePos[i * 3] = Math.cos(a) * r; linePos[i * 3 + 1] = Math.sin(a) * r; linePos[i * 3 + 2] = -Math.random() * 120;
    }
    this.lineGeo = new THREE.BufferGeometry();
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    scene.add(new THREE.Points(this.lineGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.08, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false,
    })));

    this.obstacles = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), new THREE.MeshStandardMaterial({
        color: 0xff2040, metalness: 0.5, roughness: 0.25, emissive: 0xff2040, emissiveIntensity: 1.3,
      }));
      const a = Math.random() * Math.PI * 2;
      m.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, -20 - i * 16);
      scene.add(m); this.obstacles.push({ mesh: m, a });
    }

    camera.position.set(0, 0.4, 7.5);
    this.hud = document.createElement('div');
    this.hud.style.cssText = 'position:absolute;inset:0;pointer-events:none;font-family:Orbitron,sans-serif;color:#fff';
    this.canvas.parentElement!.style.position = 'relative';
    this.canvas.parentElement!.appendChild(this.hud);
    this.paintHud();

    this.running = true; this.paused = false; this.ended = false; this.started = false;
    this.score = 0; this.dist = 0; this.speed = 42; this.nitro = 1; this.angle = Math.PI * 1.5;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
      if (!this.paused && !this.ended) this.tick(dt);
      this.kit.composer.render();
      input.endFrame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private paintHud(): void {
    this.hud.innerHTML = `
      <div style="position:absolute;top:10px;left:14px;color:#ff2040;font-size:11px;font-weight:700">OMNICART</div>
      <div style="position:absolute;top:10px;left:0;right:0;text-align:center;font-weight:800;letter-spacing:.12em;font-size:16px">HOVER TUBE</div>
      <div style="position:absolute;top:8px;right:14px;text-align:right;font-size:13px;line-height:1.35">
        <div style="color:#00e8ff">SPD ${Math.floor(this.speed * (this.nitro > 1 ? 1.4 : 1))}</div>
        <div style="color:#f0c14b">DIST ${Math.floor(this.dist)}</div>
        <div style="color:#ff2040">SCR ${this.score}</div>
      </div>
      ${!this.started && !this.ended ? '<div style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.45)"><div style="text-align:center"><div style="font-size:28px;font-weight:800">HOVER TUBE</div><div style="color:#9a8aa8;margin-top:8px">Steer · hold nitro · dodge shards</div></div></div>' : ''}
    `;
  }

  private tick(dt: number): void {
    if (!this.started) {
      if (input.actionJust() || input.pointer.justDown || input.anyDir()) { this.started = true; audio.blip(); this.paintHud(); }
      return;
    }
    if (input.just('escape') || input.just('p')) { this.pause(); this.hooks.onPauseChange?.(true); return; }
    const steer = (input.left() ? 1 : 0) + (input.right() ? -1 : 0);
    if (input.pointer.down) {
      const dx = (input.pointer.x / this.w - 0.5) * 2;
      this.angle += dx * dt * 2.2;
    }
    this.angle += steer * dt * 2.4;
    const boosting = input.action() || input.pressed('shift');
    this.nitro = boosting && this.nitro > 0.05 ? 1.55 : 1;
    if (boosting) this.nitro = Math.max(0.05, this.nitro); // cosmetic
    this.speed = Math.min(95, this.speed + dt * 1.8);
    const spd = this.speed * (boosting ? 1.45 : 1);
    this.dist += spd * dt;
    this.score = Math.floor(this.dist) + Math.floor(this.dist / 100) * 50;
    this.hooks.onScore(this.score);

    const r = 2.15;
    this.bike.position.set(Math.cos(this.angle) * r, Math.sin(this.angle) * r, 2);
    this.bike.rotation.z = this.angle + Math.PI / 2;
    this.thrust.scale.setScalar(boosting ? 1.35 : 0.95 + Math.sin(performance.now() * 0.03) * 0.15);

    for (const m of this.tunnel.children) {
      m.position.z += spd * dt;
      if (m.position.z > 8) m.position.z -= 160;
    }
    const pos = this.lineGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.lineCount; i++) {
      pos.array[i * 3 + 2] += spd * dt * 1.8;
      if (pos.array[i * 3 + 2] > 8) pos.array[i * 3 + 2] -= 130;
    }
    pos.needsUpdate = true;

    for (const o of this.obstacles) {
      o.mesh.position.z += spd * dt;
      o.mesh.rotation.x += dt * 2; o.mesh.rotation.y += dt * 1.4;
      if (o.mesh.position.z > 6) {
        o.a = Math.random() * Math.PI * 2;
        o.mesh.position.set(Math.cos(o.a) * 2.6, Math.sin(o.a) * 2.6, -80 - Math.random() * 40);
      }
      const dx = o.mesh.position.x - this.bike.position.x;
      const dy = o.mesh.position.y - this.bike.position.y;
      const dz = o.mesh.position.z - this.bike.position.z;
      if (Math.hypot(dx, dy, dz) < 1.1) {
        audio.boom(); this.ended = true; this.hooks.onGameOver(this.score, false); this.paintHud(); return;
      }
    }
    this.kit.camera.position.x = this.bike.position.x * 0.35;
    this.kit.camera.position.y = this.bike.position.y * 0.25 + 0.5;
    this.kit.camera.lookAt(this.bike.position.x * 0.5, this.bike.position.y * 0.4, this.bike.position.z - 12);
    this.paintHud();
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; this.last = performance.now(); }
  restart(): void {
    this.ended = false; this.paused = false; this.started = false; this.score = 0; this.dist = 0;
    this.speed = 42; this.angle = Math.PI * 1.5; this.hooks.onScore(0); this.paintHud();
  }
  destroy(): void {
    this.running = false; cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize); input.detach();
    this.hud?.remove(); this.kit?.renderer.dispose();
  }
  getScore(): number { return this.score; }
}

export const create: GameFactory = (c, h) => new HoverTubeGame(c, h);
