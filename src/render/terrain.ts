import * as THREE from 'three';
import { hash2 } from '../engine/random.ts';
import type { TileLook } from '../game/tiledefs.ts';
import type { TileMap } from '../game/tilemap.ts';
import { toon } from './materials.ts';

/*
 * Turns the tile map into low-poly 3D scenery. Repeated shapes (floor tiles,
 * grass blades, tree canopies...) are batched into InstancedMeshes so the whole
 * map is only a few dozen draw calls.
 */

type Shape =
  | 'floor'
  | 'water'
  | 'block'
  | 'trunk'
  | 'canopy'
  | 'conifer'
  | 'blade'
  | 'blob'
  | 'frond'
  | 'pebble'
  | 'bone'
  | 'barrel'
  | 'petal'
  | 'prism'
  | 'flatcone'
  | 'stake'
  | 'neon';

const GEOMETRIES: Record<Shape, () => THREE.BufferGeometry> = {
  floor: () => new THREE.BoxGeometry(1, 0.2, 1).translate(0, -0.1, 0),
  water: () => new THREE.BoxGeometry(1, 0.2, 1).translate(0, -0.1, 0),
  block: () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  trunk: () => new THREE.CylinderGeometry(0.11, 0.16, 1, 6).translate(0, 0.5, 0),
  canopy: () => new THREE.IcosahedronGeometry(0.62, 0),
  conifer: () => new THREE.ConeGeometry(0.62, 1.1, 7),
  blade: () => new THREE.ConeGeometry(0.05, 1, 3).translate(0, 0.5, 0),
  blob: () => new THREE.IcosahedronGeometry(0.42, 0),
  frond: () => new THREE.BoxGeometry(0.14, 0.03, 0.75).translate(0, 0, 0.37),
  pebble: () => new THREE.DodecahedronGeometry(0.12),
  bone: () => new THREE.CylinderGeometry(0.035, 0.035, 0.42, 5),
  barrel: () => new THREE.CylinderGeometry(0.32, 0.32, 0.8, 10).translate(0, 0.4, 0),
  petal: () => new THREE.SphereGeometry(0.06, 5, 4),
  // Triangular prism along X, for thatched and tiled roofs.
  prism: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 0.25, 0),
  flatcone: () => new THREE.ConeGeometry(0.8, 0.35, 8),
  stake: () => new THREE.CylinderGeometry(0.1, 0.11, 1, 6).translate(0, 0.5, 0),
  neon: () => new THREE.BoxGeometry(1, 1, 1),
};

/** Shapes that don't cast shadows (flat ground, tiny details). */
const NO_SHADOW = new Set<Shape>(['floor', 'water', 'petal', 'pebble', 'bone', 'neon']);

interface Instance {
  matrix: THREE.Matrix4;
  color: THREE.Color;
}

const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpEuler = new THREE.Euler();

class Batch {
  private readonly instances = new Map<Shape, Instance[]>();

  add(shape: Shape, x: number, y: number, z: number, color: THREE.ColorRepresentation, scale: [number, number, number] = [1, 1, 1], rotation: [number, number, number] = [0, 0, 0]): void {
    tmpPos.set(x, y, z);
    tmpQuat.setFromEuler(tmpEuler.set(rotation[0], rotation[1], rotation[2]));
    tmpScale.set(scale[0], scale[1], scale[2]);
    const list = this.instances.get(shape) ?? [];
    list.push({ matrix: new THREE.Matrix4().compose(tmpPos, tmpQuat, tmpScale), color: new THREE.Color(color) });
    this.instances.set(shape, list);
  }

  build(group: THREE.Group, water: THREE.Material): void {
    for (const [shape, list] of this.instances) {
      const material = shape === 'water' ? water : shape === 'neon' ? new THREE.MeshBasicMaterial({ color: '#ffffff' }) : toon('#ffffff');
      const mesh = new THREE.InstancedMesh(GEOMETRIES[shape](), material, list.length);
      list.forEach((instance, i) => {
        mesh.setMatrixAt(i, instance.matrix);
        mesh.setColorAt(i, instance.color);
      });
      mesh.castShadow = !NO_SHADOW.has(shape);
      mesh.receiveShadow = true;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
    }
  }
}

/** Slight per-tile color variation keeps large areas from looking flat. */
function vary(color: string, tx: number, ty: number, amount = 0.03): THREE.Color {
  const c = new THREE.Color(color);
  const v = (hash2(tx, ty, 99) - 0.5) * amount;
  return c.offsetHSL(0, 0, v);
}

export interface Terrain {
  group: THREE.Group;
  update(time: number): void;
}

export function buildTerrain(map: TileMap): Terrain {
  const group = new THREE.Group();
  const batch = new Batch();
  const waterMaterial = new THREE.MeshToonMaterial({ color: '#ffffff', transparent: true, opacity: 0.82 });
  const glows: Array<{ material: THREE.MeshBasicMaterial; base: THREE.Color }> = [];

  const lookAt = (tx: number, ty: number): TileLook | null => (map.inBounds(tx, ty) ? map.def(tx, ty).look : null);
  const floor = (tx: number, ty: number, color: string, amount = 0.025, y = 0): void =>
    batch.add('floor', tx + 0.5, y, ty + 0.5, vary(color, tx, ty, amount));
  const r = (tx: number, ty: number, salt: number): number => hash2(tx, ty, salt);
  const abandoned = map.tileset['.']?.look === 'dust';

  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const look = map.def(tx, ty).look;
      const cx = tx + 0.5;
      const cz = ty + 0.5;
      switch (look) {
        // --- Prehistory ---
        case 'grass':
          floor(tx, ty, '#6aa83e');
          break;
        case 'undergrowth':
          // Ferns and horsetails: grasslands didn't exist yet in the Late Cretaceous.
          floor(tx, ty, '#5a9636');
          for (let i = 0; i < 6; i++) {
            batch.add('frond', cx, 0.12, cz, i % 2 ? '#3f8f3a' : '#58a640', [1.1, 1, 0.75], [-0.75, (i / 6) * Math.PI * 2 + r(tx, ty, 3), 0]);
          }
          for (let i = 0; i < 4; i++) {
            batch.add('blade', tx + 0.15 + r(tx, ty, i + 10) * 0.7, 0, ty + 0.15 + r(tx, ty, i + 20) * 0.7, '#6a9a3a', [0.9, 0.6 + r(tx, ty, i) * 0.3, 0.9]);
          }
          break;
        case 'tree': {
          floor(tx, ty, '#6aa83e');
          const h = 1.4 + r(tx, ty, 1) * 0.6;
          batch.add('trunk', cx, 0, cz, '#6b4423', [1, h, 1]);
          const green = vary('#2e6a2a', tx, ty, 0.1);
          batch.add('conifer', cx, h + 0.2, cz, green, [1.3, 1, 1.3], [0, r(tx, ty, 2) * 3, 0]);
          batch.add('conifer', cx, h + 0.8, cz, green.clone().offsetHSL(0, 0, 0.05), [0.95, 0.9, 0.95], [0, r(tx, ty, 3) * 3, 0]);
          break;
        }
        case 'fern':
          floor(tx, ty, '#6aa83e');
          for (let i = 0; i < 8; i++) {
            batch.add('frond', cx, 0.25, cz, i % 2 ? '#3f8f3a' : '#58b040', [1.3, 1, 1.2], [-0.45, (i / 8) * Math.PI * 2 + r(tx, ty, 5), 0]);
          }
          break;
        case 'dirt':
          floor(tx, ty, '#9c7a4a');
          break;
        case 'water':
        case 'moat':
          floor(tx, ty, look === 'water' ? '#6a5a3a' : '#4a4a40', 0.04, -0.45);
          batch.add('water', cx, -0.12, cz, look === 'water' ? '#3b8ac0' : '#3a7ea0');
          break;
        case 'stones':
          floor(tx, ty, '#6a5a3a', 0.04, -0.45);
          batch.add('water', cx, -0.12, cz, '#3b8ac0');
          batch.add('block', tx + 0.3, -0.3, ty + 0.35, '#9b958b', [0.38, 0.32, 0.36], [0, r(tx, ty, 1), 0]);
          batch.add('block', tx + 0.7, -0.3, ty + 0.7, '#8d877d', [0.34, 0.32, 0.32], [0, r(tx, ty, 2), 0]);
          break;
        case 'sand':
          floor(tx, ty, '#e2cc8e');
          break;
        case 'cliff': {
          const h = 1.3 + r(tx, ty, 1) * 0.7;
          batch.add('block', cx, 0, cz, vary('#7d6a55', tx, ty, 0.1), [1, h, 1]);
          if (r(tx, ty, 2) < 0.3) batch.add('blob', cx + (r(tx, ty, 3) - 0.5) * 0.4, h, cz, '#4f7a30', [0.8, 0.4, 0.8]);
          break;
        }
        case 'cavefloor':
          floor(tx, ty, '#3d3633');
          break;
        case 'bones':
          floor(tx, ty, '#3d3633');
          batch.add('bone', tx + 0.35, 0.04, ty + 0.4, '#ece4d0', [1, 1, 1], [0, 0, Math.PI / 2 + r(tx, ty, 1)]);
          batch.add('bone', tx + 0.6, 0.04, ty + 0.65, '#d8cfb8', [1, 1, 1], [Math.PI / 2, r(tx, ty, 2) * 3, 0]);
          batch.add('pebble', tx + 0.7, 0.08, ty + 0.3, '#ece4d0', [1.2, 1, 1.2]);
          break;
        case 'rubble':
          floor(tx, ty, '#9c7a4a');
          for (let i = 0; i < 4; i++) batch.add('pebble', tx + 0.15 + r(tx, ty, i) * 0.7, 0.05, ty + 0.15 + r(tx, ty, i + 9) * 0.7, '#8a8378');
          break;
        case 'crater':
          floor(tx, ty, '#4b403a', 0.1, -0.1);
          break;
        case 'gravel':
          floor(tx, ty, '#9a9284');
          for (let i = 0; i < 2; i++) batch.add('pebble', tx + r(tx, ty, i) * 0.9 + 0.05, 0.03, ty + r(tx, ty, i + 5) * 0.9 + 0.05, '#7d766b', [0.7, 0.5, 0.7]);
          break;

        // --- Middle Ages ---
        case 'mgrass':
          floor(tx, ty, '#78b450');
          break;
        case 'flowers':
          floor(tx, ty, '#78b450');
          for (let i = 0; i < 4; i++) {
            const colors = ['#ff6b9a', '#ffd23f', '#ffffff', '#9a7bff'];
            batch.add('petal', tx + 0.15 + r(tx, ty, i) * 0.7, 0.08, ty + 0.15 + r(tx, ty, i + 4) * 0.7, colors[Math.floor(r(tx, ty, i + 8) * 4)]);
          }
          break;
        case 'bush':
          floor(tx, ty, '#5f9a3e');
          batch.add('blob', cx, 0.38, cz, vary('#2f7a2f', tx, ty, 0.1), [1.25, 1.05, 1.25], [r(tx, ty, 1), r(tx, ty, 2), 0]);
          if (r(tx, ty, 3) < 0.4) batch.add('petal', cx + 0.2, 0.65, cz + 0.35, '#d03a3a');
          break;
        case 'road':
          floor(tx, ty, '#b8986a');
          break;
        case 'cobble':
          floor(tx, ty, '#9a9a95', 0.05);
          break;
        case 'castlewall': {
          batch.add('block', cx, 0, cz, vary('#9097a0', tx, ty, 0.05), [1, 1.7, 1]);
          const edge = ['up', 'down', 'left', 'right'].some((_, i) => {
            const n = lookAt(tx + [0, 0, -1, 1][i], ty + [-1, 1, 0, 0][i]);
            return n !== null && n !== 'castlewall';
          });
          if (edge && (tx + ty) % 2 === 0) batch.add('block', cx, 1.7, cz, '#a9afb7', [0.6, 0.3, 0.6]);
          break;
        }
        case 'stonefloor':
          floor(tx, ty, '#857f78');
          break;
        case 'woodfloor':
          floor(tx, ty, '#a87a4a', 0.04);
          break;
        case 'doorway':
          floor(tx, ty, '#34302e');
          break;
        case 'hole':
          floor(tx, ty, '#4a4a50');
          batch.add('block', tx + 0.08, 0, cz, '#7e858e', [0.16, 1.1, 1]);
          batch.add('block', tx + 0.92, 0, cz, '#7e858e', [0.16, 1.1, 1]);
          for (let i = 0; i < 3; i++) batch.add('pebble', tx + 0.25 + r(tx, ty, i) * 0.5, 0.05, ty + 0.2 + r(tx, ty, i + 3) * 0.6, '#9097a0');
          break;
        case 'roof': {
          const shade = ty % 2 === 0 ? '#b04a3a' : '#9a3b2e';
          batch.add('block', cx, 0, cz, shade, [1, 1.9, 1]);
          if (lookAt(tx, ty - 1) !== 'roof') batch.add('block', cx, 1.9, cz - 0.25, '#c0584a', [1, 0.18, 0.5]);
          break;
        }
        case 'housewall':
        case 'housedoor':
        case 'panel':
          batch.add('block', cx, 0, cz, '#e0c08f', [1, 1.35, 1]);
          batch.add('block', cx, 1.25, cz + 0.45, '#5a3a1e', [1, 0.1, 0.12]);
          if (look === 'housedoor') batch.add('block', cx, 0, cz + 0.5, '#6a4424', [0.55, 0.95, 0.06]);
          else if (look === 'panel') {
            batch.add('block', cx, 0, cz + 0.5, '#5a5e65', [0.7, 1.05, 0.08]);
            const glow = new THREE.MeshBasicMaterial({ color: '#4ff0ff' });
            glows.push({ material: glow, base: glow.color.clone() });
            const screen = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.04), glow);
            screen.position.set(cx, 0.65, cz + 0.56);
            group.add(screen);
            const light = new THREE.PointLight('#4ff0ff', 2, 3, 1.5);
            light.position.set(cx, 0.8, cz + 0.9);
            group.add(light);
          } else if (r(tx, ty, 7) < 0.5) {
            batch.add('block', cx, 0.5, cz + 0.5, '#3a4a6a', [0.4, 0.4, 0.05]);
          }
          break;
        case 'bridge':
          floor(tx, ty, '#6a5a3a', 0.04, -0.45);
          batch.add('water', cx, -0.12, cz, '#3a7ea0');
          floor(tx, ty, '#8a6538', 0.05, 0.02);
          if (lookAt(tx - 1, ty) !== 'bridge') batch.add('block', tx + 0.06, 0, cz, '#5a3a1e', [0.12, 0.45, 1]);
          if (lookAt(tx + 1, ty) !== 'bridge') batch.add('block', tx + 0.94, 0, cz, '#5a3a1e', [0.12, 0.45, 1]);
          break;
        case 'mtree': {
          floor(tx, ty, '#78b450');
          const h = 1.2 + r(tx, ty, 1) * 0.5;
          batch.add('trunk', cx, 0, cz, '#6a4424', [1, h, 1]);
          batch.add('canopy', cx, h + 0.45, cz, vary('#3d8a33', tx, ty, 0.12), [1.2, 1.1, 1.2], [r(tx, ty, 2), r(tx, ty, 3), 0]);
          break;
        }
        case 'crate':
          floor(tx, ty, '#9a9a95', 0.05);
          batch.add('block', cx, 0, cz, '#a0703a', [0.82, 0.82, 0.82], [0, (r(tx, ty, 1) - 0.5) * 0.3, 0]);
          batch.add('block', cx, 0.82, cz, '#7a5228', [0.84, 0.05, 0.84], [0, (r(tx, ty, 1) - 0.5) * 0.3, 0]);
          break;
        case 'hay':
          floor(tx, ty, '#9a9a95', 0.05);
          batch.add('block', cx, 0, cz, '#e0c05a', [0.9, 0.75, 0.8]);
          batch.add('block', cx, 0.3, cz, '#b89a40', [0.92, 0.06, 0.82]);
          break;
        case 'forge': {
          floor(tx, ty, '#78b450');
          batch.add('block', cx, 0, cz, '#5a5a5a', [0.9, 0.9, 0.9]);
          const fire = new THREE.MeshBasicMaterial({ color: '#ff8a2a' });
          glows.push({ material: fire, base: fire.color.clone() });
          const coals = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.1), fire);
          coals.position.set(cx, 0.35, cz + 0.46);
          group.add(coals);
          const light = new THREE.PointLight('#ff8a2a', 3, 4, 1.5);
          light.position.set(cx, 0.6, cz + 0.9);
          group.add(light);
          break;
        }
        case 'barrel':
          floor(tx, ty, '#78b450');
          batch.add('barrel', cx, 0, cz, '#8a5a2b');
          batch.add('barrel', cx, 0.15, cz, '#4a4a4a', [1.03, 0.06, 1.03]);
          batch.add('barrel', cx, 0.6, cz, '#4a4a4a', [1.03, 0.06, 1.03]);
          break;
        case 'rack':
          floor(tx, ty, '#857f78');
          batch.add('block', cx, 0, cz, '#5a3a1e', [0.9, 0.25, 0.4]);
          for (let i = 0; i < 3; i++) {
            batch.add('trunk', tx + 0.25 + i * 0.25, 0, cz, '#7a5a3a', [0.25, 1.4, 0.25]);
            batch.add('pebble', tx + 0.25 + i * 0.25, 1.42, cz, '#d0d6e0', [0.5, 1.2, 0.5]);
          }
          break;
        case 'table':
          floor(tx, ty, '#857f78');
          batch.add('block', cx, 0.55, cz, '#7a5230', [0.9, 0.1, 0.8]);
          batch.add('block', cx, 0, cz, '#4a301a', [0.7, 0.55, 0.6]);
          batch.add('barrel', tx + 0.3, 0.65, cz, '#7fe0a0', [0.15, 0.3, 0.15]);
          batch.add('barrel', tx + 0.55, 0.65, cz - 0.1, '#ff7ad0', [0.12, 0.4, 0.12]);
          batch.add('barrel', tx + 0.75, 0.65, cz + 0.1, '#7ab0ff', [0.14, 0.25, 0.14]);
          break;
        case 'ledgestone':
        case 'ledgeearth': {
          // A raised landing you can only jump down from: its side shows the drop.
          const h = map.def(tx, ty).height ?? 0.6;
          const stone = look === 'ledgestone';
          batch.add('block', cx, 0, cz, stone ? '#7e858e' : '#6a5238', [1, h, 1]);
          floor(tx, ty, stone ? '#a9afb7' : '#9a7a52', 0.02, h);
          if (stone) {
            batch.add('block', cx, h, ty + 0.06, '#9097a0', [1, 0.25, 0.12]);
            batch.add('block', cx, h, ty + 0.94, '#9097a0', [1, 0.25, 0.12]);
          }
          break;
        }
        case 'balcony': {
          // An upper-floor shooting balcony set into the wall, with a low parapet.
          const h = map.def(tx, ty).height ?? 1.3;
          const below = lookAt(tx, ty + 1) === 'stonefloor';
          batch.add('block', cx, 0, cz, '#7e858e', [1, h, 1]);
          floor(tx, ty, '#857f78', 0.02, h);
          batch.add('block', cx, h, below ? ty + 0.92 : ty + 0.08, '#9097a0', [1, 0.3, 0.16]);
          batch.add('block', cx, h + 0.3, below ? ty + 0.92 : ty + 0.08, '#a9afb7', [0.3, 0.12, 0.18]);
          batch.add('block', cx, 1.7, below ? ty + 0.08 : ty + 0.92, '#7e858e', [1, 0.6, 0.16]);
          break;
        }
        case 'stairs': {
          const h = map.def(tx, ty).height ?? 0.6;
          for (let i = 0; i < 3; i++) batch.add('block', tx + 0.17 + i * 0.33, 0, cz, i % 2 ? '#8a9098' : '#9aa0a8', [0.34, (h * (i + 1)) / 3, 1]);
          break;
        }

        // --- Araucanía ---
        case 'pgrass':
          floor(tx, ty, '#5f9a48');
          break;
        case 'quila':
          // Chusquea quila: dense native bamboo, taller than a person.
          floor(tx, ty, '#4f8a3a');
          for (let i = 0; i < 6; i++) {
            const x = tx + 0.12 + r(tx, ty, i + 10) * 0.76;
            const z = ty + 0.12 + r(tx, ty, i + 20) * 0.76;
            const h = 1.1 + r(tx, ty, i) * 0.4;
            batch.add('blade', x, 0, z, i % 2 ? '#8ab84a' : '#6a9a3a', [0.8, h, 0.8], [(r(tx, ty, i + 30) - 0.5) * 0.3, 0, (r(tx, ty, i + 40) - 0.5) * 0.3]);
          }
          batch.add('blob', cx, 1.05, cz, '#5a9a3a', [1.1, 0.5, 1.1]);
          break;
        case 'path':
          floor(tx, ty, '#9a7a52');
          break;
        case 'coigue': {
          // Coihue (Nothofagus dombeyi), a tall evergreen southern beech.
          floor(tx, ty, '#5f9a48');
          const h = 1.6 + r(tx, ty, 1) * 0.8;
          batch.add('trunk', cx, 0, cz, '#5a4030', [1.1, h, 1.1]);
          batch.add('canopy', cx, h + 0.3, cz, vary('#2e5a2a', tx, ty, 0.1), [1.2, 0.8, 1.2], [0, r(tx, ty, 2) * 3, 0]);
          batch.add('canopy', cx + 0.2, h + 0.75, cz - 0.1, vary('#3a6a32', tx, ty, 0.1), [0.9, 0.6, 0.9]);
          break;
        }
        case 'araucaria': {
          // Araucaria araucana (pehuén): a tall straight trunk with an umbrella of spiky branches.
          floor(tx, ty, '#5f9a48');
          const h = 2.4 + r(tx, ty, 1) * 0.8;
          batch.add('trunk', cx, 0, cz, '#6a5040', [1, h, 1]);
          for (let i = 0; i < 3; i++) batch.add('flatcone', cx, h - 0.1 + i * 0.28, cz, i % 2 ? '#2a5a2a' : '#1e4a22', [1.15 - i * 0.25, 1, 1.15 - i * 0.25]);
          break;
        }
        case 'canelotree':
          // Foye or canelo (Drimys winteri), sacred to the Mapuche.
          floor(tx, ty, '#5f9a48');
          batch.add('trunk', cx, 0, cz, '#8a6a50', [0.9, 1.2, 0.9]);
          batch.add('canopy', cx, 1.55, cz, '#5aa04a', [1, 0.95, 1], [r(tx, ty, 2), 0, 0]);
          for (let i = 0; i < 4; i++) batch.add('petal', cx + (r(tx, ty, i) - 0.5) * 0.9, 1.5 + r(tx, ty, i + 4) * 0.5, cz + 0.45, '#f4f1de');
          break;
        case 'stream':
          floor(tx, ty, '#6a5a3a', 0.04, -0.45);
          batch.add('water', cx, -0.12, cz, '#3b8ac0');
          break;
        case 'riverstones':
          floor(tx, ty, '#6a5a3a', 0.04, -0.45);
          batch.add('water', cx, -0.12, cz, '#3b8ac0');
          batch.add('block', tx + 0.3, -0.3, ty + 0.35, '#9b958b', [0.38, 0.32, 0.36], [0, r(tx, ty, 1), 0]);
          batch.add('block', tx + 0.7, -0.3, ty + 0.7, '#8d877d', [0.34, 0.32, 0.32], [0, r(tx, ty, 2), 0]);
          break;
        case 'gravelbank':
          floor(tx, ty, '#a8a090');
          for (let i = 0; i < 3; i++) batch.add('pebble', tx + 0.1 + r(tx, ty, i) * 0.8, 0.03, ty + 0.1 + r(tx, ty, i + 5) * 0.8, '#8a8478', [0.8, 0.5, 0.8]);
          break;
        case 'ruka':
          // A ruka: a Mapuche house of wood and thatch.
          batch.add('block', cx, 0, cz, '#8a6a40', [1, 0.7, 1]);
          batch.add('prism', cx, 0.7, cz, '#c8a860', [1.02, 1.6, 1.25]);
          break;
        case 'rewe':
          // The rewe: a carved, stepped trunk used by the machi, decorated with foye branches.
          floor(tx, ty, '#8a6a48');
          batch.add('trunk', cx, 0, cz, '#6a4a30', [1.2, 1.7, 1.2]);
          for (let i = 0; i < 4; i++) batch.add('block', cx, 0.3 + i * 0.32, cz + 0.13, '#4a3020', [0.22, 0.05, 0.08]);
          batch.add('blob', cx, 1.85, cz, '#5aa04a', [0.6, 0.6, 0.6]);
          break;
        case 'campfire': {
          floor(tx, ty, '#8a6a48');
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            batch.add('pebble', cx + Math.cos(a) * 0.3, 0.05, cz + Math.sin(a) * 0.3, '#6e695f');
          }
          batch.add('block', cx, 0.04, cz, '#4a3020', [0.5, 0.08, 0.1], [0, 0.6, 0]);
          batch.add('block', cx, 0.04, cz, '#4a3020', [0.5, 0.08, 0.1], [0, -0.6, 0]);
          const fire = new THREE.MeshBasicMaterial({ color: '#ff8a2a' });
          glows.push({ material: fire, base: fire.color.clone() });
          const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 5), fire);
          flame.position.set(cx, 0.28, cz);
          group.add(flame);
          const light = new THREE.PointLight('#ff9a3a', 3, 5, 1.5);
          light.position.set(cx, 0.8, cz);
          group.add(light);
          break;
        }
        case 'palisade':
          floor(tx, ty, '#8a6a48');
          for (let i = 0; i < 3; i++) {
            const x = tx + 0.18 + i * 0.32;
            batch.add('stake', x, 0, cz, vary('#7a5a3a', tx + i, ty, 0.1), [1, 1.7 + r(tx, ty, i) * 0.2, 1]);
            batch.add('conifer', x, 1.9 + r(tx, ty, i) * 0.2, cz, '#6a4a2a', [0.17, 0.25, 0.17]);
          }
          break;
        case 'earth': {
          const h = map.def(tx, ty).height ?? 0;
          if (h > 0) batch.add('block', cx, 0, cz, '#6a5238', [1, h, 1]);
          floor(tx, ty, '#8a6a48', 0.025, h);
          break;
        }
        case 'adobe':
        case 'adobedoor':
          batch.add('block', cx, 0, cz, '#e8dcc8', [1, 1.4, 1]);
          batch.add('block', cx, 0, cz + 0.02, '#a8988a', [1.01, 0.25, 1]);
          if (look === 'adobedoor') batch.add('block', cx, 0, cz + 0.5, '#5a3a20', [0.55, 1.0, 0.06]);
          else if (r(tx, ty, 3) < 0.4) batch.add('block', cx, 0.7, cz + 0.5, '#2a2a30', [0.3, 0.35, 0.05]);
          break;
        case 'tileroof':
          batch.add('block', cx, 0, cz, '#e8dcc8', [1, 1.2, 1]);
          batch.add('prism', cx, 1.2, cz, ty % 2 ? '#b8583a' : '#a84a30', [1.02, 1.3, 1.2]);
          break;
        case 'copihue':
          // Copihue (Lapageria rosea): red bell-shaped flowers on a climbing vine.
          floor(tx, ty, '#5f9a48');
          batch.add('blob', cx, 0.2, cz, '#3a7a32', [0.7, 0.45, 0.7]);
          for (let i = 0; i < 4; i++) batch.add('petal', cx + (r(tx, ty, i) - 0.5) * 0.6, 0.25 + r(tx, ty, i + 4) * 0.2, cz + 0.2, '#c8202a', [1, 1.6, 1]);
          break;
        case 'pottery':
          floor(tx, ty, '#8a6a48');
          batch.add('barrel', tx + 0.35, 0, cz, '#9a4a2a', [0.6, 0.6, 0.6]);
          batch.add('barrel', tx + 0.7, 0, cz + 0.15, '#8a3a24', [0.45, 0.8, 0.45]);
          break;
        case 'rock': {
          const h = 1.3 + r(tx, ty, 1) * 0.9;
          batch.add('block', cx, 0, cz, vary('#7a7268', tx, ty, 0.1), [1, h, 1]);
          if (r(tx, ty, 2) < 0.35) batch.add('blob', cx, h, cz, '#4f7a30', [0.8, 0.35, 0.8]);
          break;
        }

        // --- Neo-Tokyo ---
        case 'asphalt':
          floor(tx, ty, '#2a2c34', 0.02);
          if ((tx + ty * 3) % 5 === 0) batch.add('neon', cx, 0.005, cz, '#c8b858', [0.5, 0.01, 0.08]);
          break;
        case 'sidewalk':
          floor(tx, ty, '#4a4c56', 0.03);
          break;
        case 'plaza':
          floor(tx, ty, (tx + ty) % 2 ? '#5a5866' : '#4e4c5a', 0.02);
          break;
        case 'alley':
          floor(tx, ty, '#16171d', 0.02);
          break;
        case 'neonblock': {
          const h = 2.6 + r(tx, ty, 1) * 2.2;
          batch.add('block', cx, 0, cz, vary('#1e2030', tx, ty, 0.05), [1, h, 1]);
          const neon = ['#ff3fd0', '#3fe0ff', '#ffd23f', '#7a5aff'][Math.floor(r(tx, ty, 2) * 4)];
          if (lookAt(tx, ty + 1) !== 'neonblock') {
            batch.add('neon', cx, 1.6 + r(tx, ty, 3), cz + 0.51, neon, [0.9, 0.06, 0.02]);
            for (let i = 0; i < 3; i++) if (r(tx, ty, i + 5) < 0.5) batch.add('neon', tx + 0.25 + i * 0.25, 0.8 + r(tx, ty, i + 9) * (h - 1.2), cz + 0.51, '#ffe6a0', [0.12, 0.16, 0.02]);
          }
          break;
        }
        case 'glasstower':
          batch.add('block', cx, 0, cz, '#2a3a5a', [1, 4.6, 1]);
          if (lookAt(tx, ty + 1) !== 'glasstower') {
            for (let i = 0; i < 6; i++) batch.add('neon', cx, 0.7 + i * 0.65, cz + 0.51, '#3fe0ff', [0.95, 0.03, 0.02]);
          }
          break;
        case 'lobby':
          floor(tx, ty, '#8a8ea0', 0.02);
          break;
        case 'labfloor':
          floor(tx, ty, '#d8dce4', 0.02);
          break;
        case 'canal':
          floor(tx, ty, '#3a3a40', 0.04, -0.6);
          batch.add('water', cx, -0.3, cz, '#1a3a5a');
          break;
        case 'steelbridge':
          floor(tx, ty, '#3a3a40', 0.04, -0.6);
          batch.add('water', cx, -0.3, cz, '#1a3a5a');
          floor(tx, ty, '#5a6070', 0.03, 0.02);
          if (lookAt(tx - 1, ty) !== 'steelbridge') batch.add('block', tx + 0.05, 0, cz, '#8a92a0', [0.06, 0.5, 1]);
          if (lookAt(tx + 1, ty) !== 'steelbridge') batch.add('block', tx + 0.95, 0, cz, '#8a92a0', [0.06, 0.5, 1]);
          break;
        case 'puddle':
          floor(tx, ty, '#2a2c34', 0.02);
          batch.add('water', cx, 0.03, cz, '#3a5a8a', [0.8, 0.1, 0.7]);
          break;
        case 'planter':
          floor(tx, ty, '#4a4c56', 0.03);
          batch.add('block', cx, 0, cz, '#6a6e78', [1, 0.35, 1]);
          batch.add('blob', cx, 0.6, cz, vary('#2f6a3a', tx, ty, 0.1), [1.2, 0.8, 1.2]);
          break;
        case 'billboard': {
          floor(tx, ty, '#4a4c56', 0.03);
          batch.add('block', cx, 0, cz, '#2a2c34', [0.15, 1.4, 0.15]);
          const color = ['#ff3fd0', '#3fe0ff', '#ffd23f'][Math.floor(r(tx, ty, 1) * 3)];
          batch.add('neon', cx, 1.75, cz, color, [0.95, 0.6, 0.06]);
          break;
        }
        case 'vending':
          floor(tx, ty, '#4a4c56', 0.03);
          batch.add('block', cx, 0, cz, r(tx, ty, 1) < 0.5 ? '#b02a3a' : '#2a6ab0', [0.8, 1.3, 0.6]);
          batch.add('neon', cx, 0.8, cz + 0.31, '#e8f8ff', [0.5, 0.5, 0.02]);
          break;
        case 'techcrate':
          floor(tx, ty, '#8a8ea0', 0.02);
          batch.add('block', cx, 0, cz, '#3a4050', [0.85, 0.75, 0.85], [0, (r(tx, ty, 1) - 0.5) * 0.3, 0]);
          batch.add('neon', cx, 0.5, cz + 0.43, '#3fe0ff', [0.6, 0.04, 0.02]);
          break;
        case 'server':
          floor(tx, ty, '#d8dce4', 0.02);
          batch.add('block', cx, 0, cz, '#1a1d24', [0.9, 1.6, 0.8]);
          for (let i = 0; i < 4; i++) batch.add('neon', tx + 0.25 + r(tx, ty, i) * 0.5, 0.3 + i * 0.32, cz + 0.41, i % 2 ? '#5aff8a' : '#3fe0ff', [0.05, 0.03, 0.02]);
          break;
        case 'bench':
          floor(tx, ty, '#5a5866', 0.02);
          batch.add('block', cx, 0.25, cz, '#6a4a3a', [0.9, 0.08, 0.4]);
          batch.add('block', cx, 0, cz, '#3a3a40', [0.7, 0.25, 0.3]);
          break;
        case 'metro':
          // A subway station entrance.
          floor(tx, ty, '#4a4c56', 0.03);
          batch.add('block', cx, 0, cz, '#3a3c46', [1, 0.9, 1]);
          batch.add('neon', cx, 1.3, cz, '#e8303a', [0.5, 0.5, 0.06]);
          batch.add('block', cx, 0.9, cz, '#2a2c34', [0.08, 0.5, 0.08]);
          break;
        case 'statue':
          floor(tx, ty, '#5a5866', 0.02);
          break;
        case 'lamppost':
          // Shared by Neo-Tokyo (lit) and the abandoned city (dead).
          floor(tx, ty, abandoned ? '#c8b08a' : '#4a4c56', 0.03);
          batch.add('trunk', cx, 0, cz, '#3a3c46', [0.35, 2.2, 0.35]);
          batch.add('neon', cx, 2.2, cz + 0.15, abandoned ? '#5a5a52' : '#ffe6a0', [0.25, 0.08, 0.35]);
          break;
        case 'citytree':
          floor(tx, ty, '#4a4c56', 0.03);
          batch.add('trunk', cx, 0, cz, '#4a3a2a', [0.9, 1.3, 0.9]);
          batch.add('canopy', cx, 1.75, cz, vary('#2a5a3a', tx, ty, 0.1), [1, 0.9, 1]);
          break;
        case 'railing':
          floor(tx, ty, '#4a4c56', 0.03);
          batch.add('block', cx, 0.5, cz, '#8a92a0', [1, 0.05, 0.06]);
          batch.add('block', tx + 0.1, 0, cz, '#8a92a0', [0.05, 0.5, 0.05]);
          batch.add('block', tx + 0.9, 0, cz, '#8a92a0', [0.05, 0.5, 0.05]);
          break;

        // --- The Long Drought (2240) ---
        case 'dust':
          floor(tx, ty, '#c8b08a', 0.04);
          break;
        case 'scrub':
          floor(tx, ty, '#bca480', 0.04);
          batch.add('blob', cx, 0.3, cz, vary('#8a8a5a', tx, ty, 0.1), [1.1, 0.7, 1.1], [r(tx, ty, 1), r(tx, ty, 2), 0]);
          for (let i = 0; i < 3; i++) batch.add('blade', tx + 0.2 + r(tx, ty, i) * 0.6, 0, ty + 0.2 + r(tx, ty, i + 3) * 0.6, '#a89a6a', [0.8, 0.8, 0.8]);
          break;
        case 'crackedroad':
          floor(tx, ty, '#6a6660', 0.03);
          if (r(tx, ty, 1) < 0.5) batch.add('block', cx, 0, cz, '#4a4640', [0.7, 0.01, 0.04], [0, r(tx, ty, 2) * 3, 0]);
          break;
        case 'dune':
          floor(tx, ty, '#d8c08a', 0.03, 0.08);
          break;
        case 'ruinwall': {
          const h = 0.8 + r(tx, ty, 1) * 1.8;
          batch.add('block', cx, 0, cz, vary('#8a8680', tx, ty, 0.08), [1, h, 1]);
          if (r(tx, ty, 2) < 0.4) batch.add('block', cx + 0.2, h, cz, '#6a4030', [0.03, 0.4, 0.03]);
          break;
        }
        case 'deadtree': {
          floor(tx, ty, '#c8b08a', 0.04);
          const h = 1.4 + r(tx, ty, 1) * 0.6;
          batch.add('trunk', cx, 0, cz, '#6a5a48', [0.8, h, 0.8]);
          for (let i = 0; i < 3; i++) batch.add('block', cx, h - 0.2 - i * 0.3, cz, '#6a5a48', [0.7, 0.05, 0.05], [0, r(tx, ty, i) * 3, 0.5 - i * 0.3]);
          break;
        }
        case 'debris':
          floor(tx, ty, '#b8a07a', 0.04);
          for (let i = 0; i < 4; i++) batch.add('pebble', tx + 0.15 + r(tx, ty, i) * 0.7, 0.05, ty + 0.15 + r(tx, ty, i + 9) * 0.7, '#8a8680');
          break;
        case 'bigrubble':
          floor(tx, ty, '#b8a07a', 0.04);
          batch.add('block', cx, 0, cz, '#8a8680', [0.9, 0.6, 0.8], [0.15, r(tx, ty, 1) * 3, 0.1]);
          batch.add('block', cx + 0.2, 0.4, cz, '#7a7670', [0.5, 0.35, 0.5], [0.3, r(tx, ty, 2) * 3, 0]);
          break;
        case 'marble':
          floor(tx, ty, (tx + ty) % 2 ? '#d8d4cc' : '#b8b4ac', 0.02);
          break;
        case 'museumwall':
          batch.add('block', cx, 0, cz, '#d8d2c4', [1, 2.4, 1]);
          if (lookAt(tx, ty + 1) !== 'museumwall') batch.add('block', cx, 2.2, cz + 0.08, '#e8e2d4', [1, 0.2, 1.1]);
          break;
        case 'column':
          floor(tx, ty, '#d8d4cc', 0.02);
          batch.add('barrel', cx, 0, cz, '#e0dacc', [0.9, 2.8, 0.9]);
          batch.add('block', cx, 2.2, cz, '#e8e2d4', [0.8, 0.15, 0.8]);
          break;
        case 'wreck':
          floor(tx, ty, '#6a6660', 0.03);
          batch.add('block', cx, 0.1, cz, '#8a4a2a', [0.9, 0.4, 0.6]);
          batch.add('block', cx - 0.05, 0.5, cz, '#6a3a20', [0.5, 0.3, 0.55]);
          break;
        case 'showcase':
          floor(tx, ty, (tx + ty) % 2 ? '#d8d4cc' : '#b8b4ac', 0.02);
          batch.add('block', cx, 0, cz, '#5a4a3a', [0.8, 0.6, 0.6]);
          batch.add('water', cx, 0.9, cz, '#c8e8f0', [0.78, 1.5, 0.58]);
          break;
        case 'fountain':
          floor(tx, ty, '#c8b08a', 0.04);
          batch.add('barrel', cx, 0, cz, '#a8a29a', [1.4, 0.45, 1.4]);
          batch.add('barrel', cx, 0.3, cz, '#c8b08a', [1.2, 0.05, 1.2]);
          break;
        case 'well':
          floor(tx, ty, '#9a9a95', 0.05);
          batch.add('barrel', cx, 0, cz, '#8a8a8a', [1.3, 0.75, 1.3]);
          batch.add('barrel', cx, 0.55, cz, '#1e3a50', [1.05, 0.03, 1.05]);
          batch.add('block', tx + 0.12, 0, cz, '#5a3a1e', [0.1, 1.3, 0.1]);
          batch.add('block', tx + 0.88, 0, cz, '#5a3a1e', [0.1, 1.3, 0.1]);
          batch.add('block', cx, 1.3, cz, '#7a4a2a', [1.1, 0.12, 0.7]);
          break;
      }
    }
  }

  batch.build(group, waterMaterial);
  return {
    group,
    update(time) {
      // A gentle shimmer on water and glowing props.
      waterMaterial.emissive.setHSL(0.55, 0.6, 0.05 + Math.sin(time * 1.5) * 0.03);
      for (const glow of glows) glow.material.color.copy(glow.base).offsetHSL(0, 0, Math.sin(time * 4) * 0.08);
    },
  };
}
