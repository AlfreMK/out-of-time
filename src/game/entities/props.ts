import type { SfxName } from '../../engine/audio.ts';
import type { CritterSpec, DecorKind, Facing, Line, ObstacleLook, Script, SignSpec, SleeperSpec } from '../../eras/types.ts';
import { ITEMS } from '../items.ts';
import type { NpcLook } from '../looks.ts';
import type { ItemId } from '../state.ts';
import type { World } from '../world.ts';
import { Entity } from './entity.ts';
import { TILE } from '../tilemap.ts';
import type { Food } from './watcher.ts';
import { progress } from '../flags.ts';

export class Npc extends Entity {
  readonly look: NpcLook;
  readonly facing: Facing;
  private readonly talk: Script;

  constructor(x: number, y: number, look: NpcLook, name: string, facing: Facing, talk: Script) {
    super();
    this.x = x;
    this.y = y;
    this.look = look;
    this.facing = facing;
    this.talk = talk;
    this.solid = { hw: 5, hh: 4 };
    this.interactLabel = name;
    this.height = look === 'kid' ? 15 : 19;
  }

  override interact(world: World): Promise<void> | void {
    return this.talk(world);
  }
}

export class Pickup extends Entity {
  readonly item: ItemId;
  private readonly lines: Line[];
  private readonly after?: Script;

  constructor(x: number, y: number, item: ItemId, lines: Line[], after?: Script) {
    super();
    this.x = x;
    this.y = y;
    this.item = item;
    this.lines = lines;
    this.after = after;
    this.interactLabel = `Take ${ITEMS[item].name}`;
    this.height = 12;
  }

  override async interact(world: World): Promise<void> {
    this.removed = true;
    world.give(this.item);
    world.game.audio.sfx('pickup');
    world.burst(this.x, this.y, '#fff3a0', 14);
    world.toast(`Got: ${ITEMS[this.item].name}`);
    if (this.lines.length) await world.say(...this.lines);
    world.save();
    await this.after?.(world);
  }
}

export class Machine extends Entity {
  private readonly onUse: Script;
  private readonly world: World;
  /** Glowing and humming during repairs and jumps. */
  glitch = false;

  constructor(x: number, y: number, world: World, onUse: Script) {
    super();
    this.x = x;
    this.y = y;
    this.world = world;
    this.onUse = onUse;
    this.solid = { hw: 13, hh: 12, offsetY: -6 };
    this.interactLabel = 'Time Machine';
    this.height = 30;
  }

  override interact(world: World): Promise<void> | void {
    return this.onUse(world);
  }

  override update(dt: number, world: World): void {
    super.update(dt, world);
    if (!this.fixed && Math.random() < dt * 3) world.smoke(this.x + (Math.random() * 12 - 6), this.y - 6, 24);
  }

  get fixed(): boolean {
    return this.world.flag(progress.fixed(this.world.era));
  }
}

/** Invisible interaction spot (signs, doors, strange panels). */
export class Inspect extends Entity {
  private readonly onUse: Script;

  constructor(x: number, y: number, label: string, onUse: Script) {
    super();
    this.x = x;
    this.y = y;
    this.interactLabel = label;
    this.onUse = onUse;
    this.height = 14;
  }

  override interact(world: World): Promise<void> | void {
    return this.onUse(world);
  }
}

export class Obstacle extends Entity {
  readonly look: ObstacleLook;
  private readonly onUse: Script;

  constructor(x: number, y: number, look: ObstacleLook, label: string, onUse: Script) {
    super();
    this.x = x;
    this.y = y;
    this.look = look;
    this.onUse = onUse;
    this.interactLabel = label;
    this.solid = { hw: 8, hh: 8, offsetY: -8 };
    this.height = 18;
  }

  override interact(world: World): Promise<void> | void {
    return this.onUse(world);
  }
}

/** A sleeping T-Rex. Any noise that reaches it wakes it up. */
export class Sleeper extends Entity {
  readonly look: 'rex' | 'boar';
  readonly caughtLines: Line[];
  readonly sound: SfxName;

  constructor(x: number, y: number, spec: SleeperSpec) {
    super();
    this.x = x;
    this.y = y;
    this.look = spec.look ?? 'rex';
    this.caughtLines = spec.caught;
    this.sound = spec.sound ?? 'roar';
    this.solid = this.look === 'boar' ? { hw: 7, hh: 5, offsetY: -4 } : { hw: 15, hh: 6, offsetY: -4 };
    this.height = this.look === 'boar' ? 10 : 20;
  }

  override update(dt: number, world: World): void {
    super.update(dt, world);
    this.animTime += dt;
    if (Math.floor(this.animTime / 2.4) !== Math.floor((this.animTime - dt) / 2.4)) this.emote('zzz', 1.4);
  }

  hear(x: number, y: number, radius: number): boolean {
    return Math.hypot(x - this.x, y - (this.y - 6)) <= radius;
  }
}

/** A friendly creature that follows the player along their trail. */
export class Companion extends Entity {
  following: boolean;
  moving = false;
  private readonly talk: Script;

  constructor(x: number, y: number, name: string, following: boolean, talk: Script) {
    super();
    this.x = x;
    this.y = y;
    this.following = following;
    this.talk = talk;
    this.interactLabel = name;
    this.height = 12;
  }

  override interact(world: World): Promise<void> | void {
    if (!this.following) return this.talk(world);
    this.emote('heart', 1.2);
    world.game.audio.sfx('chirp');
  }

  override update(dt: number, world: World): void {
    this.updateEmote(dt);
    this.moving = this.updateScriptedMove(dt);
    if (this.moving || !this.following) return;

    const hero = world.hero;
    const distToHero = Math.hypot(hero.x - this.x, hero.y - this.y);
    if (distToHero > 220) {
      this.regroup(world);
      return;
    }
    const trail = world.trail;
    while (trail.length > 1 && Math.hypot(trail[0].x - this.x, trail[0].y - this.y) < 4) trail.shift();
    if (distToHero < 20 || trail.length === 0) return;
    const target = trail[0];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = distToHero > 60 ? 110 : 66;
    const step = Math.min(dist, speed * dt);
    if (dist > 0.01) {
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      if (Math.abs(dx) > 0.3) this.facingLeft = dx < 0;
      this.moving = true;
      this.animTime += dt;
    }
  }

  regroup(world: World): void {
    const hero = world.hero;
    const dir = hero.dir;
    this.x = hero.x - dir.x * 14;
    this.y = hero.y - dir.y * 14;
    world.trail.length = 0;
  }
}

/** Food on the ground that a dog will happily abandon its post for. */
export class Bait extends Entity implements Food {
  readonly item: ItemId;
  private life = 20;

  constructor(x: number, y: number, item: ItemId) {
    super();
    this.x = x;
    this.y = y;
    this.item = item;
    this.height = 8;
  }

  consume(): void {
    this.removed = true;
  }

  override update(dt: number, world: World): void {
    super.update(dt, world);
    this.life -= dt;
    if (this.life <= 0) this.removed = true;
  }
}

/** An object flying in an arc from the player to a landing point. */
export class Thrown extends Entity {
  readonly item: ItemId;
  /** 0..1 progress along the arc. */
  t = 0;
  private readonly fromX: number;
  private readonly fromY: number;
  private readonly toX: number;
  private readonly toY: number;
  private readonly duration: number;
  private readonly onLand: (x: number, y: number) => void;

  constructor(item: ItemId, fromX: number, fromY: number, toX: number, toY: number, onLand: (x: number, y: number) => void) {
    super();
    this.item = item;
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
    this.x = fromX;
    this.y = fromY;
    this.duration = 0.25 + Math.hypot(toX - fromX, toY - fromY) / 160;
    this.onLand = onLand;
  }

  /** Height above the ground in map pixels. */
  get arc(): number {
    return 10 + Math.sin(this.t * Math.PI) * 18 * (1 - this.t * 0.4);
  }

  override update(dt: number): void {
    this.t += dt / this.duration;
    if (this.t >= 1) {
      this.removed = true;
      this.onLand(this.toX, this.toY);
      return;
    }
    this.x = this.fromX + (this.toX - this.fromX) * this.t;
    this.y = this.fromY + (this.toY - this.fromY) * this.t;
  }
}

/** Falling rock with a growing shadow telegraphing where it lands. */
export class FallingRock extends Entity {
  /** 0..1 progress of the fall. */
  t = 0;
  private readonly duration = 0.9;
  private readonly onLand: (x: number, y: number) => void;

  constructor(x: number, y: number, onLand: (x: number, y: number) => void) {
    super();
    this.x = x;
    this.y = y;
    this.onLand = onLand;
  }

  override update(dt: number): void {
    this.t += dt / this.duration;
    if (this.t >= 1) {
      this.removed = true;
      this.onLand(this.x, this.y);
    }
  }
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** A crossbow bolt flying in a straight line until it leaves its bounds. */
export class Arrow extends Entity {
  readonly vx: number;
  readonly vy: number;
  /** Height above the ground in pixels; bolts shot from balconies drop as they fly. */
  altitude: number;
  private readonly startHeight: number;
  private traveled = 0;
  private readonly bounds: Bounds;
  private readonly onHit: () => void;
  private readonly hero: { x: number; y: number };

  constructor(x: number, y: number, vx: number, vy: number, bounds: Bounds, hero: { x: number; y: number }, onHit: () => void, startHeight = 11) {
    super();
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.startHeight = startHeight;
    this.altitude = startHeight;
    this.bounds = bounds;
    this.hero = hero;
    this.onHit = onHit;
  }

  override update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.traveled += Math.hypot(this.vx, this.vy) * dt;
    this.altitude = this.startHeight + (11 - this.startHeight) * Math.min(1, this.traveled / 30);
    const b = this.bounds;
    if (this.x < b.minX || this.x > b.maxX || this.y < b.minY || this.y > b.maxY) {
      this.removed = true;
      return;
    }
    if (Math.abs(this.x - this.hero.x) < 6 && Math.abs(this.y - this.hero.y) < 7) {
      this.removed = true;
      this.onHit();
    }
  }
}

/** A door, laser barrier or palisade gate that blocks its tile while closed. */
export class Gate extends Entity {
  readonly look: 'laser' | 'door' | 'palisade';
  isOpen: boolean;

  constructor(x: number, y: number, look: 'laser' | 'door' | 'palisade', open: boolean) {
    super();
    this.x = x;
    this.y = y;
    this.look = look;
    this.isOpen = open;
    this.solid = open ? null : { hw: 8, hh: 8, offsetY: -8 };
    this.height = 18;
  }

  setOpen(open: boolean): void {
    this.isOpen = open;
    this.solid = open ? null : { hw: 8, hh: 8, offsetY: -8 };
  }
}

/** A hidden ally who makes a diversion when the player blows the pifilka nearby. */
export class Ally extends Entity {
  readonly look: NpcLook;
  /** Seconds before this ally can make another diversion. */
  cooldown = 0;
  private readonly talk: Script;

  constructor(x: number, y: number, look: NpcLook, name: string, talk: Script) {
    super();
    this.x = x;
    this.y = y;
    this.look = look;
    this.talk = talk;
    this.interactLabel = name;
    this.height = 19;
  }

  override interact(world: World): Promise<void> | void {
    return this.talk(world);
  }

  override update(dt: number, world: World): void {
    super.update(dt, world);
    this.cooldown = Math.max(0, this.cooldown - dt);
  }
}

/** An advertising sign on a building (see `SignSpec`); the building's tile does the blocking. */
export class Sign extends Entity {
  readonly spec: SignSpec;

  constructor(x: number, y: number, spec: SignSpec) {
    super();
    this.x = x;
    this.y = y;
    this.spec = spec;
  }
}

/** Static set dressing (statues, flags, skeletons); collision comes from the tile below. */
export class Decor extends Entity {
  readonly kind: DecorKind;

  constructor(x: number, y: number, kind: DecorKind) {
    super();
    this.x = x;
    this.y = y;
    this.kind = kind;
    // Passers-by are people, and a grazing Ankylosaurus is a tank: you walk round them, not through them.
    if (kind === 'pedestrian') this.solid = { hw: 4, hh: 3 };
    if (kind === 'ankylosaurus') this.solid = { hw: 20, hh: 7 };
  }
}

/** How far (px) the racket of a flock taking off carries. Like a war horn, it pulls even posted watchers away. */
export const FLOCK_NOISE = 120;
/** Walking (not sneaking) this close (px) startles the birds; sneaking only does at point blank. */
const FLOCK_STARTLE = 26;
const FLOCK_STARTLE_SNEAKING = 9;
/** Seconds the birds stay away after taking off, and how long their flight back takes at the end. */
export const FLOCK_AWAY = 14;
export const FLOCK_RETURN = 1.6;
/** The birds won't land while an animal on the lookout (the Anzu checking on their racket) or Andrew is this close (px). */
export const FLOCK_CLEAR = 56;

/** Small birds pecking on the ground: walk up to them and they take off with a racket (see `FlockSpec`). */
export class Flock extends Entity {
  /** Seconds left until they have landed again; 0 while they are on the ground. */
  away = 0;
  /** Where Andrew stood when they took off: they fly off the other way. */
  fledFrom = { x: 0, y: 0 };
  private readonly talk: Script;

  constructor(x: number, y: number, talk: Script) {
    super();
    this.x = x;
    this.y = y;
    this.talk = talk;
    this.interactLabel = 'Birds';
    this.height = 6;
  }

  override interact(world: World): Promise<void> | void {
    return this.talk(world);
  }

  override reset(): void {
    this.away = 0;
    this.interactLabel = 'Birds';
  }

  override update(dt: number, world: World): void {
    super.update(dt, world);
    if (this.away > 0) {
      // They stay out of sight until the spot is clear, instead of landing at the feet of whoever came to look.
      if (this.away - dt < FLOCK_RETURN && this.away >= FLOCK_RETURN && this.crowded(world)) {
        this.away = FLOCK_RETURN;
        return;
      }
      this.away = Math.max(0, this.away - dt);
      if (this.away === 0) this.interactLabel = 'Birds';
      return;
    }
    if (world.controlsLocked) return;
    const hero = world.hero;
    const reach = hero.sneaking ? FLOCK_STARTLE_SNEAKING : FLOCK_STARTLE;
    if (!hero.moving || Math.hypot(hero.x - this.x, hero.y - this.y) > reach) return;
    this.away = FLOCK_AWAY;
    this.fledFrom = { x: hero.x, y: hero.y };
    this.interactLabel = null;
    world.game.audio.sfx('flutter');
    world.burst(this.x, this.y, '#8a6a4a', 10, 6);
    world.noise(this.x, this.y, FLOCK_NOISE, 'horn');
  }

  private crowded(world: World): boolean {
    const near = (x: number, y: number): boolean => Math.hypot(x - this.x, y - this.y) < FLOCK_CLEAR;
    return near(world.hero.x, world.hero.y) || world.watcherList.some((w) => w.watching && near(w.x, w.y));
  }
}

/** How close (px) Andrew can walk, or sneak, before a critter bolts. */
const CRITTER_SHY = 52;
const CRITTER_SHY_SNEAKING = 13;
/** Grazing amble and flight speeds (px/s). */
const CRITTER_AMBLE = 14;
const CRITTER_FLEE = 88;
/** How far (tiles) a critter wanders from its spot, and flees at most. */
const CRITTER_RANGE = 2;
const CRITTER_FLEE_RANGE = 5;

/** A harmless animal that grazes around its spot and bolts away from Andrew (see `CritterSpec`). */
export class Critter extends Entity {
  readonly kind: CritterSpec['kind'];
  /** Heading in radians (map space), for the view. */
  angle = Math.PI / 2;
  walking = false;
  fleeing = false;
  private readonly homeX: number;
  private readonly homeY: number;
  private target: { x: number; y: number } | null = null;
  private timer = 0;
  /** Seconds until it calls out again when startled: one snort per scare, not one per step. */
  private callCooldown = 0;
  private readonly talk: Script;

  constructor(x: number, y: number, kind: CritterSpec['kind'], talk: Script) {
    super();
    this.x = this.homeX = x;
    this.y = this.homeY = y;
    this.kind = kind;
    this.talk = talk;
    this.solid = { hw: 5, hh: 4 };
    this.interactLabel = 'Thescelosaurus';
    this.height = 16;
    this.timer = 1 + Math.random() * 3;
  }

  override interact(world: World): Promise<void> | void {
    return this.talk(world);
  }

  override reset(): void {
    this.x = this.homeX;
    this.y = this.homeY;
    this.target = null;
    this.fleeing = false;
  }

  override update(dt: number, world: World): void {
    this.updateEmote(dt);
    this.walking = false;
    if (world.controlsLocked) return;
    this.callCooldown = Math.max(0, this.callCooldown - dt);
    const hero = world.hero;
    const dx = this.x - hero.x;
    const dy = this.y - hero.y;
    const dist = Math.hypot(dx, dy);
    const shy = hero.sneaking ? CRITTER_SHY_SNEAKING : CRITTER_SHY;
    if (!this.fleeing && hero.moving && dist < shy) {
      // Bolt straight away from Andrew, but not too far from home.
      const away = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.6;
      const run = 40 + Math.random() * 24;
      const limit = CRITTER_FLEE_RANGE * TILE;
      const tx = Math.max(this.homeX - limit, Math.min(this.homeX + limit, this.x + Math.cos(away) * run));
      const ty = Math.max(this.homeY - limit, Math.min(this.homeY + limit, this.y + Math.sin(away) * run));
      this.target = { x: tx, y: ty };
      this.fleeing = true;
      this.emote('alert', 0.8);
      if (this.callCooldown === 0) world.game.audio.sfx('honk');
      this.callCooldown = 4;
    }
    if (this.target) {
      if (this.walkToward(this.target, this.fleeing ? CRITTER_FLEE : CRITTER_AMBLE, dt, world)) {
        this.target = null;
        this.fleeing = false;
        this.timer = 2 + Math.random() * 4;
      }
      return;
    }
    // Grazing: now and then, amble to another spot near home.
    this.timer -= dt;
    if (this.timer > 0) return;
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * CRITTER_RANGE * TILE;
    this.target = { x: this.homeX + Math.cos(a) * d, y: this.homeY + Math.sin(a) * d };
  }

  /** Moves toward a point; true once there, or when the way is blocked (walls, Andrew). */
  private walkToward(target: { x: number; y: number }, speed: number, dt: number, world: World): boolean {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    const hero = world.hero;
    // Never step onto Andrew: a solid animal on top of him would trap him.
    const onHero = Math.abs(nx - hero.x) < 11 && Math.abs(ny - hero.y) < 9;
    if (onHero || world.isBlocked(nx, ny, 5, 4, this)) return true;
    this.x = nx;
    this.y = ny;
    this.angle = Math.atan2(dy, dx);
    this.walking = true;
    this.animTime += dt;
    return false;
  }
}
