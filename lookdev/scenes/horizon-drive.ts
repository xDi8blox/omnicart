import * as THREE from 'three';
import { makeThree, addRimLights, proceduralCanvasTexture } from '../shared/threeSetup';
import { mountStandardHud } from '../shared/hud';
import { PAL } from '../shared/theme';

export async function run() {
  mountStandardHud({
    title: 'Horizon Drive',
    tag: 'Night Highway Racer',
    stats: [
      { label: 'KM/H', value: '286', tone: 'cyan' as const },
      { label: 'LAP', value: '02', tone: 'gold' },
      { label: 'NITRO', value: '74%', tone: 'warn' },
    ],
  });

  const kit = makeThree(0.95, 0.5, 0.18);
  const { scene, camera, composer } = kit;
  scene.background = new THREE.Color(0x04020a);
  scene.fog = new THREE.Fog(0x04020a, 25, 140);
  addRimLights(scene, 1.1);

  // wet road
  const roadTex = proceduralCanvasTexture(512, (g, s) => {
    g.fillStyle = '#0a0a10';
    g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let y = 0; y < s; y += 64) {
      g.fillRect(s / 2 - 6, y + 10, 12, 36);
    }
    g.fillStyle = 'rgba(255,180,40,0.5)';
    g.fillRect(20, 0, 8, s);
    g.fillRect(s - 28, 0, 8, s);
    for (let i = 0; i < 80; i++) {
      g.fillStyle = `rgba(200,220,255,${Math.random() * 0.08})`;
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  });
  roadTex.repeat.set(1, 40);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 400),
    new THREE.MeshStandardMaterial({
      map: roadTex,
      color: 0x2a2a38,
      metalness: 0.98,
      roughness: 0.08,
      envMapIntensity: 1.6,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = -160;
  road.receiveShadow = true;
  scene.add(road);

  // roadside glow strips
  for (const side of [-7.2, 7.2]) {
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.08, 400),
      new THREE.MeshBasicMaterial({ color: side < 0 ? PAL.blood : PAL.cyan, toneMapped: false }),
    );
    strip.position.set(side, 0.05, -160);
    scene.add(strip);
  }

  // city buildings
  const city = new THREE.Group();
  scene.add(city);
  for (let i = 0; i < 60; i++) {
    const h = 6 + Math.random() * 28;
    const w = 2 + Math.random() * 4;
    const d = 2 + Math.random() * 4;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x101018,
      metalness: 0.4,
      roughness: 0.55,
      emissive: Math.random() > 0.5 ? 0xff2040 : 0x00a0ff,
      emissiveIntensity: 0.15 + Math.random() * 0.35,
    });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    const side = Math.random() > 0.5 ? 1 : -1;
    b.position.set(side * (10 + Math.random() * 18), h / 2, -Math.random() * 320);
    city.add(b);
    // window glow plane
    const win = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.85, h * 0.8),
      new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xff6644 : 0x66ddff,
        transparent: true,
        opacity: 0.25,
        toneMapped: false,
      }),
    );
    win.position.copy(b.position);
    win.position.x -= side * (w / 2 + 0.02);
    win.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    city.add(win);
  }


  // street lamps
  for (let i = 0; i < 24; i++) {
    for (const side of [-8.5, 8.5]) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.12, 5, 6),
        new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.6, roughness: 0.4 }),
      );
      pole.position.set(side, 2.5, -i * 14);
      city.add(pole);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe2a8, toneMapped: false }),
      );
      lamp.position.set(side - Math.sign(side) * 0.4, 5.1, -i * 14);
      city.add(lamp);
      const pl = new THREE.PointLight(0xffd8a0, 1.2, 16);
      pl.position.copy(lamp.position);
      city.add(pl);
    }
  }

  // car — low poly but shaped
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff2040, metalness: 0.82, roughness: 0.22, emissive: 0x500018, emissiveIntensity: 0.55 });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 3.4), bodyMat);
  chassis.position.y = 0.42;
  chassis.castShadow = true;
  car.add(chassis);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 1.1), bodyMat);
  hood.position.set(0, 0.62, 0.85);
  hood.rotation.x = -0.12;
  car.add(hood);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.42, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x061018, metalness: 0.95, roughness: 0.08, emissive: 0x003040, emissiveIntensity: 0.55, transparent: true, opacity: 0.92 }),
  );
  cabin.position.set(0, 0.88, -0.2);
  car.add(cabin);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.35), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.3, emissive: 0xff2040, emissiveIntensity: 0.4 }));
  spoiler.position.set(0, 0.95, -1.45);
  car.add(spoiler);
  const under = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 2.8), new THREE.MeshBasicMaterial({ color: 0xff2040, toneMapped: false }));
  under.position.set(0, 0.12, 0);
  car.add(under);
  for (const x of [-0.55, 0.55]) {
    for (const z of [-1.05, 1.05]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.22, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 }),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.28, z);
      car.add(wheel);
    }
  }
  // headlights
  for (const x of [-0.45, 0.45]) {
    const hl = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff0c0, toneMapped: false }),
    );
    hl.position.set(x, 0.45, 1.6);
    car.add(hl);
    const light = new THREE.SpotLight(0xffe8aa, 4, 40, 0.35, 0.4);
    light.position.set(x, 0.5, 1.7);
    light.target.position.set(x, 0, 20);
    car.add(light);
    car.add(light.target);
  }
  // taillights
  for (const x of [-0.5, 0.5]) {
    const tl = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.1, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff1040, toneMapped: false }),
    );
    tl.position.set(x, 0.5, -1.62);
    car.add(tl);
  }
  car.position.set(0, 0, 2);
  scene.add(car);

  // traffic cars
  const traffic: THREE.Object3D[] = [];
  const tCols = [0x00e8ff, 0xf0c14b, 0xff2bd6, 0x4488ff, 0xffffff];
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group();
    const col = tCols[i % tCols.length];
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.4, 2.6),
      new THREE.MeshStandardMaterial({ color: col, metalness: 0.7, roughness: 0.28, emissive: col, emissiveIntensity: 0.2 }),
    );
    body.position.y = 0.4;
    g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.32, 1.1), new THREE.MeshStandardMaterial({ color: 0x0a1018, metalness: 0.9, roughness: 0.15 }));
    cab.position.set(0, 0.72, -0.15);
    g.add(cab);
    for (const x of [-0.4, 0.4]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: 0xff2040, toneMapped: false }));
      tl.position.set(x, 0.45, -1.32);
      g.add(tl);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfff0c0, toneMapped: false }));
      hl.position.set(x, 0.4, 1.3);
      g.add(hl);
    }
    g.position.set((i % 2 ? 1 : -1) * (1.8 + (i % 3) * 0.8), 0, -18 - i * 16);
    scene.add(g);
    traffic.push(g);
  }

  // rain streaks
  const rainN = 600;
  const rainPos = new Float32Array(rainN * 3);
  for (let i = 0; i < rainN; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 30;
    rainPos[i * 3 + 1] = Math.random() * 20;
    rainPos[i * 3 + 2] = -Math.random() * 80;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({ color: 0x88aacc, size: 0.05, transparent: true, opacity: 0.55 }),
  );
  scene.add(rain);

  camera.position.set(0, 2.8, 8.5);
  camera.lookAt(0, 0.6, -10);

  let t0 = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - t0) / 1000);
    t0 = now;
    const steer = Math.sin(now * 0.0007) * 2.2;
    car.position.x = THREE.MathUtils.lerp(car.position.x, steer, 0.04);
    car.rotation.y = -car.position.x * 0.04;
    car.rotation.z = -car.position.x * 0.03;
    road.position.z += dt * 55;
    if (road.position.z > 40) road.position.z -= 40;
    (road.material as THREE.MeshStandardMaterial).map!.offset.y -= dt * 2.4;
    city.children.forEach((b) => {
      b.position.z += dt * 55;
      if (b.position.z > 20) b.position.z -= 340;
    });
    for (const t of traffic) {
      t.position.z += dt * (40 + (t.position.x > 0 ? 10 : 5));
      if (t.position.z > 15) {
        t.position.z -= 160;
        t.position.x = (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 3);
      }
    }
    const rp = rainGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < rainN; i++) {
      rp.array[i * 3 + 1] -= dt * 28;
      rp.array[i * 3 + 2] += dt * 40;
      if (rp.array[i * 3 + 1] < 0) {
        rp.array[i * 3 + 1] = 18;
        rp.array[i * 3 + 2] = -Math.random() * 80;
      }
    }
    rp.needsUpdate = true;
    camera.position.x = car.position.x * 0.45;
    camera.lookAt(car.position.x, 0.8, car.position.z - 12);
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
