import * as THREE from 'three';
import { rng } from '../engine/random.ts';
import { toon } from './materials.ts';
import { buildPterosaur } from './creatures.ts';
import { buildHuman, type HumanRig } from './humans.ts';
import { buildMachine, type MachineMode, type MachineRig } from './machines.ts';
import { box, cone, cylinder, type Rig } from './primitives.ts';

/*
 * Small hand-built 3D "sets" for cinematics and menus.
 */

function lights(scene: THREE.Scene, sky: string, ground: string, sunColor: string, sunIntensity: number): THREE.DirectionalLight {
  scene.add(new THREE.HemisphereLight(sky, ground, 1.5));
  const sun = new THREE.DirectionalLight(sunColor, sunIntensity);
  sun.position.set(4, 9, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const cam = sun.shadow.camera;
  cam.left = -8;
  cam.right = 8;
  cam.top = 8;
  cam.bottom = -8;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  return sun;
}

function ground(scene: THREE.Scene, color: string, size = 40): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, 0.2, size).translate(0, -0.1, 0), toon(color));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

export interface CinematicSet {
  scene: THREE.Scene;
  andrew: HumanRig;
  machine: MachineRig;
  update(time: number, dt: number): void;
  setMachine(mode: MachineMode): void;
}

// ---------------------------------------------------------------------------
// The lab at the Chronos Institute

export function buildLabSet(): CinematicSet & { alarm: (on: boolean) => void } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#141a28');
  lights(scene, '#cfe0ff', '#202838', '#e8f0ff', 1.6);
  ground(scene, '#2a3142');
  // Floor tiles
  for (let x = -6; x <= 6; x++) {
    for (let z = -3; z <= 4; z++) {
      if ((x + z) % 2 === 0) scene.add(box(1, 0.01, 1, '#323a4e', x, 0.005, z, { shadow: false }));
    }
  }
  // Back wall with panels
  scene.add(box(16, 5, 0.4, '#1c2333', 0, 2.5, -3.6));
  for (let x = -6; x <= 6; x += 2) scene.add(box(0.1, 5, 0.1, '#2d3850', x, 2.5, -3.35));
  scene.add(box(3.2, 0.5, 0.1, '#0f1420', -0.5, 3.6, -3.35));
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.22, 0.05), new THREE.MeshBasicMaterial({ color: '#7fd8ff' }));
  sign.position.set(-0.5, 3.6, -3.28);
  scene.add(sign);

  // Consoles with glowing monitors
  const screens: THREE.MeshBasicMaterial[] = [];
  for (const x of [-4.5, -2.8]) {
    scene.add(box(1.4, 1, 0.8, '#3a4258', x, 0.5, -2.4, { outline: true }));
    scene.add(box(1.4, 0.1, 0.9, '#4a5470', x, 1.05, -2.35));
    const screenMaterial = new THREE.MeshBasicMaterial({ color: '#5aff8a' });
    screens.push(screenMaterial);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 0.05), screenMaterial);
    screen.position.set(x, 1.6, -2.7);
    screen.rotation.x = -0.15;
    scene.add(screen);
    scene.add(box(1.1, 0.7, 0.08, '#1a1d26', x, 1.6, -2.76));
  }
  // Cables to the pod
  for (let i = 0; i < 3; i++) scene.add(box(4, 0.06, 0.08, '#151a26', 0, 0.03, -1.6 + i * 0.25, { shadow: false }));

  const machine = buildMachine();
  machine.root.position.set(2.2, 0, -1.2);
  machine.root.scale.setScalar(1.3);
  scene.add(machine.root);

  const andrew = buildHuman('andrew');
  andrew.root.position.set(-2.2, 0, -0.6);
  scene.add(andrew.root);

  const alarmLight = new THREE.PointLight('#ff2020', 0, 14, 1);
  alarmLight.position.set(0, 4, 1);
  scene.add(alarmLight);
  let alarmOn = false;
  let mode: MachineMode = 'idle';

  return {
    scene,
    andrew,
    machine,
    setMachine: (m) => (mode = m),
    alarm: (on) => (alarmOn = on),
    update(time) {
      machine.update(time, mode);
      alarmLight.intensity = alarmOn ? 30 * (0.5 + 0.5 * Math.sin(time * 10)) : 0;
      for (const s of screens) s.color.set(alarmOn ? (Math.floor(time * 6) % 2 ? '#ff3b3b' : '#7a1a1a') : '#5aff8a');
    },
  };
}

// ---------------------------------------------------------------------------
// The jungle Andrew wakes up in

export function buildJungleSet(): CinematicSet & { flyers: Rig[] } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f3cf96');
  scene.fog = new THREE.Fog('#f3cf96', 10, 34);
  lights(scene, '#fff1d6', '#5a7a3a', '#fff0d0', 2.4);
  ground(scene, '#6aa83e', 60);
  const random = rng(11);

  // Giant ferns and conifers
  const fern = (x: number, z: number, scale: number): void => {
    const g = new THREE.Group();
    for (let i = 0; i < 9; i++) {
      const frond = box(0.25, 0.04, 1.6, i % 2 ? '#3f8f3a' : '#2f7a2a');
      frond.geometry.translate(0, 0, 0.8);
      frond.position.set(0, 0.4, 0);
      frond.rotation.set(-0.5, (i / 9) * Math.PI * 2, 0);
      g.add(frond);
    }
    g.position.set(x, 0, z);
    g.scale.setScalar(scale);
    scene.add(g);
  };
  const conifer = (x: number, z: number, h: number): void => {
    scene.add(cylinder(0.2, 0.3, h, '#6b4423', x, h / 2, z, { outline: true }));
    scene.add(cone(1.2, 2.2, '#2e6a2a', x, h + 0.6, z, { outline: true }, 7));
    scene.add(cone(0.9, 1.8, '#3a7a32', x, h + 1.6, z, { outline: true }, 7));
  };
  for (let i = 0; i < 26; i++) {
    const a = random() * Math.PI * 2;
    const d = 6 + random() * 14;
    if (random() < 0.5) fern(Math.cos(a) * d, Math.sin(a) * d - 4, 1 + random() * 1.4);
    else conifer(Math.cos(a) * d, Math.sin(a) * d - 6, 2 + random() * 2.5);
  }
  fern(-3.5, 2.5, 1.8);
  fern(4.2, 2.2, 2.0);

  // Distant volcano
  scene.add(cone(7, 7, '#8a6a6a', 6, 3.5, -26, {}, 9));
  scene.add(cone(2.2, 1, '#5a4040', 6, 7.2, -26, {}, 9));
  const smoke: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshToonMaterial({ color: '#8a8080', transparent: true, opacity: 0.6 }));
    scene.add(puff);
    smoke.push(puff);
  }

  const machine = buildMachine();
  machine.root.position.set(1.3, 0, -0.8);
  machine.root.rotation.z = 0.12;
  machine.root.scale.setScalar(1.3);
  scene.add(machine.root);
  const machineSmoke: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), new THREE.MeshToonMaterial({ color: '#a8adb5', transparent: true, opacity: 0.7 }));
    scene.add(puff);
    machineSmoke.push(puff);
  }

  const andrew = buildHuman('andrew');
  andrew.root.position.set(-0.8, 0, 0.2);
  scene.add(andrew.root);

  const flyers: Rig[] = [];
  for (let i = 0; i < 3; i++) {
    const flyer = buildPterosaur();
    flyer.root.position.set(-30 - i * 4, 7 + i, -10 - i * 2);
    flyer.root.rotation.y = Math.PI / 2;
    scene.add(flyer.root);
    flyers.push(flyer);
  }

  let mode: MachineMode = 'broken';
  return {
    scene,
    andrew,
    machine,
    flyers,
    setMachine: (m) => (mode = m),
    update(time) {
      machine.update(time, mode);
      smoke.forEach((puff, i) => {
        const t = (time * 0.15 + i / smoke.length) % 1;
        puff.position.set(6 + Math.sin(t * 6 + i) * 0.6, 8 + t * 8, -26);
        puff.scale.setScalar(1 + t * 2.5);
      });
      machineSmoke.forEach((puff, i) => {
        const t = (time * 0.4 + i / machineSmoke.length) % 1;
        puff.position.set(1.3 + Math.sin(t * 4 + i) * 0.3, 1.6 + t * 2.5, -0.8);
        puff.scale.setScalar(0.6 + t * 1.6);
        (puff.material as THREE.MeshToonMaterial).opacity = 0.7 * (1 - t);
      });
      for (const flyer of flyers) flyer.animate(time, 1);
    },
  };
}

// ---------------------------------------------------------------------------
// Title screen backdrop

export function buildTitleSet(): { scene: THREE.Scene; update(time: number): void } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b0b1f');
  lights(scene, '#9ab0ff', '#1d1235', '#ffffff', 1.4);
  const machine = buildMachine();
  scene.add(machine.root);
  const platform = cylinder(1.4, 1.6, 0.3, '#2a2a48', 0, -0.15, 0, {}, 16);
  scene.add(platform);

  // A ring of clock ticks around the machine
  const ticks = new THREE.Group();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const major = i % 5 === 0;
    const tick = new THREE.Mesh(
      new THREE.BoxGeometry(major ? 0.1 : 0.05, 0.05, major ? 0.4 : 0.2),
      new THREE.MeshBasicMaterial({ color: major ? '#f1c232' : '#5a7ab0' }),
    );
    tick.position.set(Math.cos(a) * 2.6, 0.02, Math.sin(a) * 2.6);
    tick.rotation.y = -a + Math.PI / 2;
    ticks.add(tick);
  }
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 2.2).translate(0, 0, 1.1), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  ticks.add(hand);
  scene.add(ticks);

  const random = rng(5);
  const starPositions = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const a = random() * Math.PI * 2;
    const r = 12 + random() * 30;
    starPositions.set([Math.cos(a) * r, random() * 30 - 8, Math.sin(a) * r], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#9a9ad8', size: 0.12 }));
  scene.add(stars);

  return {
    scene,
    update(time) {
      machine.update(time, 'active');
      machine.root.rotation.y = time * 0.4;
      ticks.rotation.y = -time * 0.1;
      hand.rotation.y = -time * 1.2;
      stars.rotation.y = time * 0.01;
    },
  };
}

// ---------------------------------------------------------------------------
// The time tunnel shown while traveling

export function buildTunnelSet(): { scene: THREE.Scene; update(time: number, speed: number): void } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05030c');
  scene.add(new THREE.HemisphereLight('#7fd8ff', '#ff6bd6', 2));
  const machine = buildMachine();
  machine.root.position.set(0, -0.9, -5);
  scene.add(machine.root);

  const count = 260;
  const streaks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.03, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), count);
  const colors = ['#7fd8ff', '#ff6bd6', '#ffffff', '#f1c232'];
  const random = rng(9);
  const data = Array.from({ length: count }, () => ({ a: random() * Math.PI * 2, r: 1.5 + random() * 3, z: -random() * 60, len: 0.5 + random() * 2 }));
  data.forEach((_, i) => streaks.setColorAt(i, new THREE.Color(colors[i % colors.length])));
  scene.add(streaks);
  const matrix = new THREE.Matrix4();
  let last = 0;

  return {
    scene,
    update(time, speed) {
      const dt = Math.min(0.05, time - last);
      last = time;
      machine.update(time, 'active');
      machine.root.rotation.set(Math.sin(time * 2) * 0.3, time * 2, Math.cos(time * 1.7) * 0.3);
      data.forEach((d, i) => {
        d.z += speed * dt * 30;
        if (d.z > 2) d.z -= 62;
        const a = d.a + time * 0.4;
        matrix.makeScale(1, 1, d.len * (1 + speed)).setPosition(Math.cos(a) * d.r, Math.sin(a) * d.r, d.z);
        streaks.setMatrixAt(i, matrix);
      });
      streaks.instanceMatrix.needsUpdate = true;
    },
  };
}
