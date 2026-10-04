import * as THREE from 'three';
import { angleDiff } from '../engine/random.ts';
import type { Facing } from '../eras/types.ts';
import type { Entity } from '../game/entities/entity.ts';
import { Player } from '../game/entities/player.ts';
import {
  Ally,
  Arrow,
  Bait,
  Companion,
  Decor,
  FallingRock,
  Gate,
  Machine,
  Npc,
  Obstacle,
  Pickup,
  Sleeper,
  Thrown,
} from '../game/entities/props.ts';
import { Watcher } from '../game/entities/watcher.ts';
import type { World } from '../game/world.ts';
import { buildDog, buildPip, buildRaptor, buildRider, buildSleepingBoar, buildSleepingRex } from './creatures.ts';
import { buildHuman } from './humans.ts';
import { buildBot, buildCamera, buildDrone, buildMachine } from './machines.ts';
import { ENEMY_SILHOUETTE, SILHOUETTE } from './materials.ts';
import { box, cylinder } from './primitives.ts';
import { buildBackShield, buildBlastDoor, buildBoulder, buildChest, buildColumn, buildDecor, buildGate, buildItem, buildLog } from './props3d.ts';
import type { ObstacleLook } from '../eras/types.ts';

const OBSTACLE_BUILDERS: Record<ObstacleLook, () => THREE.Group> = { boulder: buildBoulder, column: buildColumn, log: buildLog, blastdoor: buildBlastDoor, chest: buildChest };

/** Map pixels per world unit (one tile). */
export const PX = 16;

export interface EntityView {
  object: THREE.Object3D;
  update(time: number, dt: number): void;
}

const FACING_YAW: Record<Facing, number> = { down: 0, up: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 };

/** Yaw that makes a +Z-facing model look along a 2D map direction. */
const yawFor = (dx: number, dy: number): number => Math.atan2(dx, dy);

function place(object: THREE.Object3D, entity: Entity, lift = 0): void {
  object.position.set(entity.x / PX, lift, entity.y / PX);
}

/** Smoothly turns toward a target yaw. */
function turn(object: THREE.Object3D, target: number, dt: number, speed = 10): void {
  const diff = angleDiff(object.rotation.y, target);
  object.rotation.y += diff * Math.min(1, dt * speed);
}

export function createView(entity: Entity, world: World): EntityView | null {
  if (entity instanceof Player) return playerView(entity, world);
  if (entity instanceof Watcher) return watcherView(entity);
  if (entity instanceof Npc) return npcView(entity, world);
  if (entity instanceof Ally) return allyView(entity, world);
  if (entity instanceof Pickup) return pickupView(entity);
  if (entity instanceof Machine) return machineView(entity);
  if (entity instanceof Obstacle) return staticView(entity, OBSTACLE_BUILDERS[entity.look]());
  if (entity instanceof Sleeper) return sleeperView(entity);
  if (entity instanceof Companion) return companionView(entity, world);
  if (entity instanceof Bait) return staticView(entity, buildItem(entity.item), 0.1);
  if (entity instanceof Thrown) return thrownView(entity);
  if (entity instanceof FallingRock) return rockView(entity);
  if (entity instanceof Arrow) return arrowView(entity);
  if (entity instanceof Gate) return gateView(entity, world);
  if (entity instanceof Decor) return decorView(entity, world);
  return null;
}

/**
 * Gives every mesh of a model a ghost that only draws where scenery hides it.
 * The ghost renders after the scenery (order 1) and the model after its ghost (order 2).
 */
function addSilhouette(root: THREE.Object3D, material: THREE.Material): THREE.Object3D[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name !== 'outline' && child.name !== 'silhouette') meshes.push(child);
    if (child.name === 'outline') child.renderOrder = 2;
  });
  return meshes.map((mesh) => {
    mesh.renderOrder = 2;
    const ghost = new THREE.Mesh(mesh.geometry, material);
    ghost.renderOrder = 1;
    ghost.name = 'silhouette';
    mesh.add(ghost);
    return ghost;
  });
}

function staticView(entity: Entity, object: THREE.Object3D, lift = 0): EntityView {
  return {
    object,
    update() {
      place(object, entity, lift);
    },
  };
}

function playerView(player: Player, world: World): EntityView {
  const rig = buildHuman('andrew');
  // The shield joins the model before its silhouette: added later, it would draw before Andrew's
  // ghost and turn blue whenever it hides his body from the camera (walking north).
  const shield = buildBackShield();
  shield.position.set(0, 0.62, -0.2);
  shield.rotation.y = Math.PI;
  rig.root.add(shield);
  const shieldMeshes: THREE.Mesh[] = [];
  shield.traverse((child) => {
    if (child instanceof THREE.Mesh && child.name !== 'outline') shieldMeshes.push(child);
  });
  // Own materials so the player can fade while hidden without affecting anyone else.
  const fading: THREE.Material[] = [];
  for (const mesh of [...rig.meshes, ...shieldMeshes]) {
    const material = (mesh.material as THREE.Material).clone();
    mesh.material = material;
    fading.push(material);
  }
  const ghosts = addSilhouette(rig.root, SILHOUETTE);

  let lift = 0;
  return {
    object: rig.root,
    update(time, dt) {
      // Raised tiles lift Andrew; while jumping down a ledge the hop arc takes over.
      const tileHeight = world.map.defAt(player.x, player.y).height ?? 0;
      lift = player.isHopping ? player.hopHeight / PX : lift + (tileHeight - lift) * Math.min(1, dt * 14);
      place(rig.root, player, lift);
      turn(rig.root, FACING_YAW[player.facing], dt, 14);
      rig.animate(time, player.moving ? (player.sneaking ? 0.55 : 1) : 0);
      rig.root.scale.y = player.sneaking ? 0.86 : 1;
      shield.visible = world.has('shield');
      const opacity = player.hidden ? 0.55 : player.stun > 0 && Math.floor(player.stun * 20) % 2 === 0 ? 0.35 : 1;
      for (const material of fading) {
        material.transparent = opacity < 1;
        material.opacity = opacity;
      }
      for (const ghost of ghosts) ghost.visible = !player.hidden;
    },
  };
}

function watcherView(watcher: Watcher): EntityView {
  const yaw = (): number => yawFor(Math.cos(watcher.angle), Math.sin(watcher.angle));
  switch (watcher.kind) {
    case 'dog': {
      const rig = buildDog();
      addSilhouette(rig.root, ENEMY_SILHOUETTE);
      return {
        object: rig.root,
        update(time, dt) {
          place(rig.root, watcher);
          turn(rig.root, yaw(), dt);
          rig.setEating(watcher.isEating);
          rig.animate(time, watcher.walking ? 1 : 0);
        },
      };
    }
    case 'camera':
    case 'drone':
    case 'bot': {
      const rig = watcher.kind === 'camera' ? buildCamera() : watcher.kind === 'drone' ? buildDrone() : buildBot();
      const turning = rig.head ?? rig.root;
      addSilhouette(rig.root, ENEMY_SILHOUETTE);
      return {
        object: rig.root,
        update(time, dt) {
          place(rig.root, watcher);
          turn(turning, yaw(), dt);
          rig.update(time, watcher.walking ? 1 : 0, watcher.disabled || watcher.asleep);
        },
      };
    }
    default: {
      const rig =
        watcher.kind === 'guard'
          ? buildHuman(watcher.spec.look ?? 'guard')
          : watcher.kind === 'soldier'
            ? buildHuman('soldier')
            : watcher.kind === 'rider'
              ? buildRider()
              : buildRaptor();
      // Dakotaraptor was roughly 4.5-6 m long: much bigger than a person.
      if (watcher.kind === 'raptor') rig.root.scale.setScalar(1.6);
      addSilhouette(rig.root, ENEMY_SILHOUETTE);
      return {
        object: rig.root,
        update(time, dt) {
          place(rig.root, watcher);
          turn(rig.root, yaw(), dt);
          rig.animate(time, watcher.walking ? 1 : 0);
        },
      };
    }
  }
}

function npcView(npc: Npc, world: World): EntityView {
  const rig = buildHuman(npc.look, npc.look === 'guard' ? { weapon: 'spear' } : {});
  const home = FACING_YAW[npc.facing];
  return {
    object: rig.root,
    update(time, dt) {
      place(rig.root, npc);
      // People turn to look at Andrew when he gets close.
      const dx = world.hero.x - npc.x;
      const dy = world.hero.y - npc.y;
      const near = Math.hypot(dx, dy) < 40;
      turn(rig.root, near ? yawFor(dx, dy) : home, dt, 5);
      rig.animate(time, npc.isScriptMoving ? 1 : 0);
    },
  };
}

/** Allies crouch in cover until Andrew comes near. */
function allyView(ally: Ally, world: World): EntityView {
  const rig = buildHuman(ally.look);
  return {
    object: rig.root,
    update(time, dt) {
      place(rig.root, ally);
      const dx = world.hero.x - ally.x;
      const dy = world.hero.y - ally.y;
      const near = Math.hypot(dx, dy) < 36;
      turn(rig.root, near ? yawFor(dx, dy) : 0, dt, 5);
      rig.root.scale.y += ((near || ally.cooldown > 10 ? 1 : 0.7) - rig.root.scale.y) * 0.1;
      rig.animate(time, 0);
    },
  };
}

function pickupView(pickup: Pickup): EntityView {
  const root = new THREE.Group();
  const item = buildItem(pickup.item);
  item.scale.setScalar(1.6);
  root.add(item);
  // Like the player, items show as a silhouette when trees or walls stand between them and the camera.
  addSilhouette(item, SILHOUETTE);
  // The ring and the beam ignore depth so they are never hidden by scenery.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 24),
    new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.7, depthWrite: false, depthTest: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.renderOrder = 3;
  root.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.18, 1.6, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.18, depthWrite: false, depthTest: false, side: THREE.DoubleSide }),
  );
  beam.position.y = 0.8;
  beam.renderOrder = 3;
  root.add(beam);
  return {
    object: root,
    update(time) {
      place(root, pickup);
      item.position.y = 0.45 + Math.sin(time * 3 + pickup.x) * 0.06;
      item.rotation.y = time * 1.5;
      const pulse = 1 + Math.sin(time * 4) * 0.12;
      ring.scale.set(pulse, pulse, 1);
    },
  };
}

function machineView(machine: Machine): EntityView {
  const rig = buildMachine();
  return {
    object: rig.root,
    update(time) {
      place(rig.root, machine);
      rig.update(time, machine.glitch ? 'active' : machine.fixed ? 'idle' : 'broken');
      rig.root.position.x += machine.glitch ? (Math.random() - 0.5) * 0.04 : 0;
    },
  };
}

function sleeperView(sleeper: Sleeper): EntityView {
  if (sleeper.look === 'boar') {
    const boar = buildSleepingBoar();
    boar.root.rotation.y = -Math.PI / 2 + 0.3;
    return {
      object: boar.root,
      update(time) {
        place(boar.root, sleeper);
        boar.root.position.z -= 0.3;
        boar.animate(time, 0);
      },
    };
  }
  const rig = buildSleepingRex();
  rig.root.scale.setScalar(0.64);
  rig.root.rotation.y = Math.PI / 2;
  return {
    object: rig.root,
    update(time) {
      place(rig.root, sleeper);
      rig.root.position.z -= 0.25;
      rig.animate(time, 0);
    },
  };
}

function companionView(pip: Companion, world: World): EntityView {
  const rig = buildPip();
  let lastX = pip.x;
  let lastY = pip.y;
  return {
    object: rig.root,
    update(time, dt) {
      const dx = pip.x - lastX;
      const dy = pip.y - lastY;
      lastX = pip.x;
      lastY = pip.y;
      place(rig.root, pip);
      const moving = Math.hypot(dx, dy) > 0.05;
      if (moving) turn(rig.root, yawFor(dx, dy), dt, 12);
      else if (pip.following) turn(rig.root, yawFor(world.hero.x - pip.x, world.hero.y - pip.y), dt, 4);
      rig.setLying(!pip.following && !pip.isScriptMoving);
      rig.animate(time, moving ? 1 : 0);
    },
  };
}

function thrownView(thrown: Thrown): EntityView {
  const object = buildItem(thrown.item);
  return {
    object,
    update(time) {
      object.position.set(thrown.x / PX, thrown.arc / PX, thrown.y / PX);
      object.rotation.set(time * 8, time * 5, 0);
    },
  };
}

function rockView(rock: FallingRock): EntityView {
  const root = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22), new THREE.MeshToonMaterial({ color: '#8a8378' }));
  stone.castShadow = true;
  root.add(stone);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.3, 16),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  root.add(shadow);
  return {
    object: root,
    update(time) {
      place(root, rock);
      const fall = (1 - rock.t) * (1 - rock.t);
      stone.position.y = 0.2 + fall * 9;
      stone.rotation.set(time * 6, time * 4, 0);
      shadow.position.y = 0.03;
      shadow.scale.setScalar(0.3 + rock.t * 0.8);
    },
  };
}

function arrowView(arrow: Arrow): EntityView {
  const root = new THREE.Group();
  // A crossbow bolt: short and heavy.
  const shaft = cylinder(0.018, 0.018, 0.42, '#7a5a3a', 0, 0, 0, {}, 4);
  shaft.rotation.z = Math.PI / 2;
  root.add(shaft);
  root.add(box(0.08, 0.06, 0.06, '#d0d6e0', 0.23, 0, 0), box(0.06, 0.08, 0.02, '#e8e0cc', -0.19, 0, 0));
  return {
    object: root,
    update() {
      place(root, arrow, arrow.altitude / PX);
      root.rotation.y = -Math.atan2(arrow.vy, arrow.vx);
    },
  };
}

function gateView(gate: Gate, world: World): EntityView {
  const rig = buildGate(gate.look);
  // Gates face south by default; one set in a north-south wall (solid above and below) turns to match it.
  const tx = Math.floor(gate.x / PX);
  const ty = Math.floor((gate.y - 1) / PX);
  if (world.map.isSolid(tx, ty - 1) && world.map.isSolid(tx, ty + 1)) rig.root.rotation.y = Math.PI / 2;
  return {
    object: rig.root,
    update(time) {
      rig.root.position.set(gate.x / PX, 0, gate.y / PX - 0.5);
      rig.update(time, gate.isOpen);
    },
  };
}

function decorView(decor: Decor, world: World): EntityView {
  const rig = buildDecor(decor.kind);
  // Decor on raised tiles (archers on their balconies) stands on top of them.
  const lift = world.map.defAt(decor.x, decor.y).height ?? 0;
  return {
    object: rig.root,
    update(time) {
      place(rig.root, decor, lift);
      rig.update(time);
    },
  };
}
