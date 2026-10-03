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
    case 'charqui':
      for (let i = 0; i < 3; i++) g.add(box(0.06, 0.03, 0.26, i % 2 ? '#7a2a1a' : '#a84a2a', -0.07 + i * 0.07, 0, 0, o));
      break;
    case 'deck':
      g.add(box(0.3, 0.05, 0.2, '#1a1a2a', 0, 0, 0, o), glow(0.2, 0.01, 0.1, '#ff3fd0', 0, 0.03, 0));
      break;
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

/** The shield strapped to Elias's back once he has it. */
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
    slab.add(glow(0.5, 0.05, 0.02, '#3fe0ff', 0, 0.3, 0.09));
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
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 4, 24), new THREE.MeshBasicMaterial({ color: '#3fe0ff' }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 0.7),
        new THREE.MeshBasicMaterial({ color: '#ff3fd0', transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
      );
      panel.position.y = 1.4;
      root.add(ring, panel);
      return {
        root,
        update(time) {
          panel.rotation.y = time * 0.6;
          (panel.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(time * 7) * 0.08;
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
      // A Shinto shrine: vermilion torii gate in front of a small wooden hall, with paper lanterns.
      const red = '#c8321e';
      for (const x of [-0.7, 0.7]) root.add(cylinder(0.08, 0.09, 1.9, red, x, 0.95, 0, { outline: true }, 8));
      root.add(box(2.0, 0.12, 0.18, '#1a1a1a', 0, 1.95, 0, { outline: true }), box(1.8, 0.1, 0.12, red, 0, 1.7, 0));
      root.add(box(2.2, 0.06, 0.24, '#1a1a1a', 0, 2.05, 0));
      const hall = new THREE.Group();
      hall.position.set(0, 0, -2.5);
      hall.add(box(2.6, 1.1, 1.6, '#8a5a3a', 0, 0.55, 0, { outline: true }), box(2.4, 0.9, 0.05, '#f0e8d8', 0, 0.6, 0.81));
      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.0, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), toon('#2a2a30'));
      roof.position.set(0, 1.45, 0);
      roof.scale.set(1, 0.7, 1.3);
      roof.castShadow = true;
      hall.add(roof);
      root.add(hall);
      const lanterns: THREE.MeshBasicMaterial[] = [];
      for (const x of [-1.2, 1.2]) {
        root.add(cylinder(0.03, 0.03, 1.2, '#3a2a1a', x, 0.6, -0.8, {}, 5));
        const glowMat = new THREE.MeshBasicMaterial({ color: '#ff9a4a' });
        lanterns.push(glowMat);
        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 10), glowMat);
        lantern.position.set(x, 1.3, -0.8);
        root.add(lantern);
      }
      return { root, update: (time) => lanterns.forEach((m, i) => m.color.setHSL(0.07, 1, 0.6 + Math.sin(time * 3 + i) * 0.05)) };
    }
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
