import * as THREE from 'three';
import { makeThree, addRimLights, proceduralCanvasTexture } from '../shared/threeSetup';
import { mountStandardHud } from '../shared/hud';
import { PAL } from '../shared/theme';

export async function run() {
  mountStandardHud({
    title: 'Fluxball',
    tag: 'Demonic Pinball Table',
    stats: [
      { label: 'SCORE', value: '756K', tone: 'gold' },
      { label: 'BALL', value: '2', tone: 'cyan' },
      { label: 'MULT', value: 'x5', tone: 'warn' },
    ],
  });

  const kit = makeThree(0.55, 0.35, 0.3);
  const { scene, camera, composer } = kit;
  scene.background = new THREE.Color(0x040208);
  scene.fog = new THREE.FogExp2(0x040208, 0.02);
  addRimLights(scene, 1.8);

  const tableTex = proceduralCanvasTexture(1024, (g, s) => {
    const bg = g.createLinearGradient(0, 0, 0, s);
    bg.addColorStop(0, '#220814');
    bg.addColorStop(0.5, '#100610');
    bg.addColorStop(1, '#1a0810');
    g.fillStyle = bg;
    g.fillRect(0, 0, s, s);
    // occult circle art
    g.strokeStyle = 'rgba(255,32,64,0.85)';
    g.lineWidth = 10;
    g.beginPath();
    g.arc(s / 2, s * 0.32, 180, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(0,232,255,0.55)';
    g.lineWidth = 5;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(s / 2 + Math.cos(a) * 140, s * 0.32 + Math.sin(a) * 140);
    }
    g.closePath();
    g.stroke();
    // lanes paint
    g.strokeStyle = 'rgba(240,193,75,0.4)';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(120, s * 0.55);
    g.quadraticCurveTo(s / 2, s * 0.45, s - 120, s * 0.55);
    g.stroke();
    g.fillStyle = 'rgba(240,193,75,0.55)';
    g.font = 'bold 72px Cinzel, serif';
    g.textAlign = 'center';
    g.fillText('FLUXBALL', s / 2, s * 0.72);
    g.fillStyle = 'rgba(255,32,64,0.45)';
    g.fillRect(100, s * 0.8, s - 200, 48);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.font = '28px Orbitron, sans-serif';
    g.fillText('RITE OF THE BUMPER', s / 2, s * 0.835);
    // side runes
    for (let i = 0; i < 8; i++) {
      g.strokeStyle = i % 2 ? 'rgba(255,32,64,0.35)' : 'rgba(0,232,255,0.3)';
      g.strokeRect(40 + (i % 2) * (s - 120), 80 + Math.floor(i / 2) * 120, 40, 40);
    }
  });

  const tableGroup = new THREE.Group();
  tableGroup.rotation.x = -0.62;
  scene.add(tableGroup);

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.28, 16),
    new THREE.MeshStandardMaterial({
      map: tableTex,
      color: 0xffffff,
      metalness: 0.4,
      roughness: 0.35,
      emissive: 0x220810,
      emissiveIntensity: 0.7,
    }),
  );
  table.receiveShadow = true;
  tableGroup.add(table);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(8.6, 15.2),
    new THREE.MeshPhysicalMaterial({
      color: 0x88aacc,
      metalness: 0,
      roughness: 0.05,
      transmission: 0.6,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
    }),
  );
  glass.position.y = 1.1;
  tableGroup.add(glass);

  const railMat = new THREE.MeshStandardMaterial({
    color: 0xa8b8c8,
    metalness: 0.95,
    roughness: 0.15,
    emissive: 0x102030,
    emissiveIntensity: 0.4,
  });
  for (const x of [-4.4, 4.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 15.5), railMat);
    rail.position.set(x, 0.45, 0);
    tableGroup.add(rail);
  }
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(9, 0.7, 0.25), railMat);
  topRail.position.set(0, 0.45, -7.7);
  tableGroup.add(topRail);

  // apron lights
  for (let i = 0; i < 18; i++) {
    const c = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshBasicMaterial({ color: i % 2 ? PAL.blood : PAL.cyan, toneMapped: false }),
    );
    c.position.set(-4.15 + (i / 17) * 8.3, 0.55, 7.2);
    tableGroup.add(c);
  }

  const bumpers: THREE.Mesh[] = [];
  const bumperPos = [
    [-1.5, -3.2],
    [1.5, -3.2],
    [0, -4.6],
    [-2.4, -1.2],
    [2.4, -1.2],
    [0, -1.8],
    [-1.8, 0.6],
    [1.8, 0.6],
  ];
  for (const [x, z] of bumperPos) {
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.4, 24),
      new THREE.MeshStandardMaterial({
        color: 0xff3060,
        metalness: 0.45,
        roughness: 0.2,
        emissive: 0xff2040,
        emissiveIntensity: 1.4,
      }),
    );
    b.position.set(x, 0.35, z);
    tableGroup.add(b);
    bumpers.push(b);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.05, 8, 24),
      new THREE.MeshBasicMaterial({ color: PAL.cyan, toneMapped: false }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.55, z);
    tableGroup.add(ring);
  }

  // targets / drop banks
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.35, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0xf0c14b,
        emissive: 0xf0c14b,
        emissiveIntensity: 0.9,
        metalness: 0.5,
        roughness: 0.3,
      }),
    );
    t.position.set(-2 + i * 1, 0.4, -6.2);
    tableGroup.add(t);
  }

  // slingshots
  for (const side of [-1, 1]) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.3, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xff2bd6, emissive: 0xff2bd6, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.3 }),
    );
    s.position.set(side * 2.6, 0.3, 3.8);
    s.rotation.y = side * 0.35;
    tableGroup.add(s);
  }

  function flipper(x: number, side: number) {
    const f = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.25, 0.38),
      new THREE.MeshStandardMaterial({
        color: 0xf0c14b,
        metalness: 0.75,
        roughness: 0.2,
        emissive: 0xf0c14b,
        emissiveIntensity: 0.65,
      }),
    );
    f.position.set(x, 0.35, 5.6);
    f.rotation.y = side * 0.4;
    tableGroup.add(f);
    return f;
  }
  const fl = flipper(-1.45, 1);
  const fr = flipper(1.45, -1);

  // ramps
  const ramp = new THREE.Mesh(
    new THREE.TorusGeometry(2.4, 0.14, 8, 48, Math.PI * 1.15),
    new THREE.MeshStandardMaterial({
      color: 0x00e8ff,
      metalness: 0.85,
      roughness: 0.18,
      emissive: 0x00e8ff,
      emissiveIntensity: 0.85,
    }),
  );
  ramp.position.set(2.5, 1.3, -2.5);
  ramp.rotation.set(1.1, 0.2, 0.5);
  tableGroup.add(ramp);

  const ramp2 = ramp.clone();
  ramp2.position.set(-2.5, 1.3, -2.5);
  ramp2.rotation.set(1.1, -0.2, -0.5);
  tableGroup.add(ramp2);

  // plunger lane
  const plunger = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.8, roughness: 0.3, emissive: 0x00e8ff, emissiveIntensity: 0.25 }),
  );
  plunger.position.set(3.7, 0.25, 2);
  tableGroup.add(plunger);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 24, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.08,
      emissive: 0x666666,
      emissiveIntensity: 0.35,
    }),
  );
  tableGroup.add(ball);

  // trail
  const trailN = 40;
  const trailPos = new Float32Array(trailN * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trail = new THREE.Points(
    trailGeo,
    new THREE.PointsMaterial({
      color: 0x00e8ff,
      size: 0.18,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  tableGroup.add(trail);

  const dome = new THREE.PointLight(0xff2040, 4, 16);
  dome.position.set(0, 4, -2);
  scene.add(dome);
  const dome2 = new THREE.PointLight(0x00e8ff, 3.2, 14);
  dome2.position.set(2, 3.2, 3);
  scene.add(dome2);
  const dome3 = new THREE.PointLight(0xf0c14b, 2, 12);
  dome3.position.set(-2, 3, 4);
  scene.add(dome3);

  camera.position.set(0, 12.5, 9.5);
  camera.lookAt(0, 0.0, -0.8);

  let t0 = performance.now();
  let trailI = 0;
  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    const t = now * 0.001;
    const bx = Math.sin(t * 1.9) * 2.4;
    const bz = Math.cos(t * 1.35) * 4.2;
    ball.position.set(bx, 0.55, bz);
    ball.rotation.x += dt * 10;
    ball.rotation.z += dt * 8;
    trailPos[trailI * 3] = bx;
    trailPos[trailI * 3 + 1] = 0.55;
    trailPos[trailI * 3 + 2] = bz;
    trailI = (trailI + 1) % trailN;
    trailGeo.attributes.position.needsUpdate = true;

    const kick = Math.sin(t * 5) > 0.65;
    fl.rotation.y = 0.4 + (kick ? -0.7 : 0);
    fr.rotation.y = -0.4 + (kick ? 0.7 : 0);
    for (let i = 0; i < bumpers.length; i++) {
      const pulse = 1 + Math.sin(t * 7 + i) * 0.35;
      (bumpers[i].material as THREE.MeshStandardMaterial).emissiveIntensity = pulse * 1.3;
      bumpers[i].scale.setScalar(0.92 + Math.sin(t * 7 + i) * 0.1);
    }
    dome.intensity = 3 + Math.sin(t * 3.5) * 1.5;
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
