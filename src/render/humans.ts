import * as THREE from 'three';
import type { NpcLook } from '../game/looks.ts';
import { toon } from './materials.ts';
import { ball, box, cone, cylinder, glow, pivot, type Color, type PartOptions, type Rig } from './primitives.ts';

/*
 * Chunky low-poly people. One body template plus a style table: clothing,
 * headwear and props are layered on depending on the era and role.
 */

type Helmet = 'nasal' | 'morion';
type Weapon = 'crossbow' | 'spear' | 'arquebus' | 'lance' | 'cane' | 'kultrun';

export interface HumanStyle {
  skin: Color;
  hair: Color;
  top: Color;
  pants: Color;
  shoes: Color;
  /** Long coat or cloak over the torso, with flaps below the waist. */
  coat?: Color;
  apron?: Color;
  /** Long skirt or habit covering the legs. */
  gown?: Color;
  /** Head covering instead of hair (kerchief, coif). */
  kerchief?: Color;
  /** Chainmail hood under a helmet. */
  coif?: Color;
  helmet?: Helmet;
  /** Tall black eboshi hat worn by Shinto priests. */
  tallHat?: boolean;
  /** Monk's haircut: shaved crown with a ring of hair. */
  tonsure?: boolean;
  /** Folded hood on the back of the neck. */
  hood?: Color;
  longHair?: boolean;
  bun?: boolean;
  bald?: boolean;
  beard?: Color;
  /** Mapuche trarilonko, a headband (often silver or woven wool). */
  headband?: Color;
  goggles?: boolean;
  /** Glowing AR visor across the eyes. */
  visor?: Color;
  hoodie?: Color;
  neon?: Color;
  /** Chest emblem; `cross` draws the black cross of the Archbishopric of Cologne. */
  emblem?: { color: Color; cross?: boolean };
  cuirass?: boolean;
  /** Mapuche makuñ (poncho) with woven stripes. */
  poncho?: { color: Color; stripe: Color };
  /** Shawl over the shoulders (ikülla). */
  shawl?: Color;
  /** Silver pectoral (trapelakucha). */
  silver?: boolean;
  weapon?: Weapon;
  scale?: number;
  /** Width multiplier for stockier characters. */
  build?: number;
}

const SKIN = '#f0c08a';
const SKIN_TAN = '#d9a066';
const SKIN_BROWN = '#b07a52';

const STYLES: Record<NpcLook | 'elias' | 'soldier', HumanStyle> = {
  elias: { skin: SKIN, hair: '#4a2f1d', top: '#5a7aa8', pants: '#2f3e5c', shoes: '#202028', coat: '#eef3f6', goggles: true },

  // Cologne, 1248
  baker: { skin: SKIN, hair: '#d9c7a0', top: '#8a5a3a', pants: '#6a4424', shoes: '#3a2a1a', gown: '#8a5a3a', apron: '#f3efe6', kerchief: '#f3efe6' },
  founder: { skin: SKIN_TAN, hair: '#2a2a2a', top: '#7a4a2a', pants: '#333333', shoes: '#1a1a1a', apron: '#4a3020', bald: true, beard: '#2a2a2a', build: 1.12 },
  kid: { skin: SKIN, hair: '#c4601a', top: '#4f8f3a', pants: '#6b4a2a', shoes: '#2a1a0a', scale: 0.78 },
  elder: { skin: '#e8b88a', hair: '#e6e6e6', top: '#5a4a6a', pants: '#3a2a4a', shoes: '#1a1a1a', gown: '#5a4a6a', kerchief: '#e8e4d8' },
  guard: {
    skin: SKIN,
    hair: '#3a2a1a',
    top: '#f0ece0',
    pants: '#5a5a62',
    shoes: '#2a2a2a',
    coif: '#8a9098',
    helmet: 'nasal',
    emblem: { color: '#1a1a1a', cross: true },
    weapon: 'crossbow',
  },
  // Dominican friars wore a white habit under a black cappa.
  albertus: { skin: '#e8b88a', hair: '#cfcfcf', top: '#f0ece0', pants: '#f0ece0', shoes: '#3a2a1a', gown: '#f0ece0', coat: '#1e1e24', hood: '#1e1e24', tonsure: true },
  thomas: { skin: SKIN, hair: '#3a2a1a', top: '#f0ece0', pants: '#f0ece0', shoes: '#3a2a1a', gown: '#f0ece0', coat: '#1e1e24', hood: '#1e1e24', tonsure: true, build: 1.25 },

  // Araucanía, 1553
  lautaro: {
    skin: SKIN_BROWN,
    hair: '#141014',
    top: '#3a2a2a',
    pants: '#3a2a2a',
    shoes: '#5a3a1e',
    longHair: true,
    headband: '#c03030',
    poncho: { color: '#1e2240', stripe: '#c03030' },
    weapon: 'lance',
  },
  machi: {
    skin: SKIN_BROWN,
    hair: '#141014',
    top: '#141418',
    pants: '#141418',
    shoes: '#3a2a1e',
    gown: '#141418',
    shawl: '#4a3a8a',
    longHair: true,
    headband: '#c0c8d0',
    silver: true,
    weapon: 'kultrun',
  },
  weichafe: {
    skin: SKIN_BROWN,
    hair: '#141014',
    top: '#4a3020',
    pants: '#3a2a2a',
    shoes: '#5a3a1e',
    longHair: true,
    headband: '#e8e0cc',
    poncho: { color: '#6a3a2a', stripe: '#e8e0cc' },
    weapon: 'lance',
  },
  pichi: {
    skin: SKIN_BROWN,
    hair: '#141014',
    top: '#3a2a2a',
    pants: '#3a2a2a',
    shoes: '#5a3a1e',
    longHair: true,
    headband: '#e8e0cc',
    poncho: { color: '#8a3a2a', stripe: '#e8e0cc' },
    scale: 0.72,
  },
  lamngen: {
    skin: SKIN_BROWN,
    hair: '#141014',
    top: '#141418',
    pants: '#141418',
    shoes: '#3a2a1e',
    gown: '#141418',
    shawl: '#2a4a8a',
    longHair: true,
    headband: '#c03030',
    silver: true,
  },
  // A 16th-century Spanish soldier: morion helmet, steel breastplate, puffed breeches.
  soldier: {
    skin: SKIN,
    hair: '#2a1a10',
    top: '#9a2a2a',
    pants: '#c8a040',
    shoes: '#2a1a10',
    helmet: 'morion',
    cuirass: true,
    beard: '#2a1a10',
    weapon: 'arquebus',
  },

  // Neo-Tokyo, 2087
  nora: { skin: SKIN, hair: '#d8d8dc', top: '#3a5a6a', pants: '#2a3a4a', shoes: '#1a1a1a', coat: '#2f6f7a', bun: true, weapon: 'cane' },
  citizen: { skin: SKIN_TAN, hair: '#1a1a2a', top: '#3a2a5a', pants: '#14141e', shoes: '#0e0e14', hoodie: '#3a2a5a', neon: '#3fe0ff', visor: '#ff3fd0' },
  vendor: { skin: SKIN, hair: '#1a1a1a', top: '#2a3a5a', pants: '#24242e', shoes: '#14141a', apron: '#f0ece0', kerchief: '#f0ece0' },
  hacker: { skin: SKIN, hair: '#3fe0ff', top: '#14141e', pants: '#1a1a2a', shoes: '#0e0e14', coat: '#24243a', neon: '#ff3fd0', visor: '#3fe0ff' },
  // A kannushi: white robe, pale hakama trousers and a black eboshi hat.
  priest: { skin: SKIN, hair: '#2a2a2a', top: '#f4f2ea', pants: '#a8c8e8', shoes: '#f4f2ea', gown: '#a8c8e8', tallHat: true },

  // 2240
  pike: { skin: '#e0b088', hair: '#e8e8e8', top: '#a8b0b8', pants: '#8a929a', shoes: '#3a3a40', longHair: true, beard: '#e8e8e8', scale: 0.96 },
  trader: { skin: SKIN_TAN, hair: '#3a2a1a', top: '#c8a878', pants: '#8a6a4a', shoes: '#4a3a2a', coat: '#d8c098', kerchief: '#e8dcc0', visor: '#3a3a40' },
};

export interface HumanRig extends Rig {
  /** All meshes of the body, for silhouettes and fading. */
  meshes: THREE.Mesh[];
}

export function buildHuman(look: NpcLook | 'elias' | 'soldier', overrides: Partial<HumanStyle> = {}): HumanRig {
  const s: HumanStyle = { ...STYLES[look], ...overrides };
  const o: PartOptions = { outline: true };
  const wide = s.build ?? 1;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Legs (hidden under a gown, but still animated for the swaying hem).
  const leg = (side: number): THREE.Group =>
    pivot(side * 0.1 * wide, 0.42, 0, box(0.15, 0.34, 0.17, s.pants, 0, -0.17, 0, o), box(0.17, 0.09, 0.24, s.shoes, 0, -0.37, 0.03, o));
  const legL = leg(-1);
  const legR = leg(1);
  body.add(legL, legR);
  let hem: THREE.Mesh | null = null;
  if (s.gown) {
    hem = cylinder(0.24 * wide, 0.3 * wide, 0.44, s.gown, 0, 0.22, 0, o, 8);
    body.add(hem);
  }

  // Torso
  body.add(box(0.44 * wide, 0.42, 0.28, s.top, 0, 0.62, 0, o));
  if (s.cuirass) {
    body.add(box(0.48 * wide, 0.36, 0.32, '#c0c8d0', 0, 0.64, 0, o));
    body.add(box(0.04, 0.32, 0.04, '#e8eef4', 0, 0.64, 0.17));
  }
  if (s.coat) {
    body.add(box(0.48 * wide, 0.3, 0.31, s.coat, 0, 0.42, 0, o));
    body.add(box(0.2 * wide, 0.36, 0.02, s.coat, -0.13 * wide, 0.64, 0.15));
    body.add(box(0.2 * wide, 0.36, 0.02, s.coat, 0.13 * wide, 0.64, 0.15));
  }
  if (s.apron) body.add(box(0.36 * wide, 0.5, 0.03, s.apron, 0, 0.5, 0.16));
  if (s.emblem) {
    if (s.emblem.cross) {
      body.add(box(0.06, 0.32, 0.02, s.emblem.color, 0, 0.6, 0.15), box(0.3 * wide, 0.06, 0.02, s.emblem.color, 0, 0.66, 0.15));
    } else {
      body.add(box(0.18, 0.18, 0.02, s.emblem.color, 0, 0.66, 0.15));
    }
  }
  if (s.poncho) {
    body.add(box(0.62 * wide, 0.4, 0.36, s.poncho.color, 0, 0.62, 0, o));
    for (const y of [0.5, 0.66]) body.add(box(0.63 * wide, 0.04, 0.37, s.poncho.stripe, 0, y, 0));
    body.add(box(0.12, 0.12, 0.37, s.poncho.stripe, 0, 0.58, 0));
  }
  if (s.shawl) body.add(box(0.52 * wide, 0.14, 0.34, s.shawl, 0, 0.78, 0, o), box(0.3, 0.2, 0.02, s.shawl, 0, 0.66, 0.17));
  if (s.silver) {
    body.add(box(0.16, 0.05, 0.02, '#d8dee6', 0, 0.74, 0.19), box(0.04, 0.16, 0.02, '#d8dee6', 0, 0.62, 0.19));
  }
  if (s.hoodie) body.add(box(0.47 * wide, 0.44, 0.31, s.hoodie, 0, 0.62, 0, o));
  if (s.neon) body.add(glow(0.02, 0.4, 0.02, s.neon, -0.18 * wide, 0.62, 0.16), glow(0.02, 0.4, 0.02, s.neon, 0.18 * wide, 0.62, 0.16));
  if (s.hood) body.add(box(0.34, 0.16, 0.12, s.hood, 0, 0.84, -0.18, o));

  // Arms
  const sleeve = s.poncho ? s.poncho.color : s.coat ?? s.hoodie ?? s.top;
  const arm = (side: number): THREE.Group =>
    pivot(side * 0.29 * wide, 0.8, 0, box(0.13, 0.36, 0.14, sleeve, 0, -0.17, 0, o), box(0.11, 0.1, 0.11, s.skin, 0, -0.39, 0, o));
  const armL = arm(-1);
  const armR = arm(1);
  body.add(armL, armR);

  // Head
  const head = new THREE.Group();
  head.position.y = 1.05;
  body.add(head);
  head.add(ball(0.25, s.skin, 0, 0, 0, o, 10));
  head.add(box(0.05, 0.08, 0.02, '#1d1d2b', -0.09, 0, 0.24), box(0.05, 0.08, 0.02, '#1d1d2b', 0.09, 0, 0.24));
  const cap = (radius: number, color: Color, coverage = 0.55, tilt = -0.35): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8, 0, Math.PI * 2, 0, Math.PI * coverage), toon(color));
    mesh.rotation.x = tilt;
    mesh.castShadow = true;
    return mesh;
  };
  if (s.coif) {
    head.add(cap(0.275, s.coif, 0.62, -0.5));
    head.add(box(0.36, 0.14, 0.3, s.coif, 0, -0.22, -0.02));
  }
  if (s.helmet === 'nasal') {
    head.add(cone(0.27, 0.32, '#a7b0b8', 0, 0.2, 0, o, 10));
    head.add(box(0.04, 0.16, 0.04, '#a7b0b8', 0, 0.02, 0.27));
  } else if (s.helmet === 'morion') {
    head.add(cap(0.28, '#c0c8d0', 0.5, 0));
    head.add(cylinder(0.33, 0.33, 0.03, '#a8b0b8', 0, 0.08, 0, o, 12));
    head.add(box(0.03, 0.14, 0.42, '#d8dee6', 0, 0.32, 0));
  } else if (s.tallHat) {
    head.add(cylinder(0.16, 0.2, 0.36, '#141418', 0, 0.38, -0.04, o, 8));
  } else if (s.kerchief) {
    head.add(cap(0.27, s.kerchief, 0.6, -0.45));
    head.add(box(0.3, 0.26, 0.06, s.kerchief, 0, -0.08, -0.22));
  } else if (s.hoodie) {
    head.add(cap(0.29, s.hoodie, 0.6, -0.55));
  } else if (s.tonsure) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 14), toon(s.hair));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.1;
    head.add(ring);
  } else if (!s.bald) {
    head.add(cap(0.27, s.hair));
  }
  if (s.longHair) head.add(box(0.36, 0.42, 0.1, s.hair, 0, -0.16, -0.2, o));
  if (s.bun) head.add(ball(0.1, s.hair, 0, 0.12, -0.24));
  if (s.headband) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.03, 4, 16), toon(s.headband));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.1;
    head.add(band);
  }
  if (s.beard) head.add(box(0.3, 0.14, 0.1, s.beard, 0, -0.17, 0.18));
  if (s.goggles) {
    head.add(box(0.5, 0.06, 0.5, '#3a3a48', 0, 0.12, 0));
    head.add(box(0.12, 0.09, 0.06, '#5fd4ff', -0.1, 0.13, 0.24, { emissive: '#1a6a8a' }));
    head.add(box(0.12, 0.09, 0.06, '#5fd4ff', 0.1, 0.13, 0.24, { emissive: '#1a6a8a' }));
  }
  if (s.visor) head.add(glow(0.36, 0.07, 0.04, s.visor, 0, 0.02, 0.24));

  // Held props. Some poses keep the arms raised.
  let armPose = 0;
  if (s.weapon === 'crossbow') {
    armPose = -1.1;
    const bow = new THREE.Group();
    bow.position.set(0, 0.66, 0.3);
    bow.add(box(0.06, 0.06, 0.5, '#6a4a2a'), box(0.5, 0.03, 0.04, '#5a5a62', 0, 0, 0.2), box(0.46, 0.01, 0.01, '#e8e0cc', 0, 0, 0.16));
    body.add(bow);
    body.add(cylinder(0.06, 0.05, 0.36, '#5a3a1e', 0.12, 0.7, -0.2, o));
  } else if (s.weapon === 'spear') {
    armR.add(cylinder(0.025, 0.025, 1.6, '#6a4a2a', 0, 0.2, 0.08));
    armR.add(cone(0.06, 0.18, '#d0d6e0', 0, 1.08, 0.08));
  } else if (s.weapon === 'lance') {
    // Mapuche lances were long shafts of colihue cane with a hardened tip.
    armR.add(cylinder(0.02, 0.02, 2.2, '#c8b878', 0, 0.5, 0.08));
    armR.add(cone(0.04, 0.2, '#8a8a8a', 0, 1.7, 0.08));
  } else if (s.weapon === 'arquebus') {
    const gun = new THREE.Group();
    gun.position.set(0.22, 0.86, 0);
    gun.rotation.x = -0.5;
    gun.add(cylinder(0.025, 0.025, 1.0, '#3a3a3a', 0, 0.35, 0), box(0.07, 0.3, 0.09, '#6a4a2a', 0, -0.2, 0));
    body.add(gun);
  } else if (s.weapon === 'cane') {
    armR.add(cylinder(0.02, 0.02, 0.6, '#4a3a2a', 0, -0.55, 0.08));
  } else if (s.weapon === 'kultrun') {
    // The kultrun: a shallow bowl drum whose skin is painted with the Mapuche cosmos.
    armPose = -0.7;
    const drum = new THREE.Group();
    drum.position.set(0, 0.66, 0.3);
    drum.rotation.x = Math.PI / 2 - 0.4;
    drum.add(cylinder(0.18, 0.12, 0.1, '#7a4a2a', 0, 0, 0, o, 12), cylinder(0.17, 0.17, 0.01, '#e8dcc0', 0, 0.055, 0, {}, 12));
    drum.add(box(0.3, 0.012, 0.02, '#8a2a2a', 0, 0.065, 0), box(0.02, 0.012, 0.3, '#8a2a2a', 0, 0.065, 0));
    body.add(drum);
  }

  root.scale.setScalar(s.scale ?? 1);
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name !== 'outline') meshes.push(child);
  });

  return {
    root,
    meshes,
    animate(time, walk) {
      const phase = time * 11;
      const swing = Math.sin(phase) * 0.7 * walk;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      const armSwing = armPose ? 0.15 : 0.8;
      armL.rotation.x = armPose - swing * armSwing;
      armR.rotation.x = armPose + swing * armSwing;
      body.position.y = Math.abs(Math.sin(phase)) * 0.05 * walk;
      body.scale.y = 1 + Math.sin(time * 2.2) * 0.012 * (1 - walk);
      head.rotation.z = Math.sin(time * 1.3) * 0.03 * (1 - walk);
      if (hem) hem.rotation.z = Math.sin(phase) * 0.06 * walk;
    },
  };
}
