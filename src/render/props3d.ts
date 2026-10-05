import * as THREE from 'three';
import type { DecorKind } from '../eras/types.ts';
import type { ItemId } from '../game/state.ts';
import { buildHuman } from './humans.ts';
import { outline, toon } from './materials.ts';
import { ball, box, cone, cylinder, glow, type PartOptions } from './primitives.ts';

/*
 * Pickups, obstacles, gates and set dressing.
 */

export function buildBoulder(): THREE.Group {
  const root = new THREE.Group();
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55), toon('#8a8378'));
  rock.position.y = 0.45;
  rock.scale.set(1, 0.85, 0.95);
  rock.rotation.set(0.3, 0.5, 0.1);
  rock.castShadow = true;
  outline(rock);
  root.add(rock);
  root.add(box(0.04, 0.4, 0.04, '#3a3630', 0.12, 0.5, 0.5));
  root.add(ball(0.15, '#6e695f', -0.45, 0.1, 0.3));
  return root;
}

/** A fallen museum column, blocking a doorway. */
export function buildColumn(): THREE.Group {
  const root = new THREE.Group();
  const shaft = cylinder(0.32, 0.32, 1.6, '#d8d2c4', 0, 0.32, 0, { outline: true }, 12);
  shaft.rotation.z = Math.PI / 2;
  root.add(shaft);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    root.add(box(1.6, 0.04, 0.04, '#b8b2a4', 0, 0.32 + Math.sin(a) * 0.33, Math.cos(a) * 0.33));
  }
  root.add(box(0.5, 0.5, 0.7, '#c8c2b4', 0.9, 0.25, 0.1, { outline: true }));
  root.add(ball(0.12, '#b8b2a4', -0.6, 0.06, 0.4));
  return root;
}

/** A coihue trunk brought down by a storm, lying across a forest path. */
export function buildLog(): THREE.Group {
  const root = new THREE.Group();
  const trunk = cylinder(0.26, 0.3, 1.7, '#6a4a32', 0, 0.28, 0, { outline: true }, 9);
  trunk.rotation.z = Math.PI / 2;
  trunk.rotation.y = 0.15;
  root.add(trunk);
  root.add(cylinder(0.27, 0.27, 0.02, '#c8a070', 0.86, 0.28, 0.13, {}, 9).rotateZ(Math.PI / 2));
  root.add(box(0.06, 0.5, 0.06, '#5a3a24', -0.4, 0.62, 0.05).rotateZ(0.5), box(0.05, 0.4, 0.05, '#5a3a24', 0.3, 0.6, -0.08).rotateZ(-0.6));
  root.add(ball(0.2, '#3f6a32', -0.62, 0.82, 0.05), ball(0.16, '#4a7a3a', 0.45, 0.78, -0.1), ball(0.12, '#2f5a2a', -0.75, 0.2, 0.25));
  return root;
}

/** A museum exhibit standing on a showcase pedestal (the glass case is part of the tile). */
function buildExhibit(kind: DecorKind): THREE.Group {
  const g = new THREE.Group();
  g.position.y = 0.6;
  const o = { outline: true };
  if (kind === 'exhibit_deck' || kind === 'exhibit_clock') {
    // Artifacts from 2087: the same models as the items Andrew carried.
    const item = buildItem(kind === 'exhibit_deck' ? 'deck' : 'clock');
    item.scale.setScalar(1.5);
    item.position.y = 0.12;
    g.add(item);
  } else if (kind === 'exhibit_idol') {
    // A collector's figure of Hoshi Kirara, the (fictional) virtual idol, pink twin tails and all.
    g.add(cylinder(0.1, 0.1, 0.03, '#2a2a3a', 0, 0.015, 0, {}, 12));
    g.add(cone(0.08, 0.12, '#b48aff', 0, 0.12, 0, {}, 10), box(0.08, 0.1, 0.06, '#f4f0ff', 0, 0.22, 0));
    g.add(ball(0.06, '#ffe0d0', 0, 0.31, 0), ball(0.065, '#ff5ac8', 0, 0.33, -0.01));
    for (const x of [-0.07, 0.07]) {
      const tail = cone(0.03, 0.2, '#ff5ac8', x, 0.22, -0.02);
      tail.rotation.z = Math.PI + x * 2;
      g.add(tail);
    }
  } else if (kind === 'exhibit_meteorite') {
    // Pitted, dark iron-nickel.
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15), toon('#4a4642', { emissive: '#1a1814' }));
    rock.position.y = 0.14;
    rock.scale.set(1.2, 0.8, 1);
    g.add(outline(rock), ball(0.03, '#2a2622', 0.08, 0.2, 0.1), ball(0.025, '#2a2622', -0.06, 0.16, 0.12));
  } else if (kind === 'exhibit_ammonite') {
    // A spiral shell set in stone.
    g.add(box(0.34, 0.05, 0.26, '#a89878', 0, 0.025, 0, o));
    const shell = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 6, 14), toon('#c8a878'));
    shell.position.set(0, 0.1, 0);
    shell.rotation.x = -1.2;
    g.add(outline(shell), ball(0.04, '#b8986a', 0.03, 0.12, 0.02));
  } else if (kind === 'exhibit_trilobite') {
    // A three-lobed sea arthropod on a slab.
    g.add(box(0.34, 0.05, 0.26, '#8a8478', 0, 0.025, 0, o));
    g.add(box(0.12, 0.04, 0.2, '#5a4a3a', 0, 0.07, 0), box(0.05, 0.05, 0.2, '#4a3a2a', 0, 0.09, 0), box(0.14, 0.04, 0.05, '#5a4a3a', 0, 0.08, -0.1));
  } else if (kind === 'exhibit_lynx') {
    // A stuffed Iberian lynx: spotted coat, ear tufts, a beard of fur.
    const fur = '#c8a070';
    g.add(box(0.12, 0.12, 0.3, fur, 0, 0.16, 0, o));
    for (const [x, z] of [
      [-0.04, 0.1],
      [0.04, 0.1],
      [-0.04, -0.1],
      [0.04, -0.1],
    ]) {
      g.add(box(0.035, 0.12, 0.035, fur, x, 0.06, z));
    }
    g.add(box(0.12, 0.11, 0.1, fur, 0, 0.27, 0.17, o), box(0.025, 0.06, 0.02, '#1a1a1a', -0.04, 0.35, 0.15), box(0.025, 0.06, 0.02, '#1a1a1a', 0.04, 0.35, 0.15));
    for (let i = 0; i < 4; i++) g.add(box(0.025, 0.02, 0.025, '#3a2a1a', -0.04 + (i % 2) * 0.08, 0.22, -0.08 + i * 0.05));
  } else {
    // A model of a dodo: grey, plump, with a big hooked beak.
    g.add(ball(0.13, '#8a8a90', 0, 0.15, 0, o), ball(0.07, '#9a9aa0', 0, 0.3, 0.08), cone(0.04, 0.1, '#c8b060', 0, 0.3, 0.17).rotateX(Math.PI / 2));
    g.add(box(0.03, 0.06, 0.03, '#c8b060', -0.04, 0.03, 0), box(0.03, 0.06, 0.03, '#c8b060', 0.04, 0.03, 0), cone(0.05, 0.08, '#e8e4dc', 0, 0.2, -0.13).rotateX(-1.2));
  }
  return g;
}

/** A mineral specimen, true to how each one grows. They glow faintly so they read in the dark hall. */
function buildCrystal(kind: DecorKind): THREE.Group {
  const g = new THREE.Group();
  g.position.y = 0.6;
  g.scale.setScalar(1.7);
  const mat = (color: string, glowColor: string, opacity = 1): THREE.MeshToonMaterial =>
    toon(color, { emissive: glowColor, emissiveIntensity: 0.5, transparent: opacity < 1, opacity });
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    return m;
  };
  if (kind === 'crystal_quartz') {
    // Quartz: a clear six-sided column ending in a six-sided point.
    const clear = mat('#f4f2ff', '#5a5aa0', 0.85);
    g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 6), clear, 0, 0.1), mesh(new THREE.ConeGeometry(0.07, 0.1, 6), clear, 0, 0.25));
    g.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6), clear, 0.08, 0.06).rotateZ(-0.4));
  } else if (kind === 'crystal_beryl') {
    // Beryl: a green six-sided column, flat on top.
    const green = mat('#7ac8a0', '#1a5a3a', 0.9);
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.26, 6), green, 0, 0.13));
  } else if (kind === 'crystal_calcite') {
    // Calcite: a clear, honey-tinted rhomb.
    const honey = mat('#f0d8a0', '#6a4a20', 0.8);
    const rhomb = mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), honey, 0, 0.12);
    rhomb.rotation.set(0.6, 0.5, 0.35);
    rhomb.scale.set(1, 0.75, 1.15);
    g.add(rhomb);
  } else if (kind === 'crystal_pyrite') {
    // Pyrite: brassy little cubes in a cluster.
    const brass = mat('#d8b84a', '#5a4810');
    for (const [x, y, z, s] of [
      [0, 0.06, 0, 0.11],
      [0.08, 0.04, 0.03, 0.08],
      [-0.07, 0.04, 0.04, 0.07],
      [0.02, 0.15, -0.02, 0.07],
    ]) {
      const cube = mesh(new THREE.BoxGeometry(s, s, s), brass, x, y, z);
      cube.rotation.y = x * 3;
      g.add(cube);
    }
  } else {
    // Fluorite: purple cubes stacked like dice, tinged green at the edges.
    const purple = mat('#9a6ae0', '#3a1a6a', 0.9);
    const green = mat('#7ae0a0', '#1a5a3a', 0.9);
    g.add(mesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), purple, 0, 0.07), mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), green, 0.06, 0.17, 0.02));
  }
  return g;
}

/** A 16th-century Spanish strongbox: oak bound with iron bands, with a heavy padlock. */
export function buildChest(): THREE.Group {
  const root = new THREE.Group();
  root.add(box(0.8, 0.5, 0.5, '#6a4426', 0, 0.25, 0, { outline: true }));
  root.add(box(0.82, 0.14, 0.52, '#5a3a20', 0, 0.55, 0, { outline: true }));
  for (const x of [-0.3, 0, 0.3]) root.add(box(0.06, 0.64, 0.54, '#3a3a40', x, 0.32, 0));
  root.add(box(0.14, 0.16, 0.06, '#8a8a90', 0, 0.38, 0.28), box(0.06, 0.06, 0.03, '#1a1a1a', 0, 0.36, 0.31));
  return root;
}

/** A lab blast door, jammed halfway by a power fault: thick steel with hazard stripes. */
export function buildBlastDoor(): THREE.Group {
  const root = new THREE.Group();
  root.add(box(1.0, 1.5, 0.3, '#6a7280', 0, 0.75, 0, { outline: true }));
  for (let i = 0; i < 5; i++) {
    const stripe = box(0.12, 0.5, 0.02, i % 2 ? '#1a1a1a' : '#ffd23f', -0.36 + i * 0.18, 0.3, 0.16);
    stripe.rotation.z = 0.5;
    root.add(stripe);
  }
  root.add(box(0.9, 0.04, 0.02, '#4a5260', 0, 0.75, 0.16), glow(0.1, 0.1, 0.02, '#ff2a2a', 0.38, 1.3, 0.16));
  // The dent where it jammed.
  root.add(ball(0.14, '#5a6270', -0.15, 1.05, 0.12));
  return root;
}

export function buildItem(item: ItemId): THREE.Group {
  const g = new THREE.Group();
  const o: PartOptions = { outline: true };
  switch (item) {
    case 'amber': {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), toon('#f0a030', { emissive: '#6a3000' }));
      gem.scale.y = 1.3;
      g.add(outline(gem));
      break;
    }
    case 'obsidian':
      g.add(outline(new THREE.Mesh(new THREE.TetrahedronGeometry(0.18), toon('#2a1f3a', { emissive: '#2a1050' }))));
      break;
    case 'meteorite':
      g.add(outline(new THREE.Mesh(new THREE.DodecahedronGeometry(0.15), toon('#6d6d78'))));
      g.add(box(0.05, 0.05, 0.05, '#e0e8f0', 0.08, 0.06, 0.1, { emissive: '#606878' }));
      break;
    case 'fern':
      for (let i = 0; i < 4; i++) {
        const leaf = cone(0.05, 0.35, '#3f8f3a', 0, 0, 0);
        leaf.rotation.set(0.5, (i / 4) * Math.PI * 2, 0);
        g.add(leaf);
      }
      break;
    case 'recorder':
      g.add(box(0.24, 0.15, 0.08, '#2a2a2a', 0, 0, 0, o));
      g.add(box(0.05, 0.05, 0.02, '#ff3b3b', -0.06, 0.02, 0.05, { emissive: '#ff0000' }));
      g.add(cylinder(0.01, 0.01, 0.15, '#8a8a8a', 0.08, 0.14, 0));
      break;
    case 'bread': {
      const loaf = ball(0.12, '#8a5a32', 0, 0, 0, o);
      loaf.scale.set(1.3, 0.8, 1.3);
      g.add(loaf);
      break;
    }
    case 'pebbles':
      g.add(ball(0.06, '#a8a8a8', -0.06, 0, 0, o), ball(0.05, '#8d8d8d', 0.06, 0, 0.03, o), ball(0.045, '#b8b8b8', 0, 0, -0.06, o));
      break;
    case 'charcoal':
      g.add(box(0.26, 0.16, 0.18, '#7a5a3a', 0, 0, 0, o), ball(0.06, '#1c1c1c', -0.05, 0.1, 0), ball(0.06, '#2a2a2a', 0.05, 0.1, 0.02));
      break;
    case 'gear': {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.045, 6, 12), toon('#b8863b', { emissive: '#3a2000' }));
      g.add(outline(ring));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.add(box(0.05, 0.05, 0.05, '#b8863b', Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0));
      }
      break;
    }
    case 'quicksilver':
      g.add(cylinder(0.08, 0.1, 0.24, '#9ad1d4', 0, 0, 0, { transparent: true, opacity: 0.6, outline: true }));
      g.add(cylinder(0.07, 0.08, 0.14, '#dfe6ee', 0, -0.04, 0, { emissive: '#606870' }));
      g.add(cylinder(0.04, 0.04, 0.06, '#8b5a2b', 0, 0.15, 0));
      break;
    case 'shield': {
      // A 13th-century heater shield bearing the black cross of the Archbishopric of Cologne.
      g.add(box(0.34, 0.24, 0.05, '#f0ece0', 0, 0.06, 0, o));
      const point = box(0.24, 0.24, 0.05, '#f0ece0', 0, -0.08, 0, o);
      point.rotation.z = Math.PI / 4;
      g.add(point);
      g.add(box(0.06, 0.4, 0.02, '#1a1a1a', 0, 0, 0.03), box(0.34, 0.06, 0.02, '#1a1a1a', 0, 0.08, 0.03));
      break;
    }
    case 'top':
      g.add(cone(0.12, 0.16, '#b8864a', 0, 0.02, 0, o, 10).rotateX(Math.PI), cylinder(0.12, 0.12, 0.04, '#b02a2a', 0, 0.09, 0, {}, 10));
      g.add(cylinder(0.015, 0.015, 0.1, '#4a3020', 0, 0.15, 0));
      break;
    case 'firewood':
      for (let i = 0; i < 4; i++) {
        const log = cylinder(0.04, 0.04, 0.34, i % 2 ? '#7a5230' : '#9a6a40', -0.06 + (i % 2) * 0.08, Math.floor(i / 2) * 0.07, 0, o, 6);
        log.rotation.z = Math.PI / 2;
        g.add(log);
      }
      g.add(box(0.03, 0.18, 0.2, '#8a2a2a', 0, 0.04, 0));
      break;
    case 'maqui':
      g.add(cone(0.06, 0.24, '#3f8f3a', 0, 0.06, 0), ball(0.05, '#3a1a4a', -0.06, 0, 0.04, o), ball(0.05, '#4a2a5a', 0.05, 0, 0.03, o), ball(0.045, '#2a1438', 0, 0.02, -0.05, o));
      break;
    case 'pali':
      g.add(ball(0.11, '#a8783a', 0, 0, 0, o, 10));
      break;
    case 'deck': {
      // A hacker's cyberdeck: a chunky keyboard base with a flip-up glowing screen, covered in stickers.
      g.add(box(0.34, 0.06, 0.22, '#c8ccd8', 0, 0, 0.02, o));
      for (let i = 0; i < 3; i++) g.add(glow(0.26, 0.012, 0.03, i === 1 ? '#3fe0ff' : '#7a8aa0', 0, 0.035, -0.04 + i * 0.05));
      const screen = box(0.3, 0.18, 0.02, '#2a2a3a', 0, 0.12, -0.1, o);
      screen.rotation.x = -0.35;
      screen.add(glow(0.26, 0.14, 0.012, '#ff3fd0', 0, 0, 0.012));
      g.add(screen);
      g.add(box(0.06, 0.04, 0.005, '#ffd23f', 0.1, 0.034, 0.1), box(0.05, 0.05, 0.005, '#5aff8a', -0.11, 0.034, 0.09));
      g.add(cylinder(0.008, 0.008, 0.16, '#5a5e6a', 0.15, 0.12, -0.08), ball(0.018, '#ff2a2a', 0.15, 0.2, -0.08));
      break;
    }
    case 'gold':
      g.add(outline(new THREE.Mesh(new THREE.DodecahedronGeometry(0.11), toon('#f1c232', { emissive: '#5a4000' }))));
      break;
    case 'lodestone':
      g.add(outline(new THREE.Mesh(new THREE.DodecahedronGeometry(0.14), toon('#3a3a42'))));
      g.add(box(0.03, 0.03, 0.03, '#9aa0b0', 0.06, 0.08, 0.08), box(0.03, 0.03, 0.03, '#9aa0b0', -0.07, 0.04, 0.06));
      break;
    case 'pifilka':
      g.add(cylinder(0.05, 0.06, 0.26, '#a0703a', 0, 0, 0, o, 8), cylinder(0.025, 0.025, 0.02, '#1a1a1a', 0, 0.14, 0));
      break;
    case 'canelo':
      g.add(box(0.26, 0.05, 0.08, '#8a5a3a', 0, 0, 0, o), cone(0.05, 0.18, '#3f8f3a', 0.12, 0.06, 0));
      break;
    case 'clock':
      g.add(box(0.26, 0.18, 0.18, '#9aa6bb', 0, 0, 0, o), glow(0.12, 0.08, 0.02, '#ff6bd6', 0, 0.02, 0.1));
      break;
    case 'tape': {
      const reel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.05, 6, 14), toon('#c87533', { emissive: '#3a1a00' }));
      g.add(outline(reel), cylinder(0.06, 0.06, 0.08, '#7fd8ff', 0, 0, 0).rotateX(Math.PI / 2));
      break;
    }
    case 'powercell':
      g.add(box(0.14, 0.26, 0.14, '#2a2a3a', 0, 0, 0, o), glow(0.1, 0.16, 0.02, '#5aff8a', 0, 0, 0.08), box(0.06, 0.04, 0.06, '#9aa6bb', 0, 0.15, 0));
      break;
    case 'water':
      // A leather water flask with a wooden stopper.
      g.add(cylinder(0.1, 0.12, 0.26, '#7a5a3a', 0, 0, 0, o, 10), cylinder(0.03, 0.03, 0.06, '#c8a070', 0, 0.16, 0));
      g.add(box(0.2, 0.03, 0.02, '#3a7ab8', 0, 0.02, 0.11));
      break;
    case 'quartz': {
      // A museum quartz crystal: a clear hexagonal prism on a small base.
      const crystal = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.28, 6), toon('#f0ecff', { emissive: '#3a3060', transparent: true, opacity: 0.85 }));
      crystal.position.y = 0.08;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 6), toon('#f0ecff', { emissive: '#3a3060' }));
      tip.position.y = 0.27;
      g.add(outline(crystal), tip, box(0.18, 0.05, 0.18, '#5a5650', 0, -0.08, 0));
      break;
    }
    case 'navmodule':
      // An Institute navigation module: a rugged case with a green trace display and gold contacts.
      g.add(box(0.24, 0.08, 0.18, '#9aa6bb', 0, 0, 0, o), glow(0.16, 0.01, 0.1, '#5aff8a', 0, 0.045, 0));
      for (let i = 0; i < 4; i++) g.add(box(0.03, 0.02, 0.03, '#f1c232', -0.075 + i * 0.05, -0.02, 0.1));
      break;
    case 'emitter': {
      // A long-range field emitter: a copper coil around a glowing core, in an Institute housing.
      g.add(box(0.26, 0.05, 0.18, '#9aa6bb', 0, -0.1, 0, o));
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 14), toon('#c87533', { emissive: '#3a1a00' }));
      coil.rotation.x = Math.PI / 2;
      g.add(outline(coil), glow(0.07, 0.16, 0.07, '#7fd8ff', 0, 0, 0));
      break;
    }
    case 'notes':
      g.add(box(0.24, 0.04, 0.18, '#e8e0cc', 0, 0, 0, o), box(0.18, 0.01, 0.02, '#5a5a6a', 0, 0.03, 0.03));
      break;
    case 'core': {
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), toon('#c9a0ff', { emissive: '#5a3aaa' }));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 20), toon('#7fd8ff', { emissive: '#1a5a7a' }));
      ring.rotation.x = Math.PI / 2;
      g.add(outline(crystal), ring);
      break;
    }
  }
  return g;
}

/** The shield strapped to Andrew's back once he has it. */
export function buildBackShield(): THREE.Group {
  const g = buildItem('shield');
  g.scale.setScalar(1.3);
  return g;
}

export interface GateRig {
  root: THREE.Group;
  update(time: number, open: boolean): void;
}

export function buildGate(look: 'laser' | 'door' | 'palisade'): GateRig {
  const root = new THREE.Group();
  if (look === 'laser') {
    root.add(box(0.12, 1.3, 0.12, '#2a2e3a', -0.45, 0.65, 0, { outline: true }), box(0.12, 1.3, 0.12, '#2a2e3a', 0.45, 0.65, 0, { outline: true }));
    const beams = [0.3, 0.6, 0.9, 1.2].map((y) => glow(0.8, 0.03, 0.03, '#ff2a4a', 0, y, 0));
    root.add(...beams);
    return {
      root,
      update(time, open) {
        for (const beam of beams) {
          beam.visible = !open;
          beam.scale.y = 1 + Math.sin(time * 30) * 0.3;
        }
      },
    };
  }
  if (look === 'door') {
    const slab = box(0.96, 1.4, 0.16, '#5a6170', 0, 0.7, 0, { outline: true });
    // The light strip shows on both faces: doors are seen from either side.
    slab.add(glow(0.5, 0.05, 0.02, '#3fe0ff', 0, 0.3, 0.09), glow(0.5, 0.05, 0.02, '#3fe0ff', 0, 0.3, -0.09));
    root.add(slab);
    return {
      root,
      update(_time, open) {
        slab.position.y += ((open ? 2.2 : 0.7) - slab.position.y) * 0.15;
      },
    };
  }
  const stakes = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    stakes.add(cylinder(0.08, 0.09, 1.5, '#7a5a3a', -0.4 + i * 0.2, 0.75, 0, { outline: true }, 6));
    stakes.add(cone(0.09, 0.2, '#6a4a2a', -0.4 + i * 0.2, 1.6, 0, {}, 6));
  }
  root.add(stakes);
  return {
    root,
    update(_time, open) {
      stakes.position.x += ((open ? -0.95 : 0) - stakes.position.x) * 0.12;
    },
  };
}

export interface DecorRig {
  root: THREE.Group;
  update(time: number): void;
}

/** White METRO lettering on a blue band, drawn once into a texture. */
let metroTexture: THREE.CanvasTexture | null = null;
function metroLabel(): THREE.CanvasTexture {
  if (metroTexture) return metroTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2a4a8a';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#e6e2d6';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('METRO', 64, 17);
  }
  metroTexture = new THREE.CanvasTexture(canvas);
  metroTexture.colorSpace = THREE.SRGBColorSpace;
  return metroTexture;
}

/** Draws a line of text at `size` px, shrinking it until it fits `maxWidth` (fonts differ between devices). */
export function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, bold: boolean, maxWidth: number): void {
  let px = size;
  do {
    ctx.font = `${bold ? 'bold ' : ''}${px}px sans-serif`;
    px -= 1;
  } while (px > 6 && ctx.measureText(text).width > maxWidth);
  ctx.fillText(text, x, y);
}

let restrictedTexture: THREE.CanvasTexture | null = null;

/** 立入禁止 ("no entry"), with the English underneath and whose land it is. */
function restrictedLabel(): THREE.CanvasTexture {
  if (restrictedTexture) return restrictedTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f4f2ec';
    ctx.fillRect(0, 0, 192, 128);
    ctx.strokeStyle = '#d0282a';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 182, 118);
    ctx.fillStyle = '#d0282a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitText(ctx, '立入禁止', 96, 46, 40, true, 160);
    ctx.fillStyle = '#1a1d24';
    fitText(ctx, 'RESTRICTED AREA', 96, 82, 17, true, 160);
    fitText(ctx, 'CHRONOS CORP · DRONE PATROLS', 96, 104, 13, false, 160);
  }
  restrictedTexture = new THREE.CanvasTexture(canvas);
  restrictedTexture.colorSpace = THREE.SRGBColorSpace;
  return restrictedTexture;
}

/** Set dressing that doesn't fit the tile grid: statues, flags, skeletons, holograms. */
export function buildDecor(kind: DecorKind): DecorRig {
  const root = new THREE.Group();
  const still = { root, update: () => {} };
  switch (kind) {
    case 'whale': {
      // A whale skeleton hanging in the museum's main hall.
      const bone = '#ece4d0';
      for (let i = 0; i < 22; i++) {
        const z = -3 + i * 0.28;
        const size = 0.18 * (1 - Math.abs(i - 7) / 26);
        root.add(box(size, size, 0.2, bone, 0, 1.6 - i * 0.02, z, { outline: true }));
        if (i > 2 && i < 13) {
          const rib = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 4, 10, Math.PI), toon(bone));
          rib.position.set(0, 1.55, z);
          rib.rotation.z = Math.PI;
          rib.castShadow = true;
          root.add(rib);
        }
      }
      root.add(box(0.9, 0.35, 1.6, bone, 0, 1.55, -3.9, { outline: true }));
      for (const z of [-2.2, 1.5]) root.add(cylinder(0.04, 0.04, 1.5, '#5a5a62', 0, 0.75, z));
      return still;
    }
    case 'metrosign': {
      // Metro de Madrid's rhombus: a red diamond crossed by a blue band reading METRO, rusted after decades of drought.
      const sign = new THREE.Group();
      sign.position.set(0, 1.6, -0.3);
      // Leaning back towards the high camera, so the diamond reads from above instead of edge-on.
      sign.rotation.set(-0.75, 0, 0.12);
      sign.scale.setScalar(1.3);
      const red = box(0.6, 0.6, 0.04, '#b8322a', 0, 0, 0, { outline: true });
      red.rotation.z = Math.PI / 4;
      const inner = box(0.44, 0.44, 0.02, '#e6dccb', 0, 0, 0.025);
      inner.rotation.z = Math.PI / 4;
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.22, 0.04), [
        toon('#2a4a8a'),
        toon('#2a4a8a'),
        toon('#2a4a8a'),
        toon('#2a4a8a'),
        new THREE.MeshBasicMaterial({ map: metroLabel() }),
        toon('#2a4a8a'),
      ]);
      band.position.z = 0.05;
      sign.add(red, inner, band, box(0.12, 0.08, 0.01, '#7a4a2a', 0.18, -0.2, 0.04), box(0.08, 0.1, 0.01, '#7a4a2a', -0.2, 0.17, 0.04));
      root.add(cylinder(0.04, 0.05, 1.6, '#6a4a3a', 0, 0.8, -0.3), sign);
      return still;
    }
    case 'hachiko': {
      // The bronze statue of Hachikō, the faithful Akita dog of Shibuya Station.
      const bronze = '#6a5a3a';
      root.add(box(0.9, 0.6, 0.9, '#5a5866', 0, 0.3, 0, { outline: true }));
      root.add(box(0.3, 0.32, 0.6, bronze, 0, 0.82, -0.02, { outline: true }));
      root.add(box(0.26, 0.26, 0.26, bronze, 0, 1.08, 0.3, { outline: true }), box(0.14, 0.12, 0.14, bronze, 0, 1.02, 0.46));
      root.add(cone(0.05, 0.12, bronze, -0.08, 1.26, 0.28), cone(0.05, 0.12, bronze, 0.08, 1.26, 0.28));
      root.add(box(0.1, 0.3, 0.1, bronze, -0.08, 0.75, 0.22), box(0.1, 0.3, 0.1, bronze, 0.08, 0.75, 0.22));
      const tail = box(0.06, 0.06, 0.22, bronze, 0, 1.02, -0.32);
      tail.rotation.x = -0.9;
      root.add(tail);
      return still;
    }
    case 'burgundy': {
      // The Cross of Burgundy, flown by Spanish troops in the 16th century.
      root.add(cylinder(0.04, 0.04, 3, '#5a3a1e', 0, 1.5, 0));
      const cloth = new THREE.Group();
      cloth.position.set(0.45, 2.6, 0);
      cloth.add(box(0.9, 0.6, 0.02, '#f0ece0'));
      for (const angle of [0.6, -0.6]) {
        const bar = box(1, 0.08, 0.03, '#b02020');
        bar.rotation.z = angle;
        cloth.add(bar);
      }
      root.add(cloth);
      return { root, update: (time) => (cloth.rotation.y = Math.sin(time * 2) * 0.15) };
    }
    case 'cologne': {
      root.add(cylinder(0.04, 0.04, 2.6, '#5a3a1e', 0, 1.3, 0));
      const cloth = new THREE.Group();
      cloth.position.set(0, 2.1, 0.06);
      cloth.add(box(0.6, 0.8, 0.02, '#f0ece0'), box(0.1, 0.8, 0.03, '#1a1a1a'), box(0.6, 0.1, 0.03, '#1a1a1a', 0, 0.1, 0));
      root.add(cloth);
      return { root, update: (time) => (cloth.rotation.y = Math.sin(time * 1.6) * 0.12) };
    }
    case 'hologram': {
      // A giant hologram of an (original, fictional) virtual idol, Hoshi Kirara, dancing in the rain.
      const holo = (color: string, opacity = 0.7): THREE.MeshBasicMaterial =>
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
      const pink = holo('#ff5ac8');
      const white = holo('#f4f0ff', 0.75);
      const lilac = holo('#b48aff');
      const cyan = holo('#3fe0ff', 0.8);
      const skin = holo('#ffe0d0', 0.75);
      const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z = 0): THREE.Mesh => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        return mesh;
      };
      // The projector on the ground and its beam.
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 4, 24), new THREE.MeshBasicMaterial({ color: '#3fe0ff' }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      root.add(ring, part(new THREE.CylinderGeometry(0.45, 0.55, 0.12, 16), new THREE.MeshBasicMaterial({ color: '#1a1d2a' }), 0, 0.06));
      root.add(part(new THREE.CylinderGeometry(0.5, 0.2, 3.2, 16, 1, true), holo('#3fe0ff', 0.08), 0, 1.7));
      const idol = new THREE.Group();
      idol.position.y = 0.3;
      root.add(idol);
      // Legs, skirt and top.
      const legL = part(new THREE.CylinderGeometry(0.07, 0.06, 0.8, 6), white, -0.11, 0.45);
      const legR = part(new THREE.CylinderGeometry(0.07, 0.06, 0.8, 6), white, 0.11, 0.45);
      idol.add(legL, legR, part(new THREE.ConeGeometry(0.42, 0.45, 10, 1, true), lilac, 0, 0.98));
      idol.add(part(new THREE.BoxGeometry(0.42, 0.5, 0.26), white, 0, 1.4), part(new THREE.BoxGeometry(0.1, 0.32, 0.02), cyan, 0, 1.42, 0.14));
      const arm = (side: number): THREE.Group => {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.27, 1.6, 0);
        pivot.add(part(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6), skin, 0, -0.27));
        pivot.add(part(new THREE.BoxGeometry(0.13, 0.12, 0.13), lilac, 0, -0.08));
        idol.add(pivot);
        return pivot;
      };
      const armL = arm(-1);
      const armR = arm(1);
      // Head, big eyes, bangs, star hairclips and long pink twin tails.
      const head = new THREE.Group();
      head.position.y = 1.95;
      idol.add(head);
      head.add(part(new THREE.SphereGeometry(0.27, 12, 10), skin, 0, 0));
      head.add(part(new THREE.SphereGeometry(0.29, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), pink, 0, 0.03));
      for (const x of [-0.1, 0.1]) head.add(part(new THREE.BoxGeometry(0.08, 0.11, 0.02), cyan, x, -0.02, 0.26));
      for (const x of [-0.22, 0.22]) head.add(part(new THREE.OctahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: '#ffd23f' }), x, 0.22, 0.05));
      const tails: THREE.Group[] = [];
      for (const side of [-1, 1]) {
        const tail = new THREE.Group();
        tail.position.set(side * 0.28, 0.12, -0.02);
        const strand = part(new THREE.ConeGeometry(0.13, 1.5, 8), pink, 0, -0.72);
        strand.rotation.z = Math.PI;
        tail.add(strand);
        head.add(tail);
        tails.push(tail);
      }
      // Music notes floating around her.
      const notes = [0, 1, 2].map((i) => {
        const note = part(new THREE.SphereGeometry(0.07, 6, 5), cyan, 0, 0);
        root.add(note);
        return { note, i };
      });
      return {
        root,
        update(time) {
          const beat = time * 4;
          idol.rotation.y = Math.sin(time * 0.8) * 0.6;
          idol.position.y = 0.3 + Math.abs(Math.sin(beat)) * 0.08;
          armL.rotation.z = -0.4 - Math.abs(Math.sin(beat)) * 1.6;
          armR.rotation.z = 0.4 + Math.abs(Math.cos(beat)) * 1.6;
          legL.rotation.x = Math.sin(beat) * 0.25;
          legR.rotation.x = -Math.sin(beat) * 0.25;
          tails.forEach((tail, i) => (tail.rotation.z = (i ? 1 : -1) * (0.15 + Math.sin(beat + i) * 0.12)));
          head.rotation.z = Math.sin(beat * 0.5) * 0.12;
          // Holograms flicker.
          const flicker = Math.random() < 0.04 ? 0.35 : 1;
          for (const m of [pink, white, lilac, cyan, skin]) m.opacity = (m === white || m === skin ? 0.75 : 0.7) * flicker;
          ring.rotation.z = time;
          for (const { note, i } of notes) {
            const a = time * 1.2 + (i * Math.PI * 2) / 3;
            note.position.set(Math.cos(a) * 0.8, 1.2 + ((time * 0.5 + i * 0.33) % 1) * 1.6, Math.sin(a) * 0.8);
          }
        },
      };
    }
    case 'restricted': {
      // A "no entry" board at a bridge into Chronos Corp's district, leaning back toward the camera.
      root.add(cylinder(0.035, 0.04, 1.3, '#3a3c46', 0, 0.65, 0));
      const sign = new THREE.Group();
      sign.position.set(0, 1.4, 0.02);
      sign.rotation.x = -0.75;
      sign.scale.setScalar(1.35);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.62), new THREE.MeshBasicMaterial({ map: restrictedLabel() }));
      face.position.z = 0.03;
      sign.add(box(1.0, 0.67, 0.04, '#2a2c34', 0, 0, 0, { outline: true }), face);
      root.add(sign);
      return still;
    }
    case 'pedestrian': {
      // Someone waiting in the June rain under an umbrella; clear vinyl ones are everywhere in Tokyo.
      const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];
      const person = buildHuman(pick(['citizen', 'vendor', 'hacker'] as const), {
        top: pick(['#3a2a5a', '#2a4a6a', '#6a2a3a', '#2a2a30', '#5a5a64']),
        pants: pick(['#14141e', '#2a2a3a', '#3a3424']),
        apron: undefined,
        kerchief: undefined,
      });
      person.root.rotation.y = (Math.random() - 0.5) * 2.4;
      root.add(person.root);
      const vinyl = Math.random() < 0.5;
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.18, 10, 1, true),
        new THREE.MeshToonMaterial({ color: vinyl ? '#e8f0f4' : pick(['#1a2a4a', '#8a1a2a', '#1a1a1e', '#2a5a3a']), transparent: vinyl, opacity: vinyl ? 0.45 : 1, side: THREE.DoubleSide }),
      );
      canopy.position.set(0.12, 1.32, 0);
      const handle = cylinder(0.012, 0.012, 0.55, '#d8d8d8', 0.12, 1.05, 0, {}, 4);
      root.add(canopy, handle);
      const phase = Math.random() * 10;
      return {
        root,
        update(time) {
          person.animate(time + phase, 0);
          // Shifting from foot to foot, and the umbrella with them.
          canopy.rotation.z = Math.sin((time + phase) * 0.8) * 0.06;
        },
      };
    }
    case 'archer_n':
    case 'archer_s': {
      // A crossbowman posted in an arrow-slit alcove, aiming across the gallery.
      const archer = buildHuman('guard');
      archer.root.rotation.y = kind === 'archer_s' ? 0 : Math.PI;
      root.add(archer.root);
      return { root, update: (time) => archer.animate(time, 0) };
    }
    case 'rack': {
      // A wooden rack with strips of charqui (dried meat) curing in the air.
      for (const x of [-0.4, 0.4]) {
        const leg = cylinder(0.03, 0.03, 1.1, '#6a4a2a', x, 0.5, 0, {}, 5);
        leg.rotation.z = x > 0 ? 0.15 : -0.15;
        root.add(leg);
      }
      root.add(cylinder(0.025, 0.025, 0.9, '#6a4a2a', 0, 1.0, 0, {}, 5).rotateZ(Math.PI / 2));
      for (let i = 0; i < 5; i++) root.add(box(0.06, 0.32, 0.02, i % 2 ? '#7a2a1a' : '#a84a2a', -0.3 + i * 0.15, 0.82, 0));
      return still;
    }
    case 'pudu': {
      // The pudú, the world's smallest deer, native to southern Chile's forests.
      const body = new THREE.Group();
      body.add(box(0.18, 0.16, 0.34, '#8a5a3a', 0, 0.28, 0, { outline: true }), box(0.12, 0.12, 0.14, '#7a4a2a', 0, 0.42, 0.2, { outline: true }));
      body.add(box(0.02, 0.06, 0.02, '#4a3020', -0.03, 0.51, 0.18), box(0.02, 0.06, 0.02, '#4a3020', 0.03, 0.51, 0.18));
      for (const [x, z] of [[-0.06, -0.12], [0.06, -0.12], [-0.06, 0.12], [0.06, 0.12]]) body.add(box(0.04, 0.2, 0.04, '#4a3020', x, 0.1, z));
      root.add(body);
      return { root, update: (time) => (body.rotation.y = Math.sin(time * 0.4) * 0.6) };
    }
    case 'horse': {
      const coat = '#6a4428';
      root.add(box(0.42, 0.42, 1.0, coat, 0, 0.82, 0, { outline: true }));
      const neck = box(0.2, 0.55, 0.24, coat, 0, 1.15, 0.45, { outline: true });
      neck.rotation.x = 0.5;
      root.add(neck, box(0.2, 0.22, 0.42, coat, 0, 1.38, 0.62, { outline: true }));
      for (const [x, z] of [[-0.14, -0.36], [0.14, -0.36], [-0.14, 0.36], [0.14, 0.36]]) root.add(cylinder(0.05, 0.045, 0.62, coat, x, 0.31, z, {}, 6));
      root.add(box(0.06, 0.45, 0.08, '#3a2414', 0, 0.75, -0.55));
      // Corral fence
      for (const z of [-0.8, 0.8]) root.add(box(1.4, 0.06, 0.06, '#7a5a3a', 0, 0.7, z), box(1.4, 0.06, 0.06, '#7a5a3a', 0, 0.4, z));
      return still;
    }
    case 'torii': {
      // A Shinto shrine seen from its gate: a vermilion torii, a stone path, and the hall (honden) beyond,
      // with a shimenawa rope of twisted rice straw and an offering box at the front.
      const red = '#c8321e';
      const o = { outline: true };
      for (const x of [-1.05, 1.05]) root.add(cylinder(0.11, 0.13, 2.7, red, x, 1.35, 0, o, 8), cylinder(0.16, 0.16, 0.2, '#1a1a1a', x, 0.1, 0, {}, 8));
      root.add(box(3.0, 0.16, 0.26, '#1a1a1a', 0, 2.78, 0, o), box(2.6, 0.13, 0.16, red, 0, 2.45, 0), box(0.16, 0.34, 0.1, red, 0, 2.6, 0));
      root.add(box(3.2, 0.08, 0.32, '#1a1a1a', 0, 2.9, 0));
      // The hall sits on the five-by-two block of tiles behind the gate.
      const hall = new THREE.Group();
      hall.position.set(0, 0, -4.5);
      hall.add(box(4.8, 0.3, 2.0, '#8a8a84', 0, 0.15, 0, o));
      for (const x of [-2.2, -0.75, 0.75, 2.2]) hall.add(cylinder(0.09, 0.09, 1.5, red, x, 1.05, 0.85, {}, 8));
      hall.add(box(4.4, 1.3, 1.6, '#8a5a3a', 0, 0.95, -0.1, o), box(4.0, 1.0, 0.05, '#f0e8d8', 0, 0.95, 0.71));
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 5.4, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), toon('#2a3a34'));
      roof.position.set(0, 2.15, 0);
      roof.scale.set(1, 0.6, 1.2);
      roof.castShadow = true;
      hall.add(roof, box(5.0, 0.1, 0.12, '#d8b84a', 0, 2.55, 0));
      const rope = cylinder(0.09, 0.09, 3.6, '#e8d8a0', 0, 1.8, 0.95, {}, 8);
      rope.rotation.z = Math.PI / 2;
      hall.add(rope);
      for (const x of [-1, 0, 1]) hall.add(box(0.12, 0.3, 0.02, '#ffffff', x, 1.55, 0.97));
      hall.add(box(1.0, 0.45, 0.5, '#5a3a24', 0, 0.52, 1.25, o), box(0.04, 0.9, 0.04, '#e8d8a0', 0.3, 1.25, 1.0));
      root.add(hall);
      return still;
    }
    case 'crystal_calcite':
    case 'crystal_beryl':
    case 'crystal_pyrite':
    case 'crystal_quartz':
    case 'crystal_fluorite':
      // Mineral specimens on a showcase pedestal (the case's glass is part of the tile).
      root.add(buildCrystal(kind));
      return still;
    case 'exhibit_meteorite':
    case 'exhibit_ammonite':
    case 'exhibit_trilobite':
    case 'exhibit_lynx':
    case 'exhibit_dodo':
    case 'exhibit_deck':
    case 'exhibit_clock':
    case 'exhibit_idol':
      root.add(buildExhibit(kind));
      return still;
    case 'megatherium': {
      // Megatherium americanum, a giant ground sloth. The Madrid skeleton (1788) was the first fossil skeleton ever mounted.
      const bone = '#e0d4b8';
      root.add(box(0.5, 0.15, 0.4, '#5a5048', 0, 0.08, 0, { outline: true }));
      root.add(box(0.12, 0.12, 1.6, bone, 0, 1.25, 0, { outline: true }));
      for (let i = 0; i < 6; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 4, 10, Math.PI), toon(bone));
        rib.position.set(0, 1.2, -0.45 + i * 0.18);
        rib.rotation.z = Math.PI;
        root.add(rib);
      }
      root.add(box(0.5, 0.35, 0.5, bone, 0, 1.0, -0.7, { outline: true }));
      root.add(box(0.26, 0.26, 0.42, bone, 0, 1.25, 1.0, { outline: true }));
      for (const [x, z] of [[-0.3, -0.6], [0.3, -0.6], [-0.25, 0.55], [0.25, 0.55]]) root.add(cylinder(0.07, 0.06, 1.1, bone, x, 0.6, z, { outline: true }, 6));
      root.add(cylinder(0.12, 0.04, 0.9, bone, 0, 0.75, -1.3, { outline: true }, 6).rotateX(-0.7));
      return still;
    }
    case 'skull': {
      root.add(box(0.5, 0.7, 0.5, '#3a3a42', 0, 0.35, 0, { outline: true }));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), toon('#d8ccb0'));
      dome.position.set(0, 0.85, 0);
      root.add(dome, box(0.3, 0.16, 0.36, '#d8ccb0', 0, 0.78, 0.08));
      return still;
    }
  }
}
