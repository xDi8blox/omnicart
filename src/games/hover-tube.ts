import type { GameHooks, GameFactory, GameInstance } from '../core/types';
import { input } from '../input/Input';
import { audio } from '../audio/AudioEngine';
import * as THREE from 'three';

class HoverTube implements GameInstance {
  private canvas: HTMLCanvasElement;
  private hooks: GameHooks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private bike!: THREE.Mesh;
  private rings: THREE.Mesh[] = [];
  private obstacles: { mesh: THREE.Mesh; z: number; a: number }[] = [];
  private z = 0;
  private angle = 0;
  private speed = 40;
  private score = 0;
  private running = false;
  private paused = false;
  private ended = false;
  private raf = 0;
  private last = 0;
  private boost = 0;

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks) {
    this.canvas = canvas;
    this.hooks = hooks;
  }

  start(): void {
    const parent = this.canvas.parentElement ?? document.body;
    const rect = parent.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(Math.min(rect.height, w / (16 / 9)));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x050510, 10, 80);
    this.camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 200);
    this.camera.position.set(0, 1.2, 5);
    const light = new THREE.PointLight(0x00f5ff, 2, 100);
    light.position.set(0, 0, 0);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0x222244, 0.6));

    this.rings = [];
    for (let i = 0; i < 40; i++) {
      const geo = new THREE.TorusGeometry(4, 0.08, 8, 48);
      const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? 0x00f5ff : 0xff00aa });
      const m = new THREE.Mesh(geo, mat);
      m.position.z = -i * 4;
      this.scene.add(m);
      this.rings.push(m);
    }
    const bikeGeo = new THREE.ConeGeometry(0.35, 1.2, 6);
    bikeGeo.rotateX(Math.PI / 2);
    this.bike = new THREE.Mesh(bikeGeo, new THREE.MeshStandardMaterial({ color: 0xffe600, emissive: 0x443300 }));
    this.scene.add(this.bike);
    this.obstacles = [];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0x330010 }),
      );
      const a = Math.random() * Math.PI * 2;
      const z = -20 - i * 18;
      m.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, z);
      this.scene.add(m);
      this.obstacles.push({ mesh: m, z, a });
    }
    input.attach(this.canvas);
    audio.ensure();
    this.running = true;
    this.paused = false;
    this.ended = false;
    this.score = 0;
    this.z = 0;
    this.angle = 0;
    this.speed = 40;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      if (!this.paused && !this.ended) this.update(dt);
      this.renderer.render(this.scene, this.camera);
      input.endFrame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    const parent = this.canvas.parentElement ?? document.body;
    const rect = parent.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(Math.min(rect.height, w / (16 / 9)));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private update(dt: number): void {
    if (input.just('escape') || input.just('p')) {
      this.pause();
      this.hooks.onPauseChange?.(true);
    }
    const a = input.axis();
    this.angle += a.x * 2.4 * dt;
    this.boost = input.action() || input.pressed('shift') ? 1 : 0;
    this.speed = 40 + this.boost * 35 + this.z * 0.02;
    this.z += this.speed * dt;
    this.score = Math.floor(this.z);
    this.hooks.onScore(this.score);
    const r = 2.4;
    this.bike.position.set(Math.cos(this.angle) * r, Math.sin(this.angle) * r, 0);
    this.bike.rotation.z = this.angle + Math.PI / 2;
    this.camera.position.set(Math.cos(this.angle) * 0.5, Math.sin(this.angle) * 0.5 + 0.6, 5);
    this.camera.lookAt(this.bike.position.x, this.bike.position.y, -10);
    for (let i = 0; i < this.rings.length; i++) {
      const m = this.rings[i];
      let zz = ((-i * 4 - this.z) % (this.rings.length * 4) + this.rings.length * 4) % (this.rings.length * 4);
      m.position.z = -zz;
    }
    for (const o of this.obstacles) {
      let zz = o.z - this.z;
      while (zz > -5) {
        o.z -= 18 * 12;
        o.a = Math.random() * Math.PI * 2;
        zz = o.z - this.z;
      }
      while (zz < -200) {
        o.z += 18 * 12;
        zz = o.z - this.z;
      }
      o.mesh.position.set(Math.cos(o.a) * 2.6, Math.sin(o.a) * 2.6, zz);
      if (Math.abs(zz) < 1.2 && Math.abs(Math.atan2(Math.sin(this.angle - o.a), Math.cos(this.angle - o.a))) < 0.45) {
        audio.boom();
        this.ended = true;
        audio.lose();
        this.hooks.onGameOver(this.score, false);
      }
    }
  }

  pause(): void {
    this.paused = true;
  }
  resume(): void {
    this.paused = false;
    this.last = performance.now();
  }
  restart(): void {
    this.ended = false;
    this.paused = false;
    this.z = 0;
    this.score = 0;
    this.angle = 0;
    this.hooks.onScore(0);
  }
  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    input.detach();
    this.renderer.dispose();
  }
  getScore(): number {
    return this.score;
  }
}

export const create: GameFactory = (c, h) => new HoverTube(c, h);
