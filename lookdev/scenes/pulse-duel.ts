import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { makeThree, addRimLights, proceduralCanvasTexture } from '../shared/threeSetup';
import { mountFighterHud } from '../shared/hud';
import { PAL } from '../shared/theme';

export async function run() {
  mountFighterHud(72, 48, 'R2');
  const kit = makeThree(0.65, 0.35, 0.28);
  const { scene, camera, composer } = kit;
  scene.background = new THREE.Color(0x09050e);
  scene.fog = new THREE.FogExp2(0x09050e, 0.02);
  addRimLights(scene, 2.0);

  const floorTex = proceduralCanvasTexture(512, (g, s) => {
    g.fillStyle = '#160a12';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(255,32,64,0.7)';
    g.lineWidth = 8;
    g.strokeRect(36, 36, s - 72, s - 72);
    g.strokeStyle = 'rgba(0,232,255,0.4)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(s / 2, s / 2, 100, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(240,193,75,0.45)';
    g.lineWidth = 3;
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(s / 2 + Math.cos(a) * 80, s / 2 + Math.sin(a) * 80);
    }
    g.closePath();
    g.stroke();
  });

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(11, 64),
    new THREE.MeshStandardMaterial({
      map: floorTex,
      color: 0x2a1820,
      metalness: 0.65,
      roughness: 0.28,
      emissive: 0x1a0508,
      emissiveIntensity: 0.55,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(11, 0.14, 8, 64),
    new THREE.MeshBasicMaterial({ color: PAL.blood, toneMapped: false }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.06;
  scene.add(rim);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.55, 7, 10),
      new THREE.MeshStandardMaterial({
        color: 0x1a1018,
        metalness: 0.65,
        roughness: 0.35,
        emissive: i % 2 ? PAL.cyan : PAL.blood,
        emissiveIntensity: 0.45,
      }),
    );
    p.position.set(Math.cos(a) * 10.2, 3.5, Math.sin(a) * 10.2);
    p.castShadow = true;
    scene.add(p);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      new THREE.MeshBasicMaterial({ color: i % 2 ? PAL.cyan : PAL.ember, toneMapped: false }),
    );
    flame.position.set(p.position.x, 7.2, p.position.z);
    scene.add(flame);
  }

  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(16, 16, 12, 32, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x100818,
      side: THREE.BackSide,
      metalness: 0.25,
      roughness: 0.75,
      emissive: 0x280810,
      emissiveIntensity: 0.55,
    }),
  );
  wall.position.y = 4;
  scene.add(wall);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const [maleG, femaleG, anim1, anim2] = await Promise.all([
    loader.loadAsync('/assets/male.glb'),
    loader.loadAsync('/assets/female.glb'),
    loader.loadAsync('/assets/anim1.glb'),
    loader.loadAsync('/assets/anim2.glb'),
  ]);

  const clips = [...anim1.animations, ...anim2.animations];
  const pick = (names: string[]) =>
    clips.find((c) => names.some((n) => c.name.toLowerCase().includes(n.toLowerCase())));

  function makeFighter(src: THREE.Group, tint: number, x: number, face: number) {
    const root = SkeletonUtils.clone(src) as THREE.Group;
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          const sm = mat as THREE.MeshStandardMaterial;
          if (sm?.color) {
            sm.color.lerp(new THREE.Color(tint), 0.2);
            sm.emissive = new THREE.Color(tint);
            sm.emissiveIntensity = 0.18;
            sm.metalness = Math.max(sm.metalness ?? 0, 0.2);
            sm.roughness = Math.min(sm.roughness ?? 1, 0.55);
            sm.needsUpdate = true;
          }
        }
      }
    });
    root.scale.setScalar(1.7);
    root.position.set(x, 0, 0);
    root.rotation.y = face;
    scene.add(root);
    const mixer = new THREE.AnimationMixer(root);
    const idle = pick(['Idle_Loop', 'Sword_Idle', 'Idle_FoldArms']) || clips[0];
    const punch = pick(['Punch_Cross', 'Punch_Jab', 'Melee_Hook']) || clips[Math.min(1, clips.length - 1)];
    if (idle) mixer.clipAction(idle).play();
    return { root, mixer, punch, idle };
  }

  const p1 = makeFighter(maleG.scene as THREE.Group, 0xff2040, -2.2, 0.5);
  const p2 = makeFighter(femaleG.scene as THREE.Group, 0x00e8ff, 2.2, Math.PI - 0.5);

  // log clip names once for debug via window
  (window as unknown as { __CLIPS?: string[] }).__CLIPS = clips.map((c) => c.name);

  const sparkN = 160;
  const sparkPos = new Float32Array(sparkN * 3);
  const sparkCol = new Float32Array(sparkN * 3);
  for (let i = 0; i < sparkN; i++) {
    sparkPos[i * 3] = (Math.random() - 0.5) * 1.6;
    sparkPos[i * 3 + 1] = 0.9 + Math.random() * 1.4;
    sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 1.0;
    const blood = Math.random() > 0.45;
    sparkCol[i * 3] = blood ? 1 : 0.15;
    sparkCol[i * 3 + 1] = blood ? 0.12 : 0.95;
    sparkCol[i * 3 + 2] = blood ? 0.2 : 1;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  scene.add(sparks);

  const impact = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 1.6, 40),
    new THREE.MeshBasicMaterial({
      color: 0xff2040,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  impact.rotation.x = -Math.PI / 2;
  impact.position.y = 0.08;
  scene.add(impact);

  // floor fill light
  const floorLight = new THREE.PointLight(0xff4060, 2.5, 18);
  floorLight.position.set(0, 0.5, 0);
  scene.add(floorLight);

  camera.position.set(0, 2.4, 7.6);
  camera.lookAt(0, 1.15, 0);

  let t0 = performance.now();
  const hitClip = clips.find(c => c.name.includes('Hit_Chest')) || clips.find(c => c.name.includes('Hit_'));
function pickHit() { return hitClip; }
let punched = false;
  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    p1.mixer.update(dt);
    p2.mixer.update(dt);

    const punch = Math.sin(now * 0.007);
    if (punch > 0.7 && !punched && p1.punch) {
      punched = true;
      const a = p1.mixer.clipAction(p1.punch);
      a.reset().setEffectiveWeight(1).fadeIn(0.05).setLoop(THREE.LoopOnce, 1).play();
      const hit = pickHit();
      if (hit) {
        const b = p2.mixer.clipAction(hit);
        b.reset().setLoop(THREE.LoopOnce, 1).play();
      }
    }
    if (punch < 0.1) punched = false;

    p1.root.position.x = -2.2 + Math.max(0, punch) * 0.9;
    p2.root.position.x = 2.2 - Math.max(0, -punch) * 0.5;
    impact.scale.setScalar(1 + Math.max(0, punch) * 1.6);
    (impact.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.max(0, punch) * 0.7;

    const sp = sparkGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < sparkN; i++) {
      sp.array[i * 3] += (Math.random() - 0.5) * 0.12;
      sp.array[i * 3 + 1] += 0.015 + Math.random() * 0.04;
      sp.array[i * 3 + 2] += (Math.random() - 0.5) * 0.08;
      if (sp.array[i * 3 + 1] > 3) {
        sp.array[i * 3] = (Math.random() - 0.5) * 1.2;
        sp.array[i * 3 + 1] = 0.9 + Math.random();
        sp.array[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      }
    }
    sp.needsUpdate = true;
    camera.position.x = Math.sin(now * 0.00035) * 1.0;
    camera.lookAt(0, 1.2, 0);
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
