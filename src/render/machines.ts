import * as THREE from 'three';
import { outline, toon } from './materials.ts';
import { box, cylinder, glow, pivot, type PartOptions } from './primitives.ts';

/*
 * The time machine and the robots of 2087.
 */

export type MachineMode = 'idle' | 'broken' | 'active' | 'off';

export interface MachineRig {
  root: THREE.Group;
  update(time: number, mode: MachineMode): void;
}

export function buildMachine(): MachineRig {
  const o: PartOptions = { outline: true };
  const root = new THREE.Group();
  root.add(cylinder(0.78, 0.86, 0.18, '#2e323c', 0, 0.09, 0, o, 14));
  root.add(cylinder(0.8, 0.8, 0.04, '#6a7282', 0, 0.2, 0, {}, 14));
  root.add(cylinder(0.42, 0.48, 0.75, '#b8c2cc', 0, 0.57, 0, o, 12));
  for (const y of [0.36, 0.56, 0.76]) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 6, 18), toon('#c87533'));
    coil.rotation.x = Math.PI / 2;
    coil.position.y = y;
    coil.castShadow = true;
    root.add(coil);
  }
  for (const side of [-1, 1]) root.add(box(0.08, 0.6, 0.34, '#3a3f4a', side * 0.56, 0.52, 0, o));

  const glass = new THREE.MeshToonMaterial({ color: '#6fd6ff', transparent: true, opacity: 0.55, emissive: '#1a5a7a' });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  dome.position.y = 0.94;
  root.add(dome);
  root.add(cylinder(0.02, 0.02, 0.45, '#5a6170', 0, 1.5, 0));
  const tipMaterial = new THREE.MeshBasicMaterial({ color: '#7fff9a' });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), tipMaterial);
  tip.position.y = 1.75;
  root.add(tip);
  const screenMaterial = new THREE.MeshBasicMaterial({ color: '#5aff8a' });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.04), screenMaterial);
  screen.position.set(0, 0.62, 0.47);
  root.add(screen);
  const light = new THREE.PointLight('#7fd8ff', 0, 5, 1.5);
  light.position.y = 1.1;
  root.add(light);

  return {
    root,
    update(time, mode) {
      const blink = Math.floor(time * 3) % 2 === 0;
      if (mode === 'broken') {
        tipMaterial.color.set(blink ? '#ff4040' : '#5a1010');
        screenMaterial.color.set(blink ? '#ff3b3b' : '#7a1a1a');
        glass.emissive.set('#0a2a3a');
        light.intensity = 0;
      } else if (mode === 'active') {
        tipMaterial.color.set('#ffffff');
        screenMaterial.color.set('#7fd8ff');
        glass.emissive.set('#5ad8ff');
        light.intensity = 4 + Math.sin(time * 20) * 2;
      } else if (mode === 'off') {
        tipMaterial.color.set('#2a2a2a');
        screenMaterial.color.set('#111111');
        glass.emissive.set('#000000');
        light.intensity = 0;
      } else {
        tipMaterial.color.set('#7fff9a');
        screenMaterial.color.set('#5aff8a');
        glass.emissive.set('#1a5a7a');
        light.intensity = 0.8;
      }
    },
  };
}

/** Robots and cameras share this interface: animate, and show when they're switched off. */
export interface RobotRig {
  root: THREE.Group;
  /** Rotates only the part that looks around (the camera head). Null for robots that turn their whole body. */
  head: THREE.Object3D | null;
  update(time: number, walk: number, disabled: boolean): void;
}

/** Security camera on a post: a sweeping head with a red recording light. */
export function buildCamera(): RobotRig {
  const o: PartOptions = { outline: true };
  const root = new THREE.Group();
  root.add(cylinder(0.05, 0.07, 1.6, '#3a3e48', 0, 0.8, 0, o));
  const head = pivot(0, 1.62, 0);
  head.add(box(0.2, 0.18, 0.36, '#d8dce4', 0, 0, 0.08, o));
  head.add(cylinder(0.07, 0.07, 0.06, '#1a1d24', 0, 0, 0.28));
  const lens = glow(0.08, 0.08, 0.02, '#7fd8ff', 0, 0, 0.31);
  const led = glow(0.04, 0.04, 0.04, '#ff3030', 0.07, 0.07, 0.18);
  head.add(lens, led);
  head.rotation.x = 0.25;
  root.add(head);
  const lensMat = lens.material as THREE.MeshBasicMaterial;
  const ledMat = led.material as THREE.MeshBasicMaterial;
  return {
    root,
    head,
    update(time, _walk, disabled) {
      ledMat.color.set(disabled ? '#222222' : Math.floor(time * 2) % 2 ? '#ff3030' : '#7a1010');
      lensMat.color.set(disabled ? '#1a1d24' : '#7fd8ff');
      head.rotation.x = disabled ? 0.9 : 0.25;
    },
  };
}

/** Quadcopter security drone that hovers above head height. */
export function buildDrone(): RobotRig {
  const o: PartOptions = { outline: true };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(box(0.34, 0.12, 0.34, '#2a2e3a', 0, 0, 0, o));
  body.add(box(0.2, 0.06, 0.2, '#3fe0ff', 0, 0.08, 0));
  const eye = glow(0.12, 0.05, 0.03, '#ff3fd0', 0, -0.02, 0.18);
  body.add(eye);
  const rotors: THREE.Mesh[] = [];
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    body.add(box(0.04, 0.03, 0.26, '#1a1d24', x * 0.18, 0.02, z * 0.18).rotateY(Math.PI / 4 * x * z));
    const rotor = box(0.32, 0.01, 0.04, '#9aa6bb', x * 0.26, 0.08, z * 0.26);
    rotors.push(rotor);
    body.add(rotor);
  }
  const eyeMat = eye.material as THREE.MeshBasicMaterial;
  return {
    root,
    head: null,
    update(time, _walk, disabled) {
      const target = disabled ? 0.15 : 1.35 + Math.sin(time * 3) * 0.06;
      body.position.y += (target - body.position.y) * 0.08;
      for (const rotor of rotors) rotor.rotation.y += disabled ? 0 : 0.9;
      eyeMat.color.set(disabled ? '#222222' : '#ff3fd0');
      body.rotation.z = disabled ? 0.2 : Math.sin(time * 2) * 0.05;
    },
  };
}

/** Ground security robot with a visor and treads. */
export function buildBot(): RobotRig {
  const o: PartOptions = { outline: true };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  for (const side of [-1, 1]) body.add(box(0.14, 0.18, 0.5, '#1a1d24', side * 0.18, 0.09, 0, o));
  body.add(cylinder(0.24, 0.28, 0.6, '#d8dce4', 0, 0.5, 0, o, 10));
  body.add(box(0.5, 0.06, 0.1, '#3fe0ff', 0, 0.62, 0.22));
  const head = pivot(0, 0.95, 0);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon('#d8dce4')));
  const visor = glow(0.3, 0.07, 0.04, '#ff3030', 0, 0.06, 0.17);
  head.add(visor);
  body.add(head);
  const arms = [-1, 1].map((side) => pivot(side * 0.32, 0.72, 0, box(0.08, 0.36, 0.08, '#9aa6bb', 0, -0.16, 0, o)));
  body.add(...arms);
  outline(head.children[0] as THREE.Mesh);
  const visorMat = visor.material as THREE.MeshBasicMaterial;
  return {
    root,
    head: null,
    update(time, walk, disabled) {
      body.rotation.x = disabled ? 0.35 : 0;
      head.rotation.y = disabled ? 0 : Math.sin(time * 1.5) * 0.3;
      visorMat.color.set(disabled ? '#222222' : '#ff3030');
      arms.forEach((arm, i) => (arm.rotation.x = Math.sin(time * 8 + i * Math.PI) * 0.3 * walk));
    },
  };
}
