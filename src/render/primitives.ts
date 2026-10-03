import * as THREE from 'three';
import { outline, toon, type ToonOptions } from './materials.ts';

/*
 * Building blocks for the low-poly models. Units: 1 = one map tile.
 * Every model stands on y = 0 and faces +Z.
 */

export type Color = THREE.ColorRepresentation;

export interface PartOptions extends ToonOptions {
  outline?: boolean;
  shadow?: boolean;
}

function finish(mesh: THREE.Mesh, x: number, y: number, z: number, options: PartOptions): THREE.Mesh {
  mesh.position.set(x, y, z);
  mesh.castShadow = options.shadow ?? true;
  mesh.receiveShadow = false;
  if (options.outline) outline(mesh);
  return mesh;
}

export function box(w: number, h: number, d: number, color: Color, x = 0, y = 0, z = 0, options: PartOptions = {}): THREE.Mesh {
  return finish(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color, options)), x, y, z, options);
}

export function ball(r: number, color: Color, x = 0, y = 0, z = 0, options: PartOptions = {}, segments = 8): THREE.Mesh {
  return finish(new THREE.Mesh(new THREE.SphereGeometry(r, segments, Math.max(4, segments - 2)), toon(color, options)), x, y, z, options);
}

export function cylinder(rTop: number, rBottom: number, h: number, color: Color, x = 0, y = 0, z = 0, options: PartOptions = {}, segments = 8): THREE.Mesh {
  return finish(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), toon(color, options)), x, y, z, options);
}

export function cone(r: number, h: number, color: Color, x = 0, y = 0, z = 0, options: PartOptions = {}, segments = 6): THREE.Mesh {
  return finish(new THREE.Mesh(new THREE.ConeGeometry(r, h, segments), toon(color, options)), x, y, z, options);
}

/** Emissive "light" part that ignores lighting (screens, LEDs, lasers). */
export function glow(w: number, h: number, d: number, color: Color, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
  mesh.position.set(x, y, z);
  return mesh;
}

export function pivot(x: number, y: number, z: number, ...children: THREE.Object3D[]): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  if (children.length > 0) group.add(...children);
  return group;
}

/** Every animated model exposes the same small interface. */
export interface Rig {
  root: THREE.Group;
  /** `walk` goes from 0 (idle) to 1 (full stride). */
  animate(time: number, walk: number): void;
}
