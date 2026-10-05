import type { Barks, Facing, WatcherKind, WatcherSpec } from '../../eras/types.ts';
import { angleDiff } from '../../engine/random.ts';
import { findPath, smoothPath } from '../pathfinding.ts';
import { TILE, tileCenter, type TilePoint } from '../tilemap.ts';
import type { World } from '../world.ts';
import { Entity } from './entity.ts';

type State = 'pause' | 'patrol' | 'investigate' | 'look' | 'return' | 'eat';

export const FACING_ANGLE: Record<Facing, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

export interface KindTuning {
  speed: number;
  range: number;
  fov: number;
  wait: number;
  sweep: number;
  /** How fast suspicion fills while the player is in view. */
  alertness: number;
  /** Multiplier on how far away noises are heard (0 = deaf). */
  hearing: number;
  height: number;
}

/** Per-kind defaults (also read by the map validator). */
export const TUNING: Record<WatcherKind, KindTuning> = {
  // Dakotaraptor: fast, sharp-eyed pack hunter with good hearing.
  raptor: { speed: 52, range: 100, fov: 1.35, wait: 1.0, sweep: 0.8, alertness: 1.5, hearing: 1.4, height: 22 },
  // Anzu brooding its nest: watchful, but it barely turns its head and only leaves the eggs for a real commotion.
  anzu: { speed: 46, range: 84, fov: 1.3, wait: 0, sweep: 0.35, alertness: 1.4, hearing: 1.2, height: 26 },
  guard: { speed: 32, range: 76, fov: 1.2, wait: 2.0, sweep: 0.6, alertness: 1, hearing: 1, height: 19 },
  soldier: { speed: 34, range: 84, fov: 1.2, wait: 2.0, sweep: 0.6, alertness: 1.1, hearing: 1, height: 19 },
  rider: { speed: 66, range: 92, fov: 1.1, wait: 1.2, sweep: 0.5, alertness: 1.2, hearing: 0.9, height: 30 },
  dog: { speed: 55, range: 60, fov: 1.5, wait: 0, sweep: 1.1, alertness: 1.2, hearing: 1.2, height: 10 },
  camera: { speed: 0, range: 104, fov: 0.8, wait: 0, sweep: 0.9, alertness: 1.3, hearing: 0, height: 30 },
  drone: { speed: 50, range: 86, fov: 1.0, wait: 1.2, sweep: 1.0, alertness: 1.2, hearing: 1, height: 26 },
  bot: { speed: 30, range: 82, fov: 1.0, wait: 2.0, sweep: 0.5, alertness: 1.1, hearing: 1, height: 20 },
};

/**
 * Default speech bubbles. Like the Spanish soldiers in Araucanía, Cologne's guards shout in German:
 * the earpiece only translates real conversations.
 */
const BARKS: Partial<Record<WatcherKind, Partial<Barks>>> = {
  guard: {
    suspicious: ['Hm? Wer da?', 'Was war das?', 'Hat sich da was bewegt?'],
    investigate: ['Ich seh mal nach.', 'Zeig dich!', 'Wer macht da Lärm?'],
    giveUp: ['Ach, nur der Wind.', 'Bah. Wieder die Katze.', 'Nichts. Zurück auf meinen Posten.'],
  },
  soldier: {
    suspicious: ['¿Quién anda ahí?', '¿Qué fue eso?', '¿Hay alguien?'],
    investigate: ['¡Voy a ver!', '¡Alto, en nombre del Rey!', '¡Sal de ahí!'],
    giveUp: ['Habrá sido un zorro.', 'Nada. Malditos bosques.', 'Será el viento.'],
    holdPost: ['¿Una piedra? No dejo la puerta.', 'Mi puesto es la puerta. Que vaya otro.', 'Serán los muchachos tirando piedras.'],
  },
  rider: {
    suspicious: ['¿Qué se mueve allí?'],
    investigate: ['¡Vamos, caballo!'],
    giveUp: ['Nada. Sigamos.'],
  },
  camera: {
    suspicious: ['MOTION DETECTED'],
    investigate: [],
    giveUp: ['SCAN COMPLETE'],
  },
  drone: {
    suspicious: ['ANOMALY?'],
    investigate: ['INVESTIGATING NOISE SOURCE'],
    giveUp: ['FALSE ALARM. RESUMING PATROL'],
  },
  bot: {
    suspicious: ['HALT. IDENTIFY YOURSELF.'],
    investigate: ['SCANNING SECTOR.'],
    giveUp: ['NO THREAT FOUND.'],
  },
};

/** Seconds spent looking around where a noise came from. */
const SEARCH_TIME = 2.6;
/**
 * A war horn (or any big commotion) means trouble: they search much longer, and keep their eyes on the woods it came from
 * (narrow sweep, facing away from their post), which gives the player time to slip in behind them.
 */
const HORN_SEARCH_TIME = 8;
const HORN_SWEEP = 0.6;

/** Chatting with their eyes off the job: a shorter, narrower cone (see `ChatSpec.distracted`). */
const CHAT_RANGE = 0.6;
const CHAT_FOV = 0.5;

/** Going to look at a noise or back to their post, they steer clear of the player's spot (tiles) when there's another way. */
const AVOID_RADIUS = 4;
const AVOID_COST = 3;

/** Distance under which being "hidden" stops working — they'd bump into you. */
const POINT_BLANK = 18;
const TOUCH = 11;

/**
 * Footsteps, a small noise (a pebble, glass, a puddle, an alarm), a war horn (the scouts' trutruka, or a flock of
 * birds bursting out of cover: anything loud enough to pull a posted watcher away), or food landing.
 */
export type NoiseKind = 'step' | 'noise' | 'horn' | 'food';

/** Anything that hears food lands near it and eats it (bread for the dog). */
export interface Food {
  x: number;
  y: number;
  removed: boolean;
  consume(): void;
}

/** A patrolling (or posted) watcher with a vision cone: dinosaurs, guards, soldiers, robots. */
export class Watcher extends Entity {
  readonly kind: WatcherKind;
  readonly spec: WatcherSpec;
  suspicion = 0;
  angle: number;
  state: State = 'pause';
  walking = false;
  /** Seconds left of being switched off (hacked cameras and robots). */
  disabledTime = 0;
  /** A dormant watcher sleeping at its post (see `WatcherSpec.dormant`). */
  asleep = false;
  /** Current speech bubble. */
  bark: { text: string; time: number } | null = null;
  /** Who this watcher is chatting with right now (set by a `Chat`). */
  chatPartner: Watcher | null = null;
  /** Whether the current chat takes its eyes off the job. */
  chatDistracted = false;
  /** 0..1: how far the cone has narrowed for a distracted chat (eases in and out so it reads on screen). */
  private chatBlend = 0;
  /** Full vision range; `viewRange` is what it actually sees right now. */
  readonly range: number;
  readonly fov: number;
  private readonly tuning: KindTuning;
  private readonly route: TilePoint[];
  private readonly postAngle: number;
  private readonly speed: number;
  private readonly wait: number;
  private readonly sweep: number;
  private routeIndex = 0;
  private path: TilePoint[] = [];
  private timer = 0;
  private lookCenter: number;
  private food: Food | null = null;
  private barkCooldown = 0;
  private patrol: Array<{ x: number; y: number }> | null = null;
  private searchTime = SEARCH_TIME;
  private searchSweep = 1.2;
  /** Where to keep looking once at the noise (a horn: away from the post), or null to look around freely. */
  private searchAngle: number | null = null;

  constructor(spec: WatcherSpec, route: TilePoint[]) {
    super();
    this.kind = spec.kind;
    this.spec = spec;
    this.route = route;
    this.tuning = TUNING[spec.kind];
    this.speed = spec.speed ?? this.tuning.speed;
    this.range = spec.range ?? this.tuning.range;
    this.fov = spec.fov ?? this.tuning.fov;
    this.wait = spec.wait ?? this.tuning.wait;
    this.sweep = spec.sweep ?? this.tuning.sweep;
    this.postAngle = FACING_ANGLE[spec.facing ?? 'down'];
    this.angle = this.postAngle;
    this.lookCenter = this.postAngle;
    this.height = this.tuning.height;
    this.reset();
  }

  override reset(): void {
    const start = tileCenter(this.route[0]);
    this.x = start.x;
    this.y = start.y + 4;
    this.routeIndex = 0;
    this.path = [];
    this.state = 'pause';
    this.timer = 0;
    this.suspicion = 0;
    this.food = null;
    this.bark = null;
    this.chatPartner = null;
    this.chatBlend = 0;
    this.angle = this.route.length > 1 ? this.angleToward(this.route[1]) : this.postAngle;
    this.lookCenter = this.angle;
    this.asleep = this.spec.dormant === true;
    this.setSearch(false, 0, 0);
  }

  private setSearch(horn: boolean, x: number, y: number): void {
    this.searchTime = horn ? HORN_SEARCH_TIME : SEARCH_TIME;
    this.searchSweep = horn ? HORN_SWEEP : 1.2;
    const post = tileCenter(this.route[this.routeIndex]);
    this.searchAngle = horn ? Math.atan2(y - post.y, x - post.x) : null;
  }

  /** Every point (eye level) its patrol loop walks through, from a respawn on. */
  patrolPoints(world: World): ReadonlyArray<{ x: number; y: number }> {
    if (!this.patrol) {
      const tiles: TilePoint[] = [this.route[0]];
      const map = world.map;
      const passable = (tx: number, ty: number): boolean => !map.isSolid(tx, ty) && !map.def(tx, ty).ledge;
      for (let i = 0; i < this.route.length && this.route.length > 1; i++) {
        const leg = findPath(this.route[i], this.route[(i + 1) % this.route.length], map.width, map.height, passable);
        if (leg) tiles.push(...leg);
      }
      this.patrol = tiles.map((tile) => tileCenter(tile));
    }
    return this.patrol;
  }

  /** Vision range right now: shorter while chatting distracted. */
  get viewRange(): number {
    return this.range * (1 - (1 - CHAT_RANGE) * this.chatBlend);
  }

  /** Field of view right now: narrower while chatting distracted. */
  get viewFov(): number {
    return this.fov * (1 - (1 - CHAT_FOV) * this.chatBlend);
  }

  /** Standing still at a route stop (or its post), not looking into anything: a brooding Anzu settles on its nest. */
  get idle(): boolean {
    return this.state === 'pause' && this.path.length === 0;
  }

  get isStationary(): boolean {
    return this.route.length === 1 || this.kind === 'camera';
  }

  get disabled(): boolean {
    return this.disabledTime > 0;
  }

  /** Vision is off while eating, switched off or asleep. */
  get watching(): boolean {
    return this.state !== 'eat' && !this.disabled && !this.asleep;
  }

  /** Eating and standing still (the food is reached). */
  get isEating(): boolean {
    return this.state === 'eat' && this.path.length === 0;
  }

  override update(dt: number, world: World): void {
    this.updateEmote(dt);
    this.walking = false;
    if (this.bark) {
      this.bark.time -= dt;
      if (this.bark.time <= 0) this.bark = null;
    }
    if (world.controlsLocked) return;
    const blendTarget = this.chatPartner && this.chatDistracted ? 1 : 0;
    this.chatBlend += Math.max(-dt * 3, Math.min(dt * 1.5, blendTarget - this.chatBlend));
    this.barkCooldown = Math.max(0, this.barkCooldown - dt);
    if (this.asleep) {
      this.suspicion = 0;
      if (Math.floor(this.animTime / 2.4) !== Math.floor((this.animTime + dt) / 2.4)) this.emote('zzz', 1.4);
      this.animTime += dt;
      return;
    }
    if (this.disabledTime > 0) {
      this.disabledTime -= dt;
      this.suspicion = 0;
      if (this.disabledTime <= 0) this.say('giveUp');
      return;
    }

    const player = world.hero;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    const god = world.game.godMode;
    if (!god && this.watching && this.kind !== 'camera' && dist < TOUCH && !player.isHopping) {
      world.caught(this, this.spec.caught);
      return;
    }

    const sawBefore = this.suspicion > 0;
    if (!god && this.watching && this.canSee(world)) {
      const closeness = 1 - dist / this.viewRange;
      this.suspicion += dt * (1.2 + closeness * 3) * this.tuning.alertness;
      this.turnToward(Math.atan2(player.y - this.y, player.x - this.x), dt * 2);
      if (!sawBefore) {
        world.game.audio.sfx(this.isMachine ? 'beep' : 'suspect');
        this.emote('question', 0.8);
        this.say('suspicious');
      }
      if (this.suspicion >= 1) world.caught(this, this.spec.caught);
      // Freeze in place while staring.
      return;
    }
    this.suspicion = Math.max(0, this.suspicion - dt * 0.35);
    this.think(dt, world);
  }

  private get isMachine(): boolean {
    return this.kind === 'camera' || this.kind === 'drone' || this.kind === 'bot';
  }

  /** Shows a line of a conversation in the speech bubble. */
  speak(text: string, seconds: number): void {
    this.bark = { text, time: seconds };
    this.barkCooldown = 1.2;
  }

  private say(kind: keyof Barks): void {
    const lines = this.spec.barks?.[kind] ?? BARKS[this.kind]?.[kind];
    if (!lines || lines.length === 0 || this.barkCooldown > 0) return;
    this.bark = { text: lines[Math.floor(Math.random() * lines.length)], time: 2.2 };
    this.barkCooldown = 1.2;
  }

  private think(dt: number, world: World): void {
    switch (this.state) {
      case 'pause': {
        this.timer += dt;
        const partner = this.chatPartner;
        if (partner && this.chatDistracted) {
          this.turnToward(Math.atan2(partner.y - this.y, partner.x - this.x), dt);
          break;
        }
        const center = this.isStationary ? this.postAngle : this.lookCenter;
        this.turnToward(center + Math.sin(this.timer * 1.3) * this.sweep, dt);
        // A patrol stays put until the conversation is over.
        if (!partner && !this.isStationary && this.timer >= this.wait) {
          this.routeIndex = (this.routeIndex + 1) % this.route.length;
          this.goTo(this.route[this.routeIndex], world);
          this.state = 'patrol';
        }
        break;
      }
      case 'patrol':
      case 'investigate':
      case 'return':
        if (this.followPath(dt)) {
          this.timer = 0;
          this.lookCenter = this.angle;
          if (this.state === 'investigate') {
            this.state = 'look';
            if (this.searchAngle !== null) this.lookCenter = this.searchAngle;
          }
          else {
            // A dormant watcher back at its post powers down again.
            if (this.state === 'return' && this.spec.dormant) this.asleep = true;
            this.state = 'pause';
          }
        }
        break;
      case 'look':
        this.timer += dt;
        this.turnToward(this.lookCenter + Math.sin(this.timer * 2) * this.searchSweep, dt);
        if (this.timer > this.searchTime) {
          this.say('giveUp');
          this.goTo(this.route[this.routeIndex], world, true);
          this.state = 'return';
        }
        break;
      case 'eat':
        if (!this.food || this.food.removed) {
          this.food = null;
          this.goTo(this.route[this.routeIndex], world);
          this.state = 'return';
          break;
        }
        if (this.followPath(dt)) {
          this.timer -= dt;
          this.animTime += dt * 0.5;
          if (this.timer <= 0) {
            this.food.consume();
            this.food = null;
            this.goTo(this.route[this.routeIndex], world);
            this.state = 'return';
          }
        }
        break;
    }
  }

  /**
   * Reacts to sounds. Dogs only care about food; cameras are deaf; posted sentries only leave for an alarm;
   * everyone else investigates.
   */
  hear(x: number, y: number, radius: number, kind: NoiseKind, world: World, food?: Food): void {
    if (this.state === 'eat' || this.disabled || this.tuning.hearing === 0) return;
    if (Math.hypot(this.x - x, this.y - y) > radius * this.tuning.hearing) return;
    if (this.asleep) {
      // Footsteps don't wake it; crunching glass or an alarm does.
      if (kind === 'step' || kind === 'food') return;
      this.asleep = false;
      this.emote('alert', 1);
    }
    if (kind === 'food') {
      if (this.kind !== 'dog' || !food) return;
      this.food = food;
      this.timer = 7;
      this.goTo(this.tileAt(food.x, food.y), world);
      this.state = 'eat';
      this.emote('heart', 1.5);
      world.game.audio.sfx('chirp');
      return;
    }
    const target = this.tileAt(x, y);
    if (this.spec.posted && kind === 'noise') {
      // Not worth leaving the post for, and not even worth looking away from it.
      this.emote('question', 0.8);
      this.say('holdPost');
      world.heldPost(this);
      return;
    }
    this.setSearch(kind === 'horn', x, y);
    if (this.kind === 'dog' || (this.spec.posted && kind === 'step')) {
      this.lookCenter = Math.atan2(y - this.y, x - this.x);
      this.timer = 0;
      this.state = 'look';
      return;
    }
    if (this.state !== 'investigate') {
      this.emote('question', 1);
      world.game.audio.sfx(this.isMachine ? 'beep' : 'suspect');
      this.say('investigate');
    }
    this.goTo(target, world, true);
    this.state = this.path.length > 0 ? 'investigate' : 'look';
    this.timer = 0;
    this.lookCenter = Math.atan2(y - this.y, x - this.x);
  }

  canSee(world: World): boolean {
    const player = world.hero;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.viewRange) return false;
    if (player.hidden && dist > POINT_BLANK) return false;
    if (Math.abs(angleDiff(this.angle, Math.atan2(dy, dx))) > this.viewFov / 2) return false;
    return world.map.lineOfSight(this.x, this.y - 4, player.x, player.y - 4);
  }

  /**
   * Plans a walk to a tile: the shortest way, straightened into direct lines. With `avoidPlayer`
   * (looking into a noise, heading back), detours that keep away from the player win over a walk
   * that brushes past them, so a thrown pebble doesn't bring the guard right to the thrower.
   */
  private goTo(target: TilePoint, world: World, avoidPlayer = false): void {
    const map = world.map;
    const here = this.tileAt(this.x, this.y);
    const passable = (tx: number, ty: number): boolean => !map.isSolid(tx, ty) && !map.def(tx, ty).ledge;
    const hero = this.tileAt(world.hero.x, world.hero.y);
    const cost = avoidPlayer
      ? (tx: number, ty: number): number => Math.max(0, AVOID_RADIUS - Math.hypot(tx - hero.tx, ty - hero.ty)) * AVOID_COST
      : undefined;
    const path = findPath(here, target, map.width, map.height, passable, { cost }) ?? [];
    // Don't walk into a wall when the goal itself is solid (e.g. a pebble on a crate).
    const last = path[path.length - 1];
    if (last && !passable(last.tx, last.ty)) path.pop();
    // Only straighten what doesn't cut back toward the player: each shortcut has to stay as clear of them.
    const clear = (a: TilePoint, b: TilePoint): boolean =>
      map.straightWalk(a, b, passable) && (!cost || this.segmentCost(a, b, cost) <= Math.max(cost(a.tx, a.ty), cost(b.tx, b.ty)));
    this.path = smoothPath(here, path, clear);
  }

  /** The highest extra cost of any tile a straight walk from `a` to `b` crosses. */
  private segmentCost(a: TilePoint, b: TilePoint, cost: (tx: number, ty: number) => number): number {
    const steps = Math.max(Math.abs(b.tx - a.tx), Math.abs(b.ty - a.ty)) * 2;
    let worst = 0;
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      worst = Math.max(worst, cost(Math.round(a.tx + (b.tx - a.tx) * t), Math.round(a.ty + (b.ty - a.ty) * t)));
    }
    return worst;
  }

  /** Moves along the current path. Returns true when there is nothing left to walk. */
  private followPath(dt: number): boolean {
    const next = this.path[0];
    if (!next) return true;
    const target = tileCenter(next);
    target.y += 4;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    this.turnToward(Math.atan2(dy, dx), dt * 2.5);
    this.walking = true;
    this.animTime += dt;
    if (dist <= step) {
      this.x = target.x;
      this.y = target.y;
      this.path.shift();
      return this.path.length === 0;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    return false;
  }

  private turnToward(target: number, dt: number): void {
    const diff = angleDiff(this.angle, target);
    const maxTurn = 4 * dt;
    this.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
  }

  private angleToward(tile: TilePoint): number {
    const c = tileCenter(tile);
    return Math.atan2(c.y + 4 - this.y, c.x - this.x);
  }

  private tileAt(x: number, y: number): TilePoint {
    return { tx: Math.floor(x / TILE), ty: Math.floor((y - 4) / TILE) };
  }
}
