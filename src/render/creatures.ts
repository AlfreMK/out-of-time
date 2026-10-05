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

/**
 * A wild boar (Sus scrofa) asleep on its side in a thicket. Boars are mostly
 * active at dusk and at night, and rest in dense cover during the day.
 */
export function buildSleepingBoar(): Rig {
  const o: PartOptions = { outline: true };
  const bristle = '#4a3a30';
  const dark = '#2e241e';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Lying down: a wedge-shaped body, high at the shoulders, with a bristly ridge along the back.
  const torso = ball(0.32, bristle, 0, 0.24, 0, o, 8);
  torso.scale.set(0.95, 0.75, 1.5);
  body.add(torso);
  body.add(box(0.1, 0.1, 0.6, dark, 0, 0.47, 0.05));
  const head = pivot(0, 0.2, 0.42);
  head.add(box(0.26, 0.24, 0.3, bristle, 0, 0.02, 0.05, o));
  head.add(cone(0.12, 0.26, bristle, 0, -0.02, 0.28, o, 6).rotateX(Math.PI / 2));
  head.add(cylinder(0.06, 0.06, 0.04, '#6a4a40', 0, -0.02, 0.42, {}, 6).rotateX(Math.PI / 2));
  head.add(cone(0.02, 0.1, '#efe6d0', -0.08, -0.05, 0.3).rotateX(-0.6), cone(0.02, 0.1, '#efe6d0', 0.08, -0.05, 0.3).rotateX(-0.6));
  head.add(box(0.06, 0.1, 0.04, dark, -0.1, 0.17, -0.04), box(0.06, 0.1, 0.04, dark, 0.1, 0.17, -0.04));
  head.add(box(0.06, 0.015, 0.02, '#111111', -0.1, 0.07, 0.2), box(0.06, 0.015, 0.02, '#111111', 0.1, 0.07, 0.2));
  body.add(head);
  for (const [x, z] of [
    [-0.14, 0.25],
    [0.14, 0.25],
    [-0.14, -0.3],
    [0.14, -0.3],
  ]) {
    body.add(box(0.07, 0.07, 0.2, dark, x, 0.05, z + 0.08, o));
  }
  body.add(box(0.03, 0.03, 0.12, dark, 0, 0.3, -0.5));

  return {
    root,
    animate(time) {
      const breath = Math.sin(time * 2.2);
      torso.scale.y = 0.75 + breath * 0.03;
      head.rotation.x = breath * 0.03;
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

export interface AnzuRig extends Rig {
  /** Settles on the nest, arms spread over the eggs, or stands up. */
  setSitting(sitting: boolean): void;
}

/**
 * Anzu wyliei, the Hell Creek oviraptorosaur (~3.5 m long): a toothless beak, a tall crest on the head,
 * long legs and feathered arms and tail. Brooding, it sits on the nest with its arms spread around the
 * eggs, as fossils of its Mongolian relatives (Citipati) were found. Colors are guesses.
 */
export function buildAnzu(): AnzuRig {
  const o: PartOptions = { outline: true };
  const plumage = '#4a3a34';
  const light = '#8a7262';
  const bands = '#e8dcc8';
  const skin = '#7a6a58';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = ball(0.26, plumage, 0, 0.92, 0, o);
  torso.scale.set(0.95, 0.9, 1.3);
  body.add(torso);
  body.add(box(0.26, 0.12, 0.34, light, 0, 0.75, 0.04));

  // A long, S-curved neck up to the crested head.
  const neck = pivot(0, 1.02, 0.24);
  neck.add(box(0.13, 0.36, 0.13, plumage, 0, 0.16, 0.02, o));
  const head = pivot(0, 0.38, 0.06);
  head.add(box(0.17, 0.16, 0.22, light, 0, 0, 0.02, o));
  head.add(box(0.12, 0.12, 0.14, '#e0cfa0', 0, -0.03, 0.17, o));
  head.add(box(0.04, 0.26, 0.2, '#c8442a', 0, 0.17, 0.02, o));
  head.add(box(0.03, 0.04, 0.03, '#141414', -0.085, 0.03, 0.06), box(0.03, 0.04, 0.03, '#141414', 0.085, 0.03, 0.06));
  neck.add(head);
  body.add(neck);

  // Arms with long feathers: banded "wings" it spreads over the nest.
  const arm = (side: number): THREE.Group => {
    const a = pivot(side * 0.2, 0.95, 0.12);
    a.add(box(0.06, 0.07, 0.3, skin, 0, 0, 0.12));
    a.add(box(0.04, 0.2, 0.36, plumage, side * 0.02, -0.08, 0.06));
    a.add(box(0.045, 0.05, 0.3, bands, side * 0.025, -0.17, 0.06));
    return a;
  };
  const armL = arm(-1);
  const armR = arm(1);
  body.add(armL, armR);

  // A short tail ending in a fan of feathers.
  const tail = pivot(0, 0.95, -0.3);
  const tailCone = cone(0.12, 0.5, plumage, 0, 0, -0.24, o);
  tailCone.rotation.x = -Math.PI / 2;
  tail.add(tailCone);
  tail.add(box(0.36, 0.04, 0.22, bands, 0, 0.04, -0.5), box(0.26, 0.04, 0.18, plumage, 0, 0.06, -0.46));
  body.add(tail);

  const leg = (side: number): THREE.Group =>
    pivot(
      side * 0.14,
      0.8,
      -0.02,
      box(0.13, 0.34, 0.18, plumage, 0, -0.14, 0, o),
      box(0.07, 0.38, 0.07, skin, 0, -0.5, -0.06, o),
      box(0.12, 0.05, 0.2, skin, 0, -0.74, 0.03, o),
    );
  const legL = leg(-1);
  const legR = leg(1);
  body.add(legL, legR);

  let sitting = 0;
  let target = 0;
  return {
    root,
    setSitting(value) {
      target = value ? 1 : 0;
    },
    animate(time, walk) {
      sitting += (target - sitting) * 0.12;
      const phase = time * 10;
      const fold = sitting * 1.4;
      legL.rotation.x = Math.sin(phase) * 0.7 * walk - fold;
      legR.rotation.x = -Math.sin(phase) * 0.7 * walk - fold;
      body.position.y = Math.abs(Math.sin(phase)) * 0.04 * walk - sitting * 0.5;
      // Brooding: arms swing out and down around the eggs.
      armL.rotation.set(sitting * 0.3, -sitting * 0.9, sitting * 0.5);
      armR.rotation.set(sitting * 0.3, sitting * 0.9, -sitting * 0.5);
      neck.rotation.x = -0.15 + Math.sin(time * 1.8) * 0.05 + sitting * 0.1;
      head.rotation.x = 0.15 + Math.abs(Math.sin(phase)) * 0.12 * walk;
      tail.rotation.y = Math.sin(time * 2.2) * 0.15;
    },
  };
}

export interface GrazerRig extends Rig {
  /** Head down to the ferns while standing still. */
  setGrazing(grazing: boolean): void;
}

/**
 * Thescelosaurus neglectus: a common Hell Creek plant-eater, 3-4 m long, running on two legs,
 * with a small beaked head and a long stiff tail.
 */
export function buildThescelosaurus(): GrazerRig {
  const o: PartOptions = { outline: true };
  const hide = '#7a8248';
  const dark = '#4f5630';
  const belly = '#c8c090';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = ball(0.22, hide, 0, 0.5, 0, o);
  torso.scale.set(0.85, 0.85, 1.6);
  body.add(torso);
  const under = ball(0.16, belly, 0, 0.43, 0.04);
  under.scale.set(0.9, 0.7, 1.5);
  body.add(under);
  for (let i = 0; i < 4; i++) body.add(box(0.04, 0.03, 0.07, dark, 0, 0.69, -0.2 + i * 0.13));

  const neck = pivot(0, 0.58, 0.3);
  neck.add(box(0.1, 0.1, 0.24, hide, 0, 0.02, 0.1, o));
  const head = pivot(0, 0.04, 0.24);
  head.add(box(0.13, 0.12, 0.16, hide, 0, 0, 0.04, o));
  head.add(box(0.08, 0.07, 0.1, '#9a9a5a', 0, -0.02, 0.15, o));
  head.add(box(0.03, 0.03, 0.02, '#141414', -0.06, 0.02, 0.06), box(0.03, 0.03, 0.02, '#141414', 0.06, 0.02, 0.06));
  neck.add(head);
  body.add(neck);

  const tail = pivot(0, 0.52, -0.32);
  const tailCone = cone(0.11, 1.0, hide, 0, 0, -0.5, o);
  tailCone.rotation.x = -Math.PI / 2;
  tail.add(tailCone);
  body.add(tail);

  const leg = (side: number): THREE.Group =>
    pivot(
      side * 0.12,
      0.45,
      0,
      box(0.1, 0.22, 0.16, hide, 0, -0.1, 0, o),
      box(0.06, 0.2, 0.06, dark, 0, -0.28, -0.04, o),
      box(0.09, 0.04, 0.14, dark, 0, -0.42, 0.03, o),
    );
  const legL = leg(-1);
  const legR = leg(1);
  body.add(legL, legR);
  body.add(box(0.035, 0.1, 0.035, dark, -0.1, 0.45, 0.24), box(0.035, 0.1, 0.035, dark, 0.1, 0.45, 0.24));

  let grazing = 0;
  let target = 0;
  return {
    root,
    setGrazing(value) {
      target = value ? 1 : 0;
    },
    animate(time, walk) {
      grazing += (target - grazing) * 0.08;
      const phase = time * 13;
      legL.rotation.x = Math.sin(phase) * 0.8 * walk;
      legR.rotation.x = -Math.sin(phase) * 0.8 * walk;
      body.position.y = Math.abs(Math.sin(phase)) * 0.04 * walk;
      // Grazing: the head goes down to the ferns and nibbles.
      neck.rotation.x = grazing * (0.75 + Math.abs(Math.sin(time * 5)) * 0.12) + Math.sin(time * 2) * 0.04;
      tail.rotation.y = Math.sin(time * 2.5) * 0.12;
    },
  };
}

/**
 * A small Cretaceous bird, like the ones known from Hell Creek (Avisaurus, Cimolopteryx). Some birds of
 * the time still had teeth; at this size, nobody would notice.
 */
export function buildBird(color: string): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const torso = ball(0.06, color, 0, 0.08, 0, {}, 6);
  torso.scale.set(0.9, 0.85, 1.4);
  body.add(torso);
  const head = pivot(0, 0.13, 0.06, ball(0.035, color, 0, 0, 0, {}, 6), box(0.015, 0.015, 0.04, '#d8b860', 0, -0.005, 0.04));
  body.add(head);
  body.add(box(0.05, 0.01, 0.07, color, 0, 0.09, -0.1));
  const wingL = pivot(-0.04, 0.1, 0, box(0.12, 0.01, 0.06, color, -0.06, 0, 0));
  const wingR = pivot(0.04, 0.1, 0, box(0.12, 0.01, 0.06, color, 0.06, 0, 0));
  body.add(wingL, wingR);
  return {
    root,
    // `walk` is used as "flying": wings beat fast; on the ground the head bobs, pecking.
    animate(time, flying) {
      const flap = flying > 0 ? Math.sin(time * 40) * 0.9 : -0.1;
      wingL.rotation.z = flap;
      wingR.rotation.z = -flap;
      wingL.visible = wingR.visible = flying > 0;
      head.rotation.x = flying > 0 ? 0 : Math.max(0, Math.sin(time * 6)) * 0.9;
    },
  };
}

/**
 * Edmontosaurus annectens, a duck-billed hadrosaur up to ~12 m long: walking on all fours to feed and
 * drink, with a broad, flat beak (no bony crest on this species).
 */
export function buildEdmontosaurus(): Rig {
  const o: PartOptions = { outline: true };
  const hide = '#6f7a62';
  const dark = '#4a5240';
  const belly = '#a8a888';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  // High hips, lower shoulders: the back slopes down to the front legs, and a deep tail balances it.
  const torso = ball(0.55, hide, 0, 1.2, 0, o, 10);
  torso.scale.set(0.85, 0.95, 1.45);
  torso.rotation.x = 0.18;
  body.add(torso);
  const under = ball(0.45, belly, 0, 1.0, 0.1, {}, 8);
  under.scale.set(0.85, 0.7, 1.3);
  body.add(under);
  for (let i = 0; i < 5; i++) body.add(box(0.1, 0.08, 0.16, dark, 0, 1.78 - i * 0.07, -0.55 + i * 0.25));
  // A thick neck curving down to the water, ending in the broad, flat "duck" bill.
  const neck = pivot(0, 1.25, 0.7);
  neck.add(box(0.3, 0.32, 0.55, hide, 0, 0, 0.22, o));
  const head = pivot(0, 0, 0.55);
  head.add(box(0.3, 0.32, 0.36, hide, 0, 0.04, 0.08, o));
  head.add(box(0.36, 0.12, 0.34, '#c8b890', 0, -0.06, 0.36, o));
  head.add(box(0.04, 0.05, 0.04, '#141414', -0.16, 0.12, 0.04), box(0.04, 0.05, 0.04, '#141414', 0.16, 0.12, 0.04));
  neck.add(head);
  body.add(neck);
  const tail = pivot(0, 1.35, -0.75);
  const tailCone = cone(0.34, 1.7, hide, 0, 0, -0.8, o, 8);
  tailCone.rotation.x = -Math.PI / 2 + 0.12;
  tailCone.scale.set(0.8, 1, 1.3);
  tail.add(tailCone);
  body.add(tail);
  // Pillar-like hind legs and lighter front legs.
  for (const [x, z, h, w] of [
    [-0.26, 0.5, 0.95, 0.16],
    [0.26, 0.5, 0.95, 0.16],
    [-0.34, -0.35, 1.25, 0.26],
    [0.34, -0.35, 1.25, 0.26],
  ]) {
    body.add(box(w, h, w + 0.06, dark, x, h / 2, z, o));
  }
  return {
    root,
    animate(time) {
      // Lowering its head to drink, then looking up and around.
      const drink = Math.max(0, Math.sin(time * 0.45));
      neck.rotation.x = 0.35 + drink * 0.55;
      head.rotation.x = -0.2 + drink * 0.35;
      tail.rotation.y = Math.sin(time * 0.7) * 0.1;
    },
  };
}

/**
 * Champsosaurus: a gharial-like choristodere (not a crocodile) with a long, narrow snout. Only its
 * head and back break the surface.
 */
export function buildChampsosaurus(): Rig {
  const o: PartOptions = { outline: true };
  const hide = '#4a5a3a';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const back = ball(0.2, hide, 0, 0, -0.1, o, 8);
  back.scale.set(0.9, 0.35, 2.0);
  body.add(back);
  body.add(box(0.16, 0.08, 0.22, hide, 0, 0.01, 0.38, o));
  body.add(box(0.06, 0.05, 0.42, hide, 0, -0.01, 0.68, o));
  body.add(box(0.035, 0.04, 0.035, '#e8d870', -0.06, 0.06, 0.36), box(0.035, 0.04, 0.035, '#e8d870', 0.06, 0.06, 0.36));
  return {
    root,
    animate(time) {
      body.rotation.y = Math.sin(time * 0.3) * 0.25;
    },
  };
}

/**
 * Ankylosaurus magniventris, the last and largest ankylosaur (~6-8 m), from Hell Creek: a low, wide
 * body covered in bony plates (osteoderms), horns at the back corners of a broad head, a beak for
 * cropping low plants, and a heavy club at the end of its tail.
 */
export function buildAnkylosaurus(): Rig {
  const o: PartOptions = { outline: true };
  const hide = '#7a6a4a';
  const plate = '#a8946a';
  const dark = '#4f4430';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const torso = ball(0.55, hide, 0, 0.55, 0, o, 10);
  torso.scale.set(1.1, 0.55, 1.45);
  body.add(torso);
  // Rows of osteoderms across the back, with spikes along the flanks.
  for (let row = 0; row < 5; row++) {
    const z = -0.55 + row * 0.27;
    for (const x of [-0.36, -0.12, 0.12, 0.36]) {
      const rise = 0.84 - Math.abs(x) * 0.5 - Math.abs(z) * 0.12;
      body.add(box(0.13, 0.06, 0.13, plate, x, rise, z));
    }
    for (const side of [-1, 1]) {
      const spike = cone(0.06, 0.2, plate, side * 0.6, 0.5, z, {}, 4);
      spike.rotation.z = -side * Math.PI / 2;
      body.add(spike);
    }
  }
  const neck = pivot(0, 0.55, 0.75);
  neck.add(box(0.36, 0.26, 0.26, hide, 0, 0, 0.08, o));
  const head = pivot(0, -0.02, 0.26);
  head.add(box(0.44, 0.24, 0.34, hide, 0, 0, 0.1, o));
  head.add(box(0.32, 0.14, 0.14, '#b8a07a', 0, -0.05, 0.32, o));
  for (const side of [-1, 1]) {
    const horn = cone(0.05, 0.16, plate, side * 0.22, 0.08, -0.02, {}, 4);
    horn.rotation.set(-0.6, 0, -side * 0.9);
    head.add(horn);
    head.add(box(0.04, 0.04, 0.03, '#141414', side * 0.2, 0.06, 0.14));
  }
  neck.add(head);
  body.add(neck);
  const tail = pivot(0, 0.5, -0.75);
  const tailCone = cone(0.18, 1.2, hide, 0, 0, -0.6, o, 6);
  tailCone.rotation.x = -Math.PI / 2;
  tail.add(tailCone);
  const club = ball(0.2, plate, 0, 0, -1.2, o, 6);
  club.scale.set(1.4, 0.7, 1);
  tail.add(club);
  body.add(tail);
  for (const [x, z] of [
    [-0.4, 0.45],
    [0.4, 0.45],
    [-0.42, -0.45],
    [0.42, -0.45],
  ]) {
    body.add(box(0.2, 0.36, 0.22, dark, x, 0.18, z, o));
  }
  return {
    root,
    animate(time) {
      // Head down cropping ferns, a few bites, then a look around; the club sways slowly.
      const graze = Math.sin(time * 0.35) > -0.3 ? 1 : 0;
      neck.rotation.x = graze * (0.35 + Math.abs(Math.sin(time * 4)) * 0.08) - (1 - graze) * 0.1;
      neck.rotation.y = (1 - graze) * Math.sin(time * 0.8) * 0.4;
      tail.rotation.y = Math.sin(time * 0.6) * 0.3;
      torso.scale.y = 0.55 + Math.sin(time * 1.4) * 0.01;
    },
  };
}
