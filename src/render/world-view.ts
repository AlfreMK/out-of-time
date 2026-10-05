import * as THREE from 'three';
import { VIEW_H, VIEW_W, type Screen } from '../engine/screen.ts';
import type { EraId } from '../game/state.ts';
import type { World } from '../game/world.ts';
import type { Entity } from '../game/entities/entity.ts';
import type { Watcher } from '../game/entities/watcher.ts';
import { Sign } from '../game/entities/props.ts';
import { buildPterosaur } from './creatures.ts';
import { createView, PX, type EntityView } from './entity-views.ts';
import type { Rig } from './primitives.ts';
import { buildTerrain, INTERIOR_LOOKS, type Terrain } from './terrain.ts';

interface Theme {
  sky: string;
  /** Ground color beyond the map edges, fading into the fog. */
  outskirts: string;
  hemiSky: string;
  hemiGround: string;
  sun: string;
  /** Daylight strength: 1 for a sunny day, low for night scenes. */
  light: number;
  weather?: 'rain' | 'dust';
}

const THEMES: Record<EraId, Theme> = {
  prehistory: { sky: '#f3cf96', outskirts: '#4f7a30', hemiSky: '#fff1d6', hemiGround: '#5a7a3a', sun: '#fff0d0', light: 1 },
  medieval: { sky: '#bfe0f0', outskirts: '#5a8a3e', hemiSky: '#ffffff', hemiGround: '#6a8a5a', sun: '#fffaf0', light: 1 },
  araucania: { sky: '#cfe4d8', outskirts: '#4a7a3a', hemiSky: '#f0fff4', hemiGround: '#4a6a3a', sun: '#fff6e0', light: 0.9 },
  // Tokyo at night, during the June rainy season (tsuyu).
  future: { sky: '#1a1430', outskirts: '#14141c', hemiSky: '#a08aff', hemiGround: '#3a2a4a', sun: '#b0c0ff', light: 0.6, weather: 'rain' },
  // After the long drought: a hazy, dusty afternoon.
  ruins: { sky: '#e8c090', outskirts: '#c8a878', hemiSky: '#ffe8c8', hemiGround: '#8a6a4a', sun: '#ffd8a0', light: 1.05, weather: 'dust' },
};

const WEATHER_COUNT = 500;

/** Where the follow camera sits relative to the player (Pizza Possum-style high angle). */
const CAMERA_OFFSET = new THREE.Vector3(0, 13.5, 8.6);
const CONE_RAYS = 22;

/** Direction from the scene to the sun, and the size of one shadow-map texel in world units (36 m over 2048 px). */
const SUN_OFFSET = new THREE.Vector3(6, 14, 5);
const SHADOW_TEXEL = 36 / 2048;
/** Rotation into the sun's view, used to snap the shadow camera to whole texels. */
const SUN_ROTATION = new THREE.Matrix4().lookAt(SUN_OFFSET, new THREE.Vector3(), new THREE.Vector3(0, 1, 0));
const SUN_ROTATION_INV = SUN_ROTATION.clone().invert();
const tmpSun = new THREE.Vector3();
const MAX_PARTICLES = 400;

/** Everything the player sees of a World, rebuilt from its state every frame. */
export class WorldView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, VIEW_W / VIEW_H, 0.1, 200);
  private readonly world: World;
  private readonly terrain: Terrain;
  private readonly theme: Theme;
  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly lantern: THREE.PointLight;
  private readonly fog: THREE.Fog;
  private readonly views = new Map<Entity, EntityView>();
  private readonly cones = new Map<Watcher, THREE.Mesh>();
  private readonly ringPool: THREE.Mesh[] = [];
  private readonly particles: THREE.InstancedMesh;
  private readonly focus = new THREE.Vector3();
  private darkness = 0;
  /** 0 outdoors, 1 under a roof: rain and dust fade out indoors. */
  private indoors = 0;
  private weatherOpacity = 0;
  private readonly weather: THREE.LineSegments | THREE.Points | null = null;
  /** Pterosaurs soaring high over the Cretaceous map; their shadows sweep across the ground. */
  private readonly flyers: Rig[] = [];

  constructor(world: World) {
    this.world = world;
    this.theme = THEMES[world.era];
    this.scene.background = new THREE.Color(this.theme.sky);
    this.fog = new THREE.Fog(this.theme.sky, 20, 40);
    this.scene.fog = this.fog;

    this.hemi = new THREE.HemisphereLight(this.theme.hemiSky, this.theme.hemiGround, 1.7);
    this.sun = new THREE.DirectionalLight(this.theme.sun, 2.3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const cam = this.sun.shadow.camera;
    cam.left = -18;
    cam.right = 18;
    cam.top = 18;
    cam.bottom = -18;
    cam.near = 1;
    cam.far = 50;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.lantern = new THREE.PointLight('#ffd9a0', 0, 10, 1);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.lantern);

    this.weather = this.buildWeather();
    if (this.weather) {
      this.scene.add(this.weather);
      this.weatherOpacity = (this.weather.material as THREE.Material).opacity;
    }

    if (world.era === 'prehistory') {
      for (let i = 0; i < 2; i++) {
        const flyer = buildPterosaur();
        flyer.root.scale.setScalar(1.6);
        flyer.root.traverse((child) => (child.castShadow = true));
        this.flyers.push(flyer);
        this.scene.add(flyer.root);
      }
    }

    // Tiles carrying an advertising sign, so the terrain doesn't put its own clutter through them.
    const signTiles = new Set<string>();
    for (const entity of world.entityList) {
      if (!(entity instanceof Sign)) continue;
      const tx = Math.floor(entity.x / PX);
      const ty = Math.floor(entity.y / PX) - 1;
      for (let i = 0; i < Math.max(1, Math.ceil(entity.spec.width)); i++) signTiles.add(`${tx + i},${ty}`);
    }
    this.terrain = buildTerrain(world.map, signTiles);
    this.scene.add(this.terrain.group);
    const outskirts = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshToonMaterial({ color: this.theme.outskirts }));
    outskirts.rotation.x = -Math.PI / 2;
    outskirts.position.set(world.map.width / 2, -0.25, world.map.height / 2);
    outskirts.receiveShadow = true;
    this.scene.add(outskirts);

    this.particles = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), MAX_PARTICLES);
    // Allocate instance colors up front so the shader is compiled with them.
    for (let i = 0; i < MAX_PARTICLES; i++) this.particles.setColorAt(i, new THREE.Color('#ffffff'));
    this.particles.count = 0;
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);

    this.snap();
  }

  /** Jump the camera straight to the player (after respawning, on arrival). */
  snap(): void {
    this.focus.set(this.world.hero.x / PX, 0.4, this.world.hero.y / PX);
    this.camera.position.copy(this.focus).add(CAMERA_OFFSET);
    this.camera.lookAt(this.focus);
  }

  sync(time: number, dt: number, shake: number): void {
    this.syncEntities(time, dt);
    this.syncCones();
    this.syncRings();
    this.syncParticles();
    this.syncFlyers(time);
    const here = this.world.map.defAt(this.world.hero.x, this.world.hero.y).look;
    this.terrain.update(time, INTERIOR_LOOKS.has(here) ? here : null);

    // Camera: smooth follow plus optional shake.
    const hero = this.world.hero;
    const { x, y } = this.world.cameraFocus ?? hero;
    const target = new THREE.Vector3(x / PX, 0.4, y / PX);
    this.focus.lerp(target, Math.min(1, dt * 6));
    this.camera.position.copy(this.focus).add(CAMERA_OFFSET);
    if (shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * shake * 0.08;
      this.camera.position.y += (Math.random() - 0.5) * shake * 0.08;
    }
    this.camera.lookAt(this.focus);

    // The sun (and its shadow camera) follows the camera, snapped to whole shadow texels in the
    // sun's own view. Without the snap, shadow edges shimmer on roofs and walls as the camera moves.
    tmpSun.copy(this.focus).applyMatrix4(SUN_ROTATION_INV);
    tmpSun.x = Math.round(tmpSun.x / SHADOW_TEXEL) * SHADOW_TEXEL;
    tmpSun.y = Math.round(tmpSun.y / SHADOW_TEXEL) * SHADOW_TEXEL;
    tmpSun.applyMatrix4(SUN_ROTATION);
    this.sun.target.position.copy(tmpSun);
    this.sun.position.copy(tmpSun).add(SUN_OFFSET);

    // Entering a cave dims the world and switches on Andrew's pocket lamp.
    const inDark = this.world.map.defAt(hero.x, hero.y).dark === true;
    this.darkness += ((inDark ? 1 : 0) - this.darkness) * Math.min(1, dt * 2.5);
    const d = this.darkness;
    const day = this.theme.light;
    this.hemi.intensity = 1.7 * day * (1 - d) + 0.22 * d;
    this.sun.intensity = 2.3 * day * (1 - d) + 0.05 * d;
    this.indoors += ((INTERIOR_LOOKS.has(here) ? 1 : 0) - this.indoors) * Math.min(1, dt * 3);
    this.updateWeather(dt);
    this.lantern.intensity = 14 * d * (1 + Math.sin(time * 9) * 0.04);
    this.lantern.position.set(hero.x / PX, 1.6, hero.y / PX + 0.3);
    const sky = new THREE.Color(this.theme.sky).lerp(new THREE.Color('#0a0a12'), d);
    (this.scene.background as THREE.Color).copy(sky);
    this.fog.color.copy(sky);
    this.fog.near = 20 - d * 6;
    this.fog.far = 40 - d * 14;
  }

  /** Rain streaks or drifting dust around the camera. */
  private buildWeather(): THREE.LineSegments | THREE.Points | null {
    const kind = this.theme.weather;
    if (!kind) return null;
    const geometry = new THREE.BufferGeometry();
    const perPoint = kind === 'rain' ? 2 : 1;
    const positions = new Float32Array(WEATHER_COUNT * perPoint * 3);
    for (let i = 0; i < WEATHER_COUNT; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = Math.random() * 12;
      const z = (Math.random() - 0.5) * 24;
      positions.set([x, y, z], i * perPoint * 3);
      if (kind === 'rain') positions.set([x - 0.05, y - 0.5, z + 0.05], i * 6 + 3);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const weather =
      kind === 'rain'
        ? new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#8aa0d8', transparent: true, opacity: 0.45 }))
        : new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#f0d8b0', size: 0.06, transparent: true, opacity: 0.6 }));
    weather.frustumCulled = false;
    return weather;
  }

  private updateWeather(dt: number): void {
    const weather = this.weather;
    if (!weather) return;
    // No rain (or blowing dust) under a roof.
    (weather.material as THREE.Material).opacity = this.weatherOpacity * (1 - this.indoors);
    weather.visible = this.indoors < 0.98;
    weather.position.set(this.focus.x, 0, this.focus.z);
    const attr = weather.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = attr.array as Float32Array;
    const rain = this.theme.weather === 'rain';
    const stride = rain ? 6 : 3;
    for (let i = 0; i < WEATHER_COUNT; i++) {
      const o = i * stride;
      if (rain) {
        array[o + 1] -= dt * 16;
        array[o + 4] -= dt * 16;
        if (array[o + 4] < 0) {
          array[o + 1] += 12;
          array[o + 4] += 12;
        }
      } else {
        array[o] += dt * (0.8 + Math.sin(i) * 0.3);
        array[o + 1] += Math.sin(i + array[o]) * dt * 0.2;
        if (array[o] > 15) array[o] -= 30;
      }
    }
    attr.needsUpdate = true;
  }

  render(screen: Screen): void {
    screen.render(this.scene, this.camera);
  }

  /** Projects a map position (pixels) at a height (pixels) to UI coordinates. */
  project(x: number, y: number, height: number): { x: number; y: number; visible: boolean } {
    const v = new THREE.Vector3(x / PX, height / PX, y / PX).project(this.camera);
    return { x: ((v.x + 1) / 2) * VIEW_W, y: ((1 - v.y) / 2) * VIEW_H, visible: v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2 };
  }

  private syncEntities(time: number, dt: number): void {
    const alive = new Set(this.world.entityList);
    for (const [entity, view] of this.views) {
      if (!alive.has(entity) || entity.removed) {
        this.scene.remove(view.object);
        this.views.delete(entity);
      }
    }
    for (const entity of alive) {
      let view = this.views.get(entity);
      if (!view) {
        const created = createView(entity, this.world);
        if (!created) continue;
        view = created;
        this.views.set(entity, view);
        this.scene.add(view.object);
      }
      view.update(time, dt);
    }
  }

  private syncCones(): void {
    for (const watcher of this.world.watcherList) {
      let cone = this.cones.get(watcher);
      if (!cone) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((CONE_RAYS + 2) * 3), 3));
        const index: number[] = [];
        for (let i = 1; i <= CONE_RAYS; i++) index.push(0, i + 1, i);
        geometry.setIndex(index);
        cone = new THREE.Mesh(
          geometry,
          // Drawn on top of scenery, so a guard's view is never hidden under the canopy.
          new THREE.MeshBasicMaterial({ color: '#ffe680', transparent: true, opacity: 0.25, depthWrite: false, depthTest: false, side: THREE.DoubleSide }),
        );
        cone.renderOrder = 3;
        cone.frustumCulled = false;
        this.cones.set(watcher, cone);
        this.scene.add(cone);
      }
      cone.visible = watcher.watching;
      if (!cone.visible) continue;
      const positions = cone.geometry.getAttribute('position') as THREE.BufferAttribute;
      const ox = watcher.x;
      const oy = watcher.y - 4;
      positions.setXYZ(0, ox / PX, 0.06, oy / PX);
      for (let i = 0; i <= CONE_RAYS; i++) {
        const a = watcher.angle - watcher.viewFov / 2 + (watcher.viewFov * i) / CONE_RAYS;
        const len = this.world.map.rayLength(ox, oy, a, watcher.viewRange);
        positions.setXYZ(i + 1, (ox + Math.cos(a) * len) / PX, 0.06, (oy + Math.sin(a) * len) / PX);
      }
      positions.needsUpdate = true;
      cone.geometry.computeBoundingSphere();
      const s = Math.min(1, watcher.suspicion);
      const material = cone.material as THREE.MeshBasicMaterial;
      material.color.setRGB(1, 0.9 - s * 0.65, 0.5 - s * 0.35);
      material.opacity = 0.22 + s * 0.25;
    }
  }

  private syncRings(): void {
    const rings = this.world.ringList;
    while (this.ringPool.length < rings.length) {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.93, 1, 40),
        new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false }),
      );
      mesh.rotation.x = -Math.PI / 2;
      this.ringPool.push(mesh);
      this.scene.add(mesh);
    }
    this.ringPool.forEach((mesh, i) => {
      const ring = rings[i];
      mesh.visible = ring !== undefined;
      if (!ring) return;
      const radius = Math.max(0.05, (ring.radius * ring.t) / PX);
      mesh.position.set(ring.x / PX, 0.08, ring.y / PX);
      mesh.scale.set(radius, radius, 1);
      // A noise drowned out by the train only draws a faint, small ring: nobody heard it.
      if (ring.muffled) mesh.scale.multiplyScalar(0.5);
      (mesh.material as THREE.MeshBasicMaterial).opacity = (ring.muffled ? 0.15 : 0.5) * (1 - ring.t);
    });
  }

  /**
   * Two azhdarchids gliding on wide loops over the whole map (one each way), so now and then one
   * passes overhead. Wingbeats come in short bursts between long glides.
   */
  private syncFlyers(time: number): void {
    const map = this.world.map;
    this.flyers.forEach((flyer, i) => {
      const dir = i === 0 ? 1 : -1;
      const a = time * 0.13 * dir + i * 2.5;
      const x = map.width / 2 + Math.cos(a) * map.width * 0.42;
      const z = map.height / 2 + Math.sin(a) * map.height * 0.4;
      flyer.root.position.set(x, 7 + i * 1.2 + Math.sin(time * 0.4 + i) * 0.4, z);
      // Facing along the loop, banking into the turn.
      flyer.root.rotation.set(0, Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir), -0.25 * dir, 'YXZ');
      const flapping = Math.sin(time * 0.5 + i * 3) > 0.6;
      flyer.animate(flapping ? time : 0, 0);
    });
  }

  private syncParticles(): void {
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const list = this.world.particleList;
    const count = Math.min(MAX_PARTICLES, list.length);
    for (let i = 0; i < count; i++) {
      const p = list[i];
      const size = p.size * Math.max(0.15, p.life / p.max);
      matrix.makeScale(size, size, size).setPosition(p.x / PX, p.h / PX, p.y / PX);
      this.particles.setMatrixAt(i, matrix);
      this.particles.setColorAt(i, color.set(p.color));
    }
    this.particles.count = count;
    this.particles.instanceMatrix.needsUpdate = true;
    if (this.particles.instanceColor) this.particles.instanceColor.needsUpdate = true;
  }
}
