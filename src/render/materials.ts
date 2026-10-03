import * as THREE from 'three';

/*
 * Cel-shaded ("toon") look: a 3-step light ramp, flat colors and dark outlines,
 * aiming for the chunky, bright style of games like Pizza Possum.
 */

const ramp = new THREE.DataTexture(new Uint8Array([70, 160, 255]), 3, 1, THREE.RedFormat);
ramp.minFilter = THREE.NearestFilter;
ramp.magFilter = THREE.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;

const cache = new Map<string, THREE.MeshToonMaterial>();

export interface ToonOptions {
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  /** Fresh material instead of a shared one (for per-object fades). */
  unique?: boolean;
}

export function toon(color: THREE.ColorRepresentation, options: ToonOptions = {}): THREE.MeshToonMaterial {
  const key = `${new THREE.Color(color).getHexString()}|${JSON.stringify(options)}`;
  if (!options.unique) {
    const cached = cache.get(key);
    if (cached) return cached;
  }
  const material = new THREE.MeshToonMaterial({
    color,
    gradientMap: ramp,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  });
  if (!options.unique) cache.set(key, material);
  return material;
}

/**
 * Shows the player through walls and trees so they never get lost behind scenery.
 * It only draws where something already in the depth buffer is in front, so it
 * must render after the scenery but before the player (see renderOrder in views).
 */
export const SILHOUETTE = new THREE.MeshBasicMaterial({
  color: 0x4f9fe0,
  depthWrite: false,
  depthFunc: THREE.GreaterDepth,
});

const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1a1420, side: THREE.BackSide });

/**
 * Inverted-hull outline: a slightly bigger copy of the mesh rendered back-faces only.
 * Works well for the convex primitives our characters are made of.
 */
export function outline(mesh: THREE.Mesh, thickness = 0.035): THREE.Mesh {
  mesh.geometry.computeBoundingSphere();
  const radius = mesh.geometry.boundingSphere?.radius ?? 0.5;
  const hull = new THREE.Mesh(mesh.geometry, OUTLINE);
  hull.scale.setScalar(1 + thickness / Math.max(0.05, radius));
  hull.name = 'outline';
  mesh.add(hull);
  return mesh;
}
