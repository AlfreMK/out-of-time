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
  | 'neon'
  | 'glass';

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
  glass: () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
};

/** Deck height of Neo-Tokyo's railway viaduct: low enough not to hide the row in front of it. */
const VIADUCT_H = 0.7;

/** Shapes that don't cast shadows (flat ground, tiny details). */
const NO_SHADOW = new Set<Shape>(['floor', 'water', 'petal', 'pebble', 'bone', 'neon', 'glass']);

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
      const material =
        shape === 'water'
          ? water
          : shape === 'neon'
            ? new THREE.MeshBasicMaterial({ color: '#ffffff' })
            : shape === 'glass'
              ? new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false })
              : toon('#ffffff');
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
  /** Lowers the walls that stand between the camera and the interior whose floor is `inside` (null: none). */
  update(time: number, inside: TileLook | null): void;
}

/** Floors of building interiors (Neo-Tokyo's depot and tower). */
export const INTERIOR_LOOKS: ReadonlySet<TileLook> = new Set<TileLook>(['lobby', 'labfloor', 'server', 'techcrate', 'doorway', 'marble', 'crypt']);

/** Tiles that make up the road surface, for lane markings and curbs. */
const ROAD_LOOKS: ReadonlySet<TileLook> = new Set<TileLook>(['asphalt', 'puddle']);

export function buildTerrain(map: TileMap): Terrain {
  const group = new THREE.Group();
  const batch = new Batch();
  const waterMaterial = new THREE.MeshToonMaterial({ color: '#ffffff', transparent: true, opacity: 0.82 });
  const glows: Array<{ material: THREE.MeshBasicMaterial; base: THREE.Color }> = [];
  const spinners: THREE.Object3D[] = [];
  // The viaduct's extent, so one Yamanote train can run along it.
  let viaduct: { x0: number; x1: number; z: number } | null = null;
  // Walls just south of an interior go in a group per interior floor, which sinks only while the
  // player stands on that floor (the lab wall stays up while you walk the gallery outside it).
  const cuts = new Map<TileLook, { batch: Batch; group: THREE.Group }>();
  const cutBatchFor = (floorLook: TileLook): Batch => {
    let cut = cuts.get(floorLook);
    if (!cut) {
      cut = { batch: new Batch(), group: new THREE.Group() };
      cuts.set(floorLook, cut);
    }
    return cut.batch;
  };

  const lookAt = (tx: number, ty: number): TileLook | null => (map.inBounds(tx, ty) ? map.def(tx, ty).look : null);
  const floor = (tx: number, ty: number, color: string, amount = 0.025, y = 0): void =>
    batch.add('floor', tx + 0.5, y, ty + 0.5, vary(color, tx, ty, amount));
  const r = (tx: number, ty: number, salt: number): number => hash2(tx, ty, salt);
  const abandoned = map.tileset['.']?.look === 'dust';
  /** The interior floor one or two tiles north of a wall, if any: that's the room the wall hides. */
  const interiorNorth = (tx: number, ty: number): TileLook | null => {
    for (let k = 1; k <= 2; k++) {
      const n = lookAt(tx, ty - k);
      if (n !== null && INTERIOR_LOOKS.has(n)) return n;
    }
    return null;
  };
  const isRoad = (tx: number, ty: number): boolean => {
    const n = lookAt(tx, ty);
    return n !== null && ROAD_LOOKS.has(n);
  };
  /** Crossings line up with the canal bridges and building doors. */
  const crossing = (tx: number): boolean => {
    for (let y = 0; y < map.height; y++) {
      const n = lookAt(tx, y);
      if (n === 'steelbridge') return true;
    }
    return false;
  };
  const NEON = ['#ff3fd0', '#3fe0ff', '#ffd23f', '#7a5aff'];
  /** Wet asphalt mirrors the signs as long, dim smears. */
  const REFLECTION = ['#3a1f48', '#1c3446', '#3a3420', '#2a2050'];

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
        case 'panel': {
          // The chapel's front wall sinks while Andrew is inside Pike's crypt.
          const cut = interiorNorth(tx, ty);
          if (cut) batch.add('block', cx, 0, cz, '#d0b080', [0.98, 0.35, 0.98]);
          const wall = cut ? cutBatchFor(cut) : batch;
          wall.add('block', cx, 0, cz, '#e0c08f', [1, 1.35, 1]);
          // The timber trim sits proud of the wall face, so it never shares a plane with the wall.
          wall.add('block', cx, 1.16, cz + 0.535, '#5a3a1e', [1, 0.1, 0.06]);
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
        }
        case 'crypt':
          // Old flagstones under the dust of decades.
          floor(tx, ty, (tx + ty) % 2 ? '#5a554e' : '#4e4a44', 0.03);
          if (r(tx, ty, 1) < 0.5) batch.add('pebble', tx + 0.2 + r(tx, ty, 2) * 0.6, 0.03, ty + 0.2 + r(tx, ty, 3) * 0.6, '#6a655c', [0.8, 0.4, 0.8]);
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
        case 'fence': {
          // Wattle: hazel rods woven between stakes, joined to neighboring fences and walls.
          floor(tx, ty, '#78b450');
          batch.add('stake', cx, 0, cz, '#5a3a1e', [0.5, 0.85, 0.5]);
          const joins = (n: TileLook | null): boolean => n === 'fence' || n === 'housewall' || n === 'housedoor';
          const arms: Array<[number, number]> = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          for (const [dx, dz] of arms) {
            if (!joins(lookAt(tx + dx, ty + dz))) continue;
            for (let i = 0; i < 3; i++) {
              const size: [number, number, number] = dx ? [0.5, 0.11, 0.07] : [0.07, 0.11, 0.5];
              batch.add('block', cx + dx * 0.25, 0.14 + i * 0.2, cz + dz * 0.25, i % 2 ? '#8a6438' : '#a07a48', size);
            }
          }
          break;
        }
        case 'brushwood':
          // Dead leaves and dry twigs: they crack loudly underfoot, even when sneaking.
          floor(tx, ty, '#7a8a46');
          for (let i = 0; i < 5; i++) {
            batch.add('bone', tx + 0.2 + r(tx, ty, i) * 0.6, 0.04, ty + 0.2 + r(tx, ty, i + 5) * 0.6, i % 2 ? '#6a4a2a' : '#8a6a42', [0.8, 1.3, 0.8], [Math.PI / 2, r(tx, ty, i + 10) * 6, 0]);
          }
          for (let i = 0; i < 6; i++) {
            batch.add('petal', tx + 0.1 + r(tx, ty, i + 20) * 0.8, 0.03, ty + 0.1 + r(tx, ty, i + 30) * 0.8, ['#b07a3a', '#8a5a2a', '#c8963a'][i % 3], [1.4, 0.4, 1.4]);
          }
          break;
        case 'bramble':
          // Blackberry (Rubus) thickets: a native of European woodland edges.
          floor(tx, ty, '#5f8a3e');
          for (let i = 0; i < 3; i++) batch.add('blob', tx + 0.2 + i * 0.3, 0.16, cz + (r(tx, ty, i) - 0.5) * 0.3, vary('#2f5a28', tx + i, ty, 0.1), [0.55, 0.45, 0.6], [r(tx, ty, i + 3), r(tx, ty, i + 6), 0]);
          for (let i = 0; i < 4; i++) batch.add('petal', tx + 0.15 + r(tx, ty, i + 9) * 0.7, 0.32, ty + 0.2 + r(tx, ty, i + 13) * 0.6, i % 2 ? '#2a1a3a' : '#a02a3a');
          break;
        case 'kiln': {
          // A charcoal burner's kiln: a stack of wood sealed under earth and turf, smoldering for days.
          floor(tx, ty, '#4a3e32');
          batch.add('blob', cx, 0.18, cz, '#4a3a2e', [2.0, 1.15, 2.0]);
          batch.add('blob', cx, 0.42, cz, '#5a6a3a', [1.3, 0.7, 1.3], [0, r(tx, ty, 1) * 3, 0]);
          for (let i = 0; i < 3; i++) batch.add('blob', cx + 0.05 * i, 0.95 + i * 0.32, cz - 0.05 * i, '#a8a4a0', [0.22 + i * 0.1, 0.2 + i * 0.08, 0.22 + i * 0.1]);
          const ember = new THREE.MeshBasicMaterial({ color: '#ff7a2a' });
          glows.push({ material: ember, base: ember.color.clone() });
          const vent = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.06), ember);
          vent.position.set(cx, 0.14, cz + 0.62);
          group.add(vent);
          break;
        }
        case 'millwheel': {
          // An undershot water wheel in the millrace, turning on an axle into the millhouse wall.
          floor(tx, ty, '#6a5a3a', 0.04, -0.45);
          batch.add('water', cx, -0.12, cz, '#3b8ac0');
          const wheel = new THREE.Group();
          wheel.position.set(cx, 0.45, cz - 0.1);
          const wood = toon('#7a5230');
          const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 5, 16), wood);
          rim.castShadow = true;
          wheel.add(rim);
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.05), wood);
            spoke.rotation.z = a;
            const paddle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.32), toon('#8a6238'));
            paddle.position.set(Math.cos(a) * 0.66, Math.sin(a) * 0.66, 0);
            paddle.rotation.z = a;
            wheel.add(spoke, paddle);
          }
          const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6), toon('#4a3020'));
          axle.rotation.x = Math.PI / 2;
          axle.position.z = -0.3;
          wheel.add(axle);
          group.add(wheel);
          spinners.push(wheel);
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
        case 'asphalt': {
          floor(tx, ty, '#23252d', 0.02);
          const up = isRoad(tx, ty - 1);
          const down = isRoad(tx, ty + 1);
          if (crossing(tx) && (up || down)) {
            // Zebra crossing, Shibuya style.
            for (let i = 0; i < 3; i++) batch.add('neon', tx + 0.17 + i * 0.33, 0.004, cz, '#c8c8c0', [0.18, 0.01, 0.9]);
            break;
          }
          if (!up) batch.add('neon', cx, 0.004, ty + 0.1, '#c8c8c0', [1, 0.01, 0.05]);
          else if (!isRoad(tx, ty - 2) && tx % 2 === 0) batch.add('neon', cx, 0.004, ty + 0.02, '#d8c060', [0.5, 0.01, 0.05]);
          if (!down) batch.add('neon', cx, 0.004, ty + 0.9, '#c8c8c0', [1, 0.01, 0.05]);
          else if (!isRoad(tx, ty + 2) && tx % 2 === 0) batch.add('neon', cx, 0.004, ty + 0.98, '#d8c060', [0.5, 0.01, 0.05]);
          if (r(tx, ty, 4) < 0.3) batch.add('neon', tx + 0.2 + r(tx, ty, 5) * 0.6, 0.003, cz, REFLECTION[Math.floor(r(tx, ty, 6) * 4)], [0.12, 0.01, 0.7]);
          if (r(tx, ty, 7) < 0.04) batch.add('barrel', cx, -0.37, cz, '#3a3c44', [0.6, 0.5, 0.6]);
          break;
        }
        case 'sidewalk':
          // Paving slabs, with a raised curb along the road.
          floor(tx, ty, (tx + ty) % 2 ? '#50525e' : '#4a4c58', 0.02);
          if (isRoad(tx, ty + 1)) batch.add('block', cx, 0, ty + 0.94, '#8a8e9a', [1, 0.07, 0.12]);
          if (isRoad(tx, ty - 1)) batch.add('block', cx, 0, ty + 0.06, '#8a8e9a', [1, 0.07, 0.12]);
          break;
        case 'plaza':
          floor(tx, ty, (tx + ty) % 2 ? '#5a5866' : '#4e4c5a', 0.02);
          break;
        case 'alley':
          floor(tx, ty, '#16171d', 0.02);
          break;
        case 'neonblock': {
          // The bottom edge of the map sits between the camera and everything else: keep it low.
          if (ty === map.height - 1) {
            batch.add('block', cx, 0, cz, '#1e2032', [1, 0.5, 1]);
            batch.add('neon', cx, 0.5, ty + 0.05, NEON[Math.floor(r(tx, ty, 2) * 4)], [1, 0.03, 0.03]);
            break;
          }
          const cut = interiorNorth(tx, ty);
          const b = cut ? cutBatchFor(cut) : batch;
          if (cut) batch.add('block', cx, 0, cz, '#2a2c3c', [0.98, 0.4, 0.98]);
          const h = 2.6 + r(tx, ty, 1) * 2.2;
          const body = ['#1e2032', '#251f38', '#1a2436', '#2a2134'][Math.floor(r(tx, ty, 11) * 4)];
          b.add('block', cx, 0, cz, vary(body, tx, ty, 0.04), [1, h, 1]);
          // Rooftops are most of what the high camera sees: caps, AC units, water tanks and antennas.
          b.add('block', cx, h, cz, '#343850', [1, 0.06, 1]);
          if (r(tx, ty, 12) < 0.35) b.add('block', tx + 0.3, h, ty + 0.35, '#6a6e7c', [0.32, 0.2, 0.26]);
          if (r(tx, ty, 13) < 0.15) b.add('barrel', tx + 0.65, h, ty + 0.6, '#7a7e8c', [0.5, 0.55, 0.5]);
          if (r(tx, ty, 14) < 0.1) {
            b.add('block', tx + 0.7, h, ty + 0.3, '#5a5e6a', [0.04, 0.9, 0.04]);
            b.add('neon', tx + 0.7, h + 0.92, ty + 0.3, '#ff2a2a', [0.08, 0.08, 0.08]);
          }
          const south = lookAt(tx, ty + 1);
          if (south !== 'neonblock' && south !== null) {
            const neon = NEON[Math.floor(r(tx, ty, 2) * 4)];
            b.add('neon', cx, h - 0.15, cz + 0.51, neon, [1, 0.05, 0.02]);
            // Window grid: some lit warm, some cool, some dark.
            for (let y = 1.0; y < h - 0.35; y += 0.42) {
              for (const wx of [0.28, 0.72]) {
                const lit = r(tx * 3 + wx * 10, ty + y * 7, 15);
                if (lit < 0.55) b.add('neon', tx + wx, y, cz + 0.51, lit < 0.3 ? '#ffd9a0' : '#a8d8ff', [0.24, 0.16, 0.02]);
              }
            }
            if (south !== 'alley') {
              // Ground-floor shopfront with an awning.
              b.add('neon', cx, 0.42, cz + 0.51, ['#fff0d8', '#d8f0ff', '#ffd8f0'][Math.floor(r(tx, ty, 16) * 3)], [0.8, 0.5, 0.02]);
              b.add('block', cx, 0.78, cz + 0.62, NEON[Math.floor(r(tx, ty, 17) * 4)], [1, 0.05, 0.26]);
            }
            if (r(tx, ty, 18) < 0.3) {
              // A vertical sign (kanban) sticking out over the street.
              b.add('block', tx + 0.88, 1.0, cz + 0.62, '#1a1a24', [0.1, 1.5, 0.36]);
              b.add('neon', tx + 0.94, 1.75, cz + 0.62, neon, [0.02, 1.4, 0.3]);
              for (let i = 0; i < 4; i++) b.add('neon', tx + 0.95, 1.2 + i * 0.32, cz + 0.62, '#1a1a24', [0.02, 0.16, 0.16]);
            }
          }
          break;
        }
        case 'glasstower': {
          const cut = interiorNorth(tx, ty);
          const b = cut ? cutBatchFor(cut) : batch;
          if (cut) batch.add('block', cx, 0, cz, '#2a3a5a', [0.98, 0.4, 0.98]);
          b.add('block', cx, 0, cz, '#22324e', [1, 4.6, 1]);
          b.add('block', cx, 4.6, cz, '#2e4466', [1, 0.06, 1]);
          if (lookAt(tx, ty + 1) !== 'glasstower') {
            // Curtain wall: floor bands, mullions and lit office panes.
            for (let i = 0; i < 10; i++) {
              const y = 0.5 + i * 0.42;
              if (i % 2 === 0) b.add('neon', cx, y - 0.2, cz + 0.51, '#3fe0ff', [1, 0.025, 0.02]);
              for (const wx of [0.25, 0.75]) if (r(tx * 2 + wx * 4, ty + i, 19) < 0.6) b.add('neon', tx + wx, y, cz + 0.51, r(tx, ty + i, 20) < 0.5 ? '#9fe8ff' : '#5a8ac8', [0.4, 0.26, 0.02]);
            }
            b.add('neon', cx, 4.62, cz + 0.5, '#3fe0ff', [1, 0.04, 0.04]);
          }
          break;
        }
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
        case 'viaduct': {
          // A concrete railway viaduct: ballast and rails on top, overhead-wire masts along the far side.
          const north = lookAt(tx, ty - 1) !== 'viaduct';
          batch.add('block', cx, 0, cz, vary('#6e7280', tx, ty, 0.03), [1, VIADUCT_H, 1]);
          floor(tx, ty, '#3e4048', 0.03, VIADUCT_H + 0.02);
          const railZ = north ? ty + 0.65 : ty + 0.35;
          batch.add('block', cx, VIADUCT_H + 0.02, railZ, '#b8bcc8', [1, 0.05, 0.05]);
          for (let i = 0; i < 3; i++) batch.add('block', tx + 0.17 + i * 0.33, VIADUCT_H + 0.02, north ? ty + 0.85 : ty + 0.15, '#5a4a3a', [0.1, 0.03, 0.4]);
          if (north) batch.add('block', cx, VIADUCT_H, ty + 0.04, '#8a8e9a', [1, 0.3, 0.08]);
          else if (tx % 4 === 0) {
            batch.add('block', cx, VIADUCT_H, ty + 0.9, '#5a5e6a', [0.06, 1.1, 0.06]);
            batch.add('block', cx, VIADUCT_H + 1.05, ty + 0.55, '#5a5e6a', [0.04, 0.04, 0.8]);
          }
          if (north) {
            if (!viaduct) viaduct = { x0: tx, x1: tx, z: ty + 1 };
            viaduct.x1 = tx;
          }
          break;
        }
        case 'ramen': {
          // A ramen yatai: wooden counter with stools, a red-tiled awning hung with indigo noren
          // curtains, red paper lanterns (akachōchin) at the ends and a steaming stockpot.
          floor(tx, ty, '#5a5866', 0.02);
          const left = lookAt(tx - 1, ty) !== 'ramen';
          const right = lookAt(tx + 1, ty) !== 'ramen';
          batch.add('block', cx, 0, ty + 0.3, '#4a3022', [1, 1.05, 0.5]);
          batch.add('block', cx, 0, ty + 0.72, '#8a5a3a', [1, 0.55, 0.4]);
          batch.add('block', cx, 0.55, ty + 0.75, '#c89a6a', [1, 0.05, 0.48]);
          for (const x of [0.28, 0.72]) {
            batch.add('barrel', tx + x, 0, ty + 1.12, '#3a3c46', [0.1, 0.55, 0.1]);
            batch.add('barrel', tx + x, 0.42, ty + 1.12, '#b02a3a', [0.28, 0.06, 0.28]);
          }
          batch.add('block', cx, 1.5, ty + 0.55, '#8a2a1e', [1.04, 0.1, 1.1]);
          batch.add('block', cx, 1.42, ty + 1.08, '#f0e8d8', [1.04, 0.12, 0.04]);
          for (let i = 0; i < 3; i++) {
            batch.add('block', tx + 0.18 + i * 0.32, 1.12, ty + 1.08, '#2a2a5a', [0.28, 0.32, 0.02]);
            batch.add('neon', tx + 0.18 + i * 0.32, 1.2, ty + 1.095, '#f0e8d8', [0.1, 0.1, 0.01]);
          }
          if (left) batch.add('block', tx + 0.05, 0, ty + 1.02, '#4a3022', [0.08, 1.5, 0.08]);
          if (right) batch.add('block', tx + 0.95, 0, ty + 1.02, '#4a3022', [0.08, 1.5, 0.08]);
          if (left || right) {
            const lantern = new THREE.MeshBasicMaterial({ color: '#ff5a3a' });
            glows.push({ material: lantern, base: lantern.color.clone() });
            const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 10), lantern);
            mesh.position.set(left ? tx + 0.05 : tx + 0.95, 1.2, ty + 1.2);
            group.add(mesh);
          }
          if (!left && !right) {
            // The middle of the stall: a stockpot with rising steam, and a sign on the roof.
            batch.add('barrel', cx, 1.05, ty + 0.3, '#9aa0aa', [0.55, 0.4, 0.55]);
            for (let i = 0; i < 3; i++) batch.add('blob', cx + (i - 1) * 0.08, 1.45 + i * 0.22, ty + 0.3, '#e8eef4', [0.2 + i * 0.06, 0.16 + i * 0.05, 0.2 + i * 0.06]);
            batch.add('block', cx, 1.6, ty + 0.9, '#ffd23f', [0.8, 0.3, 0.06]);
            batch.add('neon', cx, 1.75, ty + 0.94, '#b02a3a', [0.6, 0.14, 0.01]);
          }
          break;
        }
        case 'tamagaki': {
          // A shrine's vermilion wooden fence, joined to its neighbors.
          floor(tx, ty, '#5a5866', 0.02);
          batch.add('stake', cx, 0, cz, '#c8321e', [0.5, 0.75, 0.5]);
          const arms: Array<[number, number]> = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ];
          for (const [dx, dz] of arms) {
            if (lookAt(tx + dx, ty + dz) !== 'tamagaki') continue;
            const size: [number, number, number] = dx ? [0.5, 0.07, 0.07] : [0.07, 0.07, 0.5];
            for (const y of [0.3, 0.6]) batch.add('block', cx + dx * 0.25, y, cz + dz * 0.25, '#c8321e', size);
          }
          break;
        }
        case 'toro': {
          // A stone lantern (tōrō) with a softly glowing fire box.
          floor(tx, ty, '#5a5866', 0.02);
          batch.add('block', cx, 0, cz, '#8a8a84', [0.5, 0.15, 0.5]);
          batch.add('block', cx, 0.15, cz, '#9a9a94', [0.18, 0.55, 0.18]);
          batch.add('block', cx, 0.95, cz, '#8a8a84', [0.42, 0.06, 0.42]);
          batch.add('flatcone', cx, 1.12, cz, '#7a7a74', [0.38, 0.6, 0.38]);
          const fire = new THREE.MeshBasicMaterial({ color: '#ffb35a' });
          glows.push({ material: fire, base: fire.color.clone() });
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.3), fire);
          box.position.set(cx, 0.83, cz);
          group.add(box);
          break;
        }
        case 'ema':
          // A rack of ema: small wooden plaques where visitors write their wishes.
          floor(tx, ty, '#5a5866', 0.02);
          batch.add('block', tx + 0.1, 0, cz, '#6a4a32', [0.08, 1.0, 0.08]);
          batch.add('block', tx + 0.9, 0, cz, '#6a4a32', [0.08, 1.0, 0.08]);
          batch.add('block', cx, 1.0, cz, '#4a3a2a', [1, 0.08, 0.3]);
          for (let row = 0; row < 2; row++) {
            for (let i = 0; i < 4; i++) batch.add('block', tx + 0.2 + i * 0.2, 0.45 + row * 0.25, cz + 0.05, i % 3 ? '#e8c890' : '#d8b878', [0.15, 0.13, 0.03]);
          }
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
          // The city's south wall sits right above the Metro station: keep it low so it doesn't hide the street.
          const overStation = lookAt(tx, ty + 1) === 'tunnelwall' || lookAt(tx, ty + 1) === 'metrostairs';
          const h = overStation ? 0.4 + r(tx, ty, 1) * 0.3 : 0.8 + r(tx, ty, 1) * 1.8;
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
        case 'cot': {
          // A folding camp cot, two tiles long: steel frame, thin mattress, a rust-red wool blanket.
          floor(tx, ty, '#d8dce4', 0.02);
          const head = lookAt(tx, ty - 1) !== 'cot';
          for (const x of [0.15, 0.85]) batch.add('block', tx + x, 0, cz, '#5a5e68', [0.05, 0.35, 0.05]);
          batch.add('block', cx, 0.33, cz, '#5a5e68', [0.8, 0.04, 1]);
          batch.add('block', cx, 0.37, cz, '#c8ccd0', [0.74, 0.08, 1]);
          if (head) batch.add('block', cx, 0.45, ty + 0.25, '#f0ece4', [0.6, 0.1, 0.3]);
          else batch.add('block', cx, 0.45, cz - 0.1, '#9a3a2a', [0.78, 0.07, 0.9], [0.05, 0, 0]);
          break;
        }
        case 'books': {
          // Towers of rescued books and loose notes.
          floor(tx, ty, '#d8dce4', 0.02);
          const spines = ['#7a2a2a', '#2a4a7a', '#3a6a3a', '#8a6a2a', '#5a3a6a', '#e8e0cc'];
          for (let pile = 0; pile < 2; pile++) {
            const px = tx + 0.28 + pile * 0.44;
            const pz = ty + 0.35 + r(tx, ty, pile) * 0.3;
            const count = 3 + Math.floor(r(tx, ty, pile + 2) * 4);
            for (let i = 0; i < count; i++) {
              batch.add('block', px, i * 0.09, pz, spines[Math.floor(r(tx, ty, i + pile * 7) * spines.length)], [0.32, 0.08, 0.24], [0, (r(tx, ty, i + 20) - 0.5) * 0.5, 0]);
            }
          }
          for (let i = 0; i < 3; i++) batch.add('block', tx + 0.15 + r(tx, ty, i + 30) * 0.7, 0, ty + 0.75 + r(tx, ty, i + 33) * 0.2, '#f4f0e4', [0.18, 0.01, 0.14], [0, r(tx, ty, i + 36) * 3, 0]);
          break;
        }
        case 'brokencase':
          // A smashed showcase: an empty pedestal, a jagged stump of glass and shards all around.
          floor(tx, ty, (tx + ty) % 2 ? '#d8d4cc' : '#b8b4ac', 0.02);
          batch.add('block', cx, 0, cz, '#5a4a3a', [0.8, 0.6, 0.6]);
          batch.add('glass', cx - 0.2, 0.6, cz, '#d8f0ff', [0.3, 0.22, 0.56]);
          batch.add('block', cx - 0.38, 0.6, cz - 0.28, '#b8963a', [0.03, 0.62, 0.03]);
          batch.add('block', cx + 0.38, 0.6, cz + 0.28, '#b8963a', [0.03, 0.3, 0.03], [0, 0, 0.6]);
          for (let i = 0; i < 5; i++) batch.add('block', tx + 0.1 + r(tx, ty, i) * 0.8, 0, ty + 0.75 + r(tx, ty, i + 5) * 0.25, '#cfe8f4', [0.12, 0.02, 0.07], [0, r(tx, ty, i + 9) * 3, 0]);
          break;
        case 'litter':
          // Two hundred years of what visitors left behind: papers, cans, a museum leaflet.
          floor(tx, ty, (tx + ty) % 2 ? '#d8d4cc' : '#b8b4ac', 0.02);
          for (let i = 0; i < 3; i++) batch.add('block', tx + 0.15 + r(tx, ty, i) * 0.7, 0, ty + 0.15 + r(tx, ty, i + 3) * 0.7, i ? '#e8e0cc' : '#c8d8e8', [0.22, 0.01, 0.16], [0, r(tx, ty, i + 6) * 3, 0]);
          batch.add('barrel', tx + 0.3 + r(tx, ty, 9) * 0.4, 0, ty + 0.3 + r(tx, ty, 10) * 0.4, '#b02a3a', [0.12, 0.14, 0.12]);
          break;
        case 'glassshards':
          // Marble strewn with the glass of smashed display cases.
          floor(tx, ty, (tx + ty) % 2 ? '#d8d4cc' : '#b8b4ac', 0.02);
          for (let i = 0; i < 6; i++) {
            batch.add('block', tx + 0.15 + r(tx, ty, i) * 0.7, 0, ty + 0.15 + r(tx, ty, i + 6) * 0.7, '#cfe8f4', [0.14, 0.02, 0.08], [0, r(tx, ty, i + 12) * 3, 0]);
          }
          break;
        case 'terminal': {
          // An old security console: a slanted desk with one dim screen still on standby.
          floor(tx, ty, '#b8b4ac', 0.02);
          batch.add('block', cx, 0, cz, '#4a4e58', [0.7, 0.75, 0.5]);
          batch.add('block', cx, 0.75, cz + 0.05, '#3a3e48', [0.7, 0.08, 0.45], [-0.4, 0, 0]);
          const screen = new THREE.MeshBasicMaterial({ color: '#5aff8a' });
          glows.push({ material: screen, base: screen.color.clone() });
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.02), screen);
          panel.position.set(cx, 0.95, cz + 0.12);
          panel.rotation.x = -0.4;
          group.add(panel);
          break;
        }
        case 'metrostairs':
          // Stairs down into the Metro, half buried in sand.
          for (let i = 0; i < 4; i++) floor(tx, ty, i % 2 ? '#8a8478' : '#9a948a', 0.02, -0.12 * i - (ty % 2) * 0.48);
          batch.add('block', cx, -0.6, ty + 0.85, '#d8c08a', [1, 0.5, 0.3]);
          break;
        case 'platform':
          // A Metro platform: worn tiles, with the yellow safety line along the tracks.
          floor(tx, ty, (tx + ty) % 2 ? '#6a6660' : '#5e5a54', 0.02);
          if (lookAt(tx, ty + 1) === 'tracks') batch.add('neon', cx, 0.005, ty + 0.85, '#c8b030', [1, 0.01, 0.08]);
          break;
        case 'tracks':
          floor(tx, ty, '#3e3a34', 0.03, -0.05);
          for (let i = 0; i < 3; i++) batch.add('block', tx + 0.17 + i * 0.33, -0.05, cz, '#5a4a3a', [0.12, 0.04, 0.8]);
          if (lookAt(tx, ty - 1) !== 'tracks' || lookAt(tx, ty + 1) !== 'tracks') break;
          batch.add('block', cx, -0.01, ty + 0.3, '#8a8478', [1, 0.05, 0.05]);
          batch.add('block', cx, -0.01, ty + 0.7, '#8a8478', [1, 0.05, 0.05]);
          break;
        case 'tunnelwall':
          // Drawn low, like a cutaway model, so the camera can see into the station.
          batch.add('block', cx, 0, cz, vary('#3a3834', tx, ty, 0.06), [1, 0.5, 1]);
          break;
        case 'cistern':
          // A cistern catching the groundwater that still seeps through the tunnel walls.
          floor(tx, ty, '#4a463e', 0.02);
          batch.add('barrel', cx, 0, cz, '#7a7468', [1.3, 0.55, 1.3]);
          batch.add('water', cx, 0.42, cz, '#2a6a9a', [0.7, 0.1, 0.7]);
          break;
        case 'marble':
          floor(tx, ty, (tx + ty) % 2 ? '#d8d4cc' : '#b8b4ac', 0.02);
          break;
        case 'museumwall':
        case 'wallpanel': {
          // Like Neo-Tokyo's buildings, the walls right south of a hall sink while Andrew is inside.
          const cut = interiorNorth(tx, ty);
          if (cut) batch.add('block', cx, 0, cz, '#c8c2b4', [0.98, 0.4, 0.98]);
          const b = cut ? cutBatchFor(cut) : batch;
          b.add('block', cx, 0, cz, '#d8d2c4', [1, 2.4, 1]);
          if (lookAt(tx, ty + 1) !== 'museumwall') b.add('block', cx, 2.2, cz + 0.08, '#e8e2d4', [1, 0.2, 1.1]);
          if (look === 'wallpanel') {
            // An access panel at hand height on the outer face: steel plate, dark screen, keypad, red standby light.
            b.add('block', cx, 0.55, cz + 0.53, '#6a6e78', [0.5, 0.6, 0.06]);
            b.add('neon', cx, 0.98, cz + 0.565, '#1a2a3a', [0.34, 0.18, 0.01]);
            for (let i = 0; i < 6; i++) b.add('block', cx - 0.1 + (i % 3) * 0.1, 0.62 + Math.floor(i / 3) * 0.1, cz + 0.565, '#a8acb4', [0.07, 0.06, 0.02]);
            b.add('neon', cx + 0.17, 1.08, cz + 0.565, '#ff2a2a', [0.05, 0.05, 0.01]);
          }
          break;
        }
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
          // A wooden pedestal under a clear glass case with a brass frame, so what's inside reads clearly.
          floor(tx, ty, (tx + ty) % 2 ? '#d8d4cc' : '#b8b4ac', 0.02);
          batch.add('block', cx, 0, cz, '#5a4a3a', [0.8, 0.6, 0.6]);
          batch.add('glass', cx, 0.6, cz, '#d8f0ff', [0.76, 0.62, 0.56]);
          for (const [dx, dz] of [
            [-0.38, -0.28],
            [0.38, -0.28],
            [-0.38, 0.28],
            [0.38, 0.28],
          ]) {
            batch.add('block', cx + dx, 0.6, cz + dz, '#b8963a', [0.03, 0.62, 0.03]);
          }
          for (const dz of [-0.28, 0.28]) batch.add('block', cx, 1.22, cz + dz, '#b8963a', [0.8, 0.03, 0.03]);
          for (const dx of [-0.38, 0.38]) batch.add('block', cx + dx, 1.22, cz, '#b8963a', [0.03, 0.03, 0.6]);
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
  for (const cut of cuts.values()) {
    cut.batch.build(cut.group, waterMaterial);
    group.add(cut.group);
  }
  const train = viaduct ? buildTrain(viaduct) : null;
  if (train) group.add(train.root);
  return {
    group,
    update(time, inside) {
      for (const [floorLook, cut] of cuts) {
        cut.group.scale.y += ((floorLook === inside ? 0.12 : 1) - cut.group.scale.y) * 0.15;
        cut.group.visible = cut.group.scale.y > 0.14;
      }
      // A gentle shimmer on water and glowing props.
      waterMaterial.emissive.setHSL(0.55, 0.6, 0.05 + Math.sin(time * 1.5) * 0.03);
      for (const glow of glows) glow.material.color.copy(glow.base).offsetHSL(0, 0, Math.sin(time * 4) * 0.08);
      for (const wheel of spinners) wheel.rotation.z = -time * 0.9;
      train?.update(time);
    },
  };
}

/**
 * A Yamanote Line train: silver cars with the line's yellow-green stripe, running
 * across the viaduct, then waiting out of sight before the next one comes by.
 */
function buildTrain(track: { x0: number; x1: number; z: number }): { root: THREE.Group; update(time: number): void } {
  const root = new THREE.Group();
  const CARS = 5;
  const CAR = 2.4;
  const silver = toon('#d0d4dc');
  const green = toon('#7ac143');
  const glass = new THREE.MeshBasicMaterial({ color: '#2a3a52' });
  const part = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, 0);
    mesh.castShadow = true;
    return mesh;
  };
  for (let i = 0; i < CARS; i++) {
    const x = -i * (CAR + 0.1);
    root.add(part(CAR, 0.72, 0.6, silver, x, 0.42));
    root.add(part(CAR + 0.02, 0.1, 0.62, green, x, 0.3));
    root.add(part(CAR - 0.2, 0.2, 0.62, glass, x, 0.58));
    root.add(part(CAR - 0.1, 0.06, 0.45, toon('#9aa0aa'), x, 0.81));
  }
  // The lead car's dark cab face and headlights.
  root.add(part(0.06, 0.6, 0.6, toon('#1a1a22'), CAR / 2 + 0.02, 0.46));
  const lights = new THREE.MeshBasicMaterial({ color: '#fff4c8' });
  for (const z of [-0.2, 0.2]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.08), lights);
    lamp.position.set(CAR / 2 + 0.06, 0.3, z);
    root.add(lamp);
  }
  const length = CARS * (CAR + 0.1);
  const from = track.x0 - CAR;
  const to = track.x1 + length + 1;
  const RUN = 11;
  const PERIOD = 24;
  root.position.set(from, VIADUCT_H + 0.02, track.z);
  return {
    root,
    update(time) {
      const t = time % PERIOD;
      root.visible = t < RUN;
      root.position.x = from + ((to - from) * Math.min(t, RUN)) / RUN;
    },
  };
}
