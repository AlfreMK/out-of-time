import * as THREE from 'three';
import { buildHuman } from './humans.ts';
import { ball, box, cone, cylinder, pivot, type PartOptions, type Rig } from './primitives.ts';

/*
 * Animals. Where science has an answer (feathers on dromaeosaurs, the
 * Pachycephalosaurus dome), the models follow it; skin colors are guesses,
 * since pigment rarely fossilizes.
 */

/** Dakotaraptor: a large, feathered dromaeosaur from the Hell Creek Formation. */
export function buildRaptor(): Rig {
  const o: PartOptions = { outline: true };
  const green = '#6f8a3a';
  const dark = '#4d6425';
  const feather = '#c8742a';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = ball(0.24, green, 0, 0.62, 0, o);
  torso.scale.set(0.9, 0.85, 1.5);
  body.add(torso);
  for (let i = 0; i < 4; i++) body.add(box(0.12, 0.05, 0.1, feather, 0, 0.83, -0.24 + i * 0.13));
  body.add(box(0.2, 0.08, 0.3, '#d6dd8c', 0, 0.45, 0.02));

  const head = pivot(0, 0.86, 0.34);
  head.add(box(0.13, 0.28, 0.13, green, 0, -0.08, -0.04, o));
  head.add(box(0.2, 0.18, 0.28, green, 0, 0.1, 0.08, o));
  head.add(box(0.15, 0.1, 0.2, green, 0, 0.05, 0.3, o));
  head.add(box(0.13, 0.03, 0.16, '#efe9d8', 0, -0.01, 0.31));
  head.add(box(0.04, 0.05, 0.04, '#ffd23f', -0.1, 0.14, 0.15, { emissive: '#5a4a00' }));
  head.add(box(0.04, 0.05, 0.04, '#ffd23f', 0.1, 0.14, 0.15, { emissive: '#5a4a00' }));
  head.add(box(0.05, 0.14, 0.2, feather, 0, 0.26, 0.0));
  body.add(head);

  const tail = pivot(0, 0.66, -0.3);
  const tailCone = cone(0.13, 0.95, green, 0, 0, -0.46, o);
  tailCone.rotation.x = -Math.PI / 2;
  tail.add(tailCone);
  tail.add(box(0.22, 0.03, 0.4, feather, 0, 0.06, -0.75));
  body.add(tail);

  const leg = (side: number): THREE.Group =>
    pivot(
      side * 0.13,
      0.5,
      -0.02,
      box(0.11, 0.26, 0.16, green, 0, -0.1, 0, o),
      box(0.07, 0.24, 0.07, dark, 0, -0.32, -0.05, o),
      box(0.11, 0.05, 0.18, dark, 0, -0.47, 0.03, o),
    );
  const legL = leg(-1);
  const legR = leg(1);
  body.add(legL, legR);
  // Feathered "wings" on the arms, as fossil quill knobs show.
  for (const side of [-1, 1]) {
    body.add(box(0.05, 0.14, 0.05, dark, side * 0.14, 0.58, 0.3));
    body.add(box(0.03, 0.12, 0.26, feather, side * 0.17, 0.58, 0.2));
  }

  return {
    root,
    animate(time, walk) {
      const phase = time * 12;
      legL.rotation.x = Math.sin(phase) * 0.8 * walk;
      legR.rotation.x = -Math.sin(phase) * 0.8 * walk;
      tail.rotation.y = Math.sin(time * 3) * 0.25;
      head.rotation.x = Math.sin(time * 2.4) * 0.08 + Math.abs(Math.sin(phase)) * 0.1 * walk;
      body.position.y = Math.abs(Math.sin(phase)) * 0.04 * walk;
    },
  };
}

export function buildSleepingRex(): Rig {
  const o: PartOptions = { outline: true };
  const green = '#56703a';
  const dark = '#3b4d27';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = ball(0.6, green, 0, 0.45, 0, o, 10);
  torso.scale.set(1.15, 0.72, 1.55);
  body.add(torso);
  const belly = ball(0.5, '#94a865', 0, 0.3, 0.1, {}, 10);
  belly.scale.set(1.2, 0.55, 1.4);
  body.add(belly);
  for (let i = 0; i < 4; i++) body.add(box(0.5, 0.06, 0.12, dark, 0, 0.88, -0.5 + i * 0.32));

  const head = pivot(0.05, 0, 1.15);
  head.add(box(0.55, 0.4, 0.8, green, 0, 0.3, 0.15, o));
  head.add(box(0.5, 0.16, 0.7, green, 0, 0.08, 0.2, o));
  head.add(box(0.46, 0.05, 0.6, '#efe9d8', 0, 0.17, 0.25));
  head.add(box(0.14, 0.03, 0.03, '#1a1a1a', -0.28, 0.4, 0.15));
  head.add(box(0.14, 0.03, 0.03, '#1a1a1a', 0.28, 0.4, 0.15));
  body.add(head);

  const tail = cone(0.42, 1.8, green, -0.25, 0.3, -1.6, o, 8);
  tail.rotation.set(-Math.PI / 2 + 0.1, 0, 0.3);
  body.add(tail);
  body.add(box(0.3, 0.3, 0.5, dark, -0.6, 0.18, -0.2, o));
  body.add(box(0.3, 0.3, 0.5, dark, 0.6, 0.18, -0.2, o));
  body.add(box(0.08, 0.06, 0.2, dark, -0.3, 0.35, 0.85));
  body.add(box(0.08, 0.06, 0.2, dark, 0.3, 0.35, 0.85));

  return {
    root,
    animate(time) {
      const breath = Math.sin(time * 1.6);
      torso.scale.y = 0.72 + breath * 0.03;
      head.rotation.x = breath * 0.02;
    },
  };
}

export interface PipRig extends Rig {
  setLying(lying: boolean): void;
}

/**
 * A juvenile Pachycephalosaurus: bipedal, with a still-growing skull dome ringed
 * by bony knobs. (Some paleontologists think "Dracorex" and "Stygimoloch" were
 * young Pachycephalosaurus at different growth stages.)
 */
export function buildPip(): PipRig {
  const o: PartOptions = { outline: true };
  const hide = '#8a7448';
  const dark = '#5a4a2a';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = ball(0.22, hide, 0, 0.5, 0, o);
  torso.scale.set(0.85, 0.82, 1.45);
  body.add(torso);
  const belly = ball(0.17, '#cbb88a', 0, 0.44, 0.04);
  belly.scale.set(0.9, 0.7, 1.4);
  body.add(belly);
  for (let i = 0; i < 3; i++) body.add(box(0.05, 0.03, 0.08, dark, 0, 0.68, -0.15 + i * 0.12));

  const tail = pivot(0, 0.5, -0.28);
  const tailCone = cone(0.11, 0.75, hide, 0, 0, -0.36, o);
  tailCone.rotation.x = -Math.PI / 2;
  tail.add(tailCone);
  body.add(tail);

  const head = pivot(0, 0.74, 0.34);
  head.add(box(0.11, 0.2, 0.11, hide, 0, -0.1, -0.05, o));
  head.add(box(0.18, 0.16, 0.2, hide, 0, 0, 0.04, o));
  head.add(box(0.11, 0.09, 0.12, '#a8946a', 0, -0.04, 0.17, o));
  head.add(box(0.035, 0.035, 0.02, '#141414', -0.08, 0.02, 0.12), box(0.035, 0.035, 0.02, '#141414', 0.08, 0.02, 0.12));
  // The dome: thick, rounded bone on top of the skull.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: '#b86a3a' }));
  dome.position.set(0, 0.07, 0.0);
  dome.scale.set(1, 0.8, 1.1);
  dome.castShadow = true;
  head.add(dome);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
    const knob = cone(0.022, 0.07, '#e8dcc0', Math.cos(a) * 0.12, 0.07, -Math.sin(a) * 0.1);
    knob.rotation.set(-Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
    head.add(knob);
  }
  body.add(head);

  const leg = (side: number): THREE.Group =>
    pivot(
      side * 0.12,
      0.45,
      0,
      box(0.1, 0.22, 0.15, hide, 0, -0.1, 0, o),
      box(0.07, 0.2, 0.07, dark, 0, -0.28, -0.04, o),
      box(0.1, 0.04, 0.15, dark, 0, -0.42, 0.03, o),
    );
  const legL = leg(-1);
  const legR = leg(1);
  body.add(legL, legR);
  body.add(box(0.04, 0.1, 0.04, dark, -0.1, 0.48, 0.24), box(0.04, 0.1, 0.04, dark, 0.1, 0.48, 0.24));
  const bandage = box(0.12, 0.06, 0.17, '#f2f2f2', 0.12, 0.3, 0);
  body.add(bandage);

  let lying = false;
  return {
    root,
    setLying(value) {
      lying = value;
      bandage.visible = value;
    },
    animate(time, walk) {
      const phase = time * 13;
      legL.rotation.x = lying ? -1.2 : Math.sin(phase) * 0.8 * walk;
      legR.rotation.x = lying ? -1.2 : -Math.sin(phase) * 0.8 * walk;
      body.position.y = lying ? -0.26 : Math.abs(Math.sin(phase)) * 0.04 * walk;
      body.rotation.z = lying ? 0.2 : 0;
      head.rotation.x = lying ? 0.4 + Math.sin(time * 1.5) * 0.03 : Math.sin(time * 2) * 0.06 + Math.abs(Math.sin(phase)) * 0.08 * walk;
      tail.rotation.y = Math.sin(time * (lying ? 1 : 4)) * 0.25;
    },
  };
}

export interface DogRig extends Rig {
  setEating(eating: boolean): void;
}

export function buildDog(): DogRig {
  const o: PartOptions = { outline: true };
  const brown = '#8b5a2b';
  const dark = '#5a3a1b';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(box(0.24, 0.22, 0.5, brown, 0, 0.34, 0, o));
  const head = pivot(0, 0.5, 0.28);
  head.add(box(0.22, 0.2, 0.2, brown, 0, 0, 0.02, o));
  head.add(box(0.12, 0.1, 0.14, dark, 0, -0.04, 0.16, o));
  head.add(box(0.04, 0.04, 0.03, '#111111', 0, -0.01, 0.24));
  head.add(box(0.06, 0.12, 0.06, dark, -0.09, 0.12, -0.02));
  head.add(box(0.06, 0.12, 0.06, dark, 0.09, 0.12, -0.02));
  body.add(head);
  const tail = pivot(0, 0.42, -0.25, box(0.05, 0.05, 0.22, brown, 0, 0.06, -0.08));
  tail.rotation.x = 0.6;
  body.add(tail);
  const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => pivot(sx * 0.08, 0.24, sz * 0.17, box(0.07, 0.24, 0.07, dark, 0, -0.12, 0, o))));
  body.add(...legs);

  let eating = false;
  return {
    root,
    setEating(value) {
      eating = value;
    },
    animate(time, walk) {
      const phase = time * 14;
      legs.forEach((leg, i) => (leg.rotation.x = Math.sin(phase + (i % 2 ? Math.PI : 0)) * 0.7 * walk));
      head.rotation.x = eating ? 0.7 + Math.abs(Math.sin(time * 9)) * 0.15 : Math.sin(time * 2) * 0.05;
      tail.rotation.y = Math.sin(time * (eating ? 16 : 4)) * 0.5;
    },
  };
}

/** A Spanish horseman, 1553. Horses were brought to the Americas by Europeans. */
export function buildRider(): Rig {
  const o: PartOptions = { outline: true };
  const coat = '#6a4428';
  const dark = '#3a2414';
  const root = new THREE.Group();
  const horse = new THREE.Group();
  root.add(horse);
  horse.add(box(0.42, 0.42, 1.0, coat, 0, 0.82, 0, o));
  const neck = pivot(0, 0.95, 0.42, box(0.2, 0.5, 0.24, coat, 0, 0.2, 0.05, o));
  neck.rotation.x = 0.5;
  neck.add(box(0.2, 0.22, 0.42, coat, 0, 0.42, 0.22, o), box(0.06, 0.4, 0.1, dark, 0, 0.25, -0.1));
  horse.add(neck);
  horse.add(box(0.44, 0.1, 0.5, '#8a2a2a', 0, 1.06, -0.02));
  const tail = pivot(0, 0.95, -0.5, box(0.08, 0.45, 0.08, dark, 0, -0.2, -0.05));
  tail.rotation.x = 0.3;
  horse.add(tail);
  const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => pivot(sx * 0.14, 0.62, sz * 0.36, cylinder(0.05, 0.045, 0.62, coat, 0, -0.31, 0, o), box(0.1, 0.06, 0.12, dark, 0, -0.6, 0))));
  horse.add(...legs);

  const rider = buildHuman('soldier', { weapon: 'lance' });
  rider.root.position.set(0, 0.62, -0.05);
  root.add(rider.root);

  return {
    root,
    animate(time, walk) {
      const phase = time * 9;
      legs.forEach((leg, i) => (leg.rotation.x = Math.sin(phase + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.55 * walk));
      horse.position.y = Math.abs(Math.sin(phase)) * 0.05 * walk;
      rider.root.position.y = 0.62 + Math.abs(Math.sin(phase)) * 0.06 * walk;
      rider.animate(time, 0);
      tail.rotation.z = Math.sin(time * 2) * 0.2;
    },
  };
}

/** Quetzalcoatlus-like azhdarchid pterosaur: long neck, huge beak, enormous wingspan. */
export function buildPterosaur(): Rig {
  const root = new THREE.Group();
  const color = '#7a4a3a';
  root.add(box(0.14, 0.12, 0.4, color));
  root.add(box(0.07, 0.07, 0.5, color, 0, 0.05, 0.4));
  root.add(box(0.06, 0.08, 0.5, '#d8c8a8', 0, 0.05, 0.85));
  root.add(box(0.03, 0.18, 0.18, '#c8442a', 0, 0.16, 0.66));
  const wingL = pivot(-0.07, 0, 0, box(1.1, 0.03, 0.3, color, -0.55, 0, 0));
  const wingR = pivot(0.07, 0, 0, box(1.1, 0.03, 0.3, color, 0.55, 0, 0));
  root.add(wingL, wingR);
  return {
    root,
    animate(time) {
      const flap = Math.sin(time * 4) * 0.45;
      wingL.rotation.z = flap;
      wingR.rotation.z = -flap;
    },
  };
}
