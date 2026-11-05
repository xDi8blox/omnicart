import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { isMobile, maxDpr } from './fx';

export function attachThree(canvas: HTMLCanvasElement, w: number, h: number, bloom = 0.8) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile(), powerPreference: 'high-performance' });
  renderer.setPixelRatio(maxDpr(1.75));
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050308);
  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 400);

  const strength = isMobile() ? bloom * 0.55 : bloom;
  const composer = new EffectComposer(renderer);
  composer.setSize(w, h);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), strength, 0.45, 0.2);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  return { renderer, scene, camera, composer, bloomPass };
}

export function resizeThree(
  kit: ReturnType<typeof attachThree>,
  w: number,
  h: number,
): void {
  kit.renderer.setPixelRatio(maxDpr(1.75));
  kit.renderer.setSize(w, h, false);
  kit.camera.aspect = w / h;
  kit.camera.updateProjectionMatrix();
  kit.composer.setSize(w, h);
}
