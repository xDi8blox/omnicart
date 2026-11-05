import * as THREE from 'three';
import { makeThree, addRimLights, proceduralCanvasTexture } from '../shared/threeSetup';
import { mountStandardHud } from '../shared/hud';
import { PAL } from '../shared/theme';

export async function run() {
  mountStandardHud({
    title: 'Hover Tube',
    tag: 'Anti-Gravity Tunnel Racer',
    stats: [
      { label: 'SPEED', value: '412', tone: 'cyan' as const },
      { label: 'DIST', value: '2.4K', tone: 'gold' },
      { label: 'MULT', value: 'x3.2', tone: 'warn' },
    ],
  });

  const kit = makeThree(1.05, 0.55, 0.15);
  const { scene, camera, composer } = kit;
  scene.fog = new THREE.FogExp2(0x06020a, 0.022);
  scene.background = new THREE.Color(0x06020a);
  addRimLights(scene, 1.4);

  const wallTex = proceduralCanvasTexture(512, (g, s) => {
    g.fillStyle = '#120816';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 18; i++) {
      g.strokeStyle = i % 2 ? 'rgba(0,232,255,0.35)' : 'rgba(255,32,64,0.4)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, (i / 18) * s);
      g.lineTo(s, (i / 18) * s);
      g.stroke();
    }
    for (let i = 0; i < 12; i++) {
      g.strokeStyle = 'rgba(255,140,40,0.25)';
      g.beginPath();
      g.moveTo((i / 12) * s, 0);
      g.lineTo((i / 12) * s, s);
      g.stroke();
    }
    const rg = g.createRadialGradient(s / 2, s / 2, 40, s / 2, s / 2, s / 2);
    rg.addColorStop(0, 'rgba(255,32,64,0.15)');
    rg.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = rg;
    g.fillRect(0, 0, s, s);
  });
  wallTex.repeat.set(2, 8);

  // reflective tunnel segments
  const tunnel = new THREE.Group();
  scene.add(tunnel);
  for (let i = 0; i < 48; i++) {
    const geo = new THREE.CylinderGeometry(5.2, 5.2, 4, 32, 1, true);
    const mat = new THREE.MeshStandardMaterial({
      color: i % 3 === 0 ? 0x1a1024 : 0x100818,
      metalness: 0.85,
      roughness: 0.22,
      side: THREE.BackSide,
      map: wallTex,
      emissive: i % 2 ? 0x001018 : 0x180008,
      emissiveIntensity: 0.55,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = Math.PI / 2;
    m.position.z = -i * 4;
    tunnel.add(m);

    // neon ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(5.15, 0.06, 8, 64),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? PAL.cyan : PAL.blood,
        transparent: true,
        opacity: 0.95,
        toneMapped: false,
      }),
    );
    ring.position.z = -i * 4;
    tunnel.add(ring);
  }

  // bike body
  const bike = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xffcc33,
    metalness: 0.7,
    roughness: 0.25,
    emissive: 0x442200,
    emissiveIntensity: 0.6,
  });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.1, 6, 12), bodyMat);
  hull.rotation.z = Math.PI / 2;
  bike.add(hull);
  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: 0xff2040, metalness: 0.6, roughness: 0.3, emissive: 0xff2040, emissiveIntensity: 0.8 }),
  );
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 0.85;
  bike.add(nose);
  // thruster glow
  const thrust = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x00e8ff, toneMapped: false }),
  );
  thrust.position.x = -0.75;
  bike.add(thrust);
  const wingGeo = new THREE.BoxGeometry(0.15, 0.08, 0.9);
  const wingL = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: 0x00e8ff, emissive: 0x00e8ff, emissiveIntensity: 1.2, metalness: 0.4, roughness: 0.3 }));
  wingL.position.set(0, 0, 0.55);
  const wingR = wingL.clone();
  wingR.position.z = -0.55;
  bike.add(wingL, wingR);
  bike.position.set(0, -2.4, 2);
  scene.add(bike);

  // speed lines (points)
  const lineCount = 400;
  const linePos = new Float32Array(lineCount * 3);
  for (let i = 0; i < lineCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.5 + Math.random() * 3.5;
    linePos[i * 3] = Math.cos(a) * r;
    linePos[i * 3 + 1] = Math.sin(a) * r;
    linePos[i * 3 + 2] = -Math.random() * 120;
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lines = new THREE.Points(
    lineGeo,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(lines);

  // obstacles
  const obs: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({
        color: 0xff2040,
        metalness: 0.5,
        roughness: 0.25,
        emissive: 0xff2040,
        emissiveIntensity: 1.4,
      }),
    );
    const a = (i / 10) * Math.PI * 2;
    m.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6 - 0.2, -18 - i * 11);
    scene.add(m);
    obs.push(m);
  }

  camera.position.set(0, 0.4, 7.5);
  camera.lookAt(0, -0.6, -10);

  let t0 = performance.now();
  let z = 0;
  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    z += dt * 48;
    const angle = Math.sin(now * 0.0012) * 0.55;
    bike.position.x = Math.sin(angle) * 2.1;
    bike.position.y = -Math.cos(angle) * 2.1;
    bike.rotation.z = -angle;
    bike.rotation.x = Math.sin(now * 0.008) * 0.08;
    thrust.scale.setScalar(0.9 + Math.sin(now * 0.03) * 0.25);

    for (const m of tunnel.children) {
      m.position.z += dt * 48;
      if (m.position.z > 8) m.position.z -= 48 * 4;
    }
    const pos = lineGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < lineCount; i++) {
      pos.array[i * 3 + 2] += dt * 90;
      if (pos.array[i * 3 + 2] > 8) pos.array[i * 3 + 2] -= 130;
    }
    pos.needsUpdate = true;
    for (const o of obs) {
      o.position.z += dt * 48;
      o.rotation.x += dt * 2;
      o.rotation.y += dt * 1.4;
      if (o.position.z > 6) o.position.z -= 120;
    }
    camera.position.x = bike.position.x * 0.35;
    camera.position.y = bike.position.y * 0.25 + 0.5;
    camera.lookAt(bike.position.x * 0.5, bike.position.y * 0.4, bike.position.z - 12);
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
