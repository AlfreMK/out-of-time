import type { SfxName } from '../../engine/audio.ts';
import type { DecorKind, Facing, Line, ObstacleLook, Script, SleeperSpec } from '../../eras/types.ts';
import { ITEMS } from '../items.ts';
import type { NpcLook } from '../looks.ts';
import type { ItemId } from '../state.ts';
import type { World } from '../world.ts';
import { Entity } from './entity.ts';
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

/** Static set dressing (statues, flags, skeletons); collision comes from the tile below. */
export class Decor extends Entity {
  readonly kind: DecorKind;

  constructor(x: number, y: number, kind: DecorKind) {
    super();
    this.x = x;
    this.y = y;
    this.kind = kind;
  }
}
