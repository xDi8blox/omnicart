import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { PAL, W, H } from './theme';

export type ThreeKit = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  canvas: HTMLCanvasElement;
};

export function makeThree(bloomStrength = 0.85, bloomRadius = 0.45, bloomThresh = 0.2): ThreeKit {
  const canvas = document.getElementById('c') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.bg);
  scene.fog = new THREE.FogExp2(PAL.bg, 0.018);

  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 400);
  camera.position.set(0, 2.2, 8);

  const composer = new EffectComposer(renderer);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), bloomStrength, bloomRadius, bloomThresh);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // lock canvas CSS to 1280x720 for screenshots
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const stage = document.getElementById('stage')!;
  stage.style.width = `${W}px`;
  stage.style.height = `${H}px`;
  stage.style.margin = '0 auto';

  return { renderer, scene, camera, composer, bloom, canvas };
}

export function resizeLocked() {
  /* fixed 1280x720 for lookdev shots */
}

export function proceduralCanvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function addRimLights(scene: THREE.Scene, intensity = 2.2) {
  const a = new THREE.AmbientLight(0x221018, 0.55);
  scene.add(a);
  const key = new THREE.DirectionalLight(0xffe8d8, intensity);
  key.position.set(4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const fill = new THREE.PointLight(0x00e8ff, 1.6, 40);
  fill.position.set(-6, 3, 2);
  scene.add(fill);
  const rim = new THREE.PointLight(0xff2040, 2.2, 50);
  rim.position.set(3, 2, -6);
  scene.add(rim);
  return { key, fill, rim };
}
