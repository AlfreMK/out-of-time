import type { MusicTheme, SfxName } from '../engine/audio.ts';
import { VIEW_H, VIEW_W, type Screen } from '../engine/screen.ts';
import { clamp } from '../engine/random.ts';
import { drawText, FONT_FAMILY, wrapText } from '../engine/text.ts';
import { ERA_INFO } from '../eras/info.ts';
import type {
  ActorHandle,
  AllySpec,
  ArriveScript,
  CompanionHandle,
  CompanionSpec,
  DecorKind,
  EraDef,
  GateHandle,
  GateSpec,
  HazardSpec,
  Line,
  NpcSpec,
  ObstacleSpec,
  PickupSpec,
  Script,
  SleeperSpec,
  TriggerSpec,
  WatcherSpec,
  WorldApi,
} from '../eras/types.ts';
import { WorldView } from '../render/world-view.ts';
import { EMOTES, ITEM_SPRITES } from './art.ts';
import { Entity } from './entities/entity.ts';
import { Player } from './entities/player.ts';
import {
  Ally,
  Arrow,
  Bait,
  Companion,
  Decor,
  FallingRock,
  Gate,
  Inspect,
  Machine,
  Npc,
  Obstacle,
  Pickup,
  Sleeper,
  Thrown,
} from './entities/props.ts';
import { Watcher, type Food } from './entities/watcher.ts';
import { showEnding, startTravel, toTitle } from './flow.ts';
import type { Game, Scene } from './game.ts';
import { FOODS, ITEMS, TOOLS } from './items.ts';
import { ERA_IDS, ITEM_IDS, type EraId, type ItemId } from './state.ts';
import { TILE, TileMap, type TileRect, type TilePoint } from './tilemap.ts';
import { ChoiceMenu, DialogueBox, drawPanel, speakerColor, Timers, YearPicker } from './ui.ts';
import { eraFlags, Flag, progress, type FlagName } from './flags.ts';

interface PixelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TriggerState {
  spec: TriggerSpec;
  rect: PixelRect;
  inside: boolean;
  lastOutX: number;
  lastOutY: number;
}

interface HazardState {
  spec: HazardSpec;
  rect: PixelRect;
  timer: number;
  shooters: Array<{ x: number; y: number }>;
}

export interface Particle {
  /** Map position in pixels. */
  x: number;
  y: number;
  /** Height above the ground in pixels. */
  h: number;
  vx: number;
  vy: number;
  vh: number;
  life: number;
  max: number;
  color: string;
  gravity: number;
  /** Size in world units. */
  size: number;
}

export interface NoiseRing {
  x: number;
  y: number;
  radius: number;
  t: number;
}

const THROW_RANGE = 64;
/** How far the pifilka whistle carries to hidden allies. */
const WHISTLE_RANGE = 170;
type PauseOption = 'Resume' | 'Journal' | 'Sound' | 'Debug' | 'Quit to title';

const pointInRect = (x: number, y: number, r: PixelRect): boolean => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;

export interface WorldOptions {
  /** Spawn here instead of next to the time machine (continuing a saved game). */
  spawn?: { x: number; y: number };
}

/** One playable era: map, characters, stealth rules, scripted events and HUD. */
export class World implements Scene, WorldApi {
  readonly game: Game;
  readonly def: EraDef;
  readonly map: TileMap;
  readonly hero = new Player();
  /** Recent player positions, used by companions to follow the same path. */
  readonly trail: Array<{ x: number; y: number }> = [];
  private readonly view: WorldView;
  private entities: Entity[] = [];
  private readonly watchers: Watcher[] = [];
  private readonly sleepers: Sleeper[] = [];
  private readonly allies: Ally[] = [];
  private machineEntity: Machine | null = null;
  private readonly triggers: TriggerState[] = [];
  private readonly hazards: HazardState[] = [];
  private readonly checkpoints: Array<{ x: number; y: number }> = [];
  private readonly musicZones: Array<{ rect: PixelRect; theme: MusicTheme; when?: (w: WorldApi) => boolean }> = [];
  private activeCheckpoint: { x: number; y: number };
  private particles: Particle[] = [];
  private rings: NoiseRing[] = [];
  private readonly dialogue = new DialogueBox();
  private readonly menu = new ChoiceMenu();
  private readonly yearPicker = new YearPicker();
  private readonly timers = new Timers();
  private scriptDepth = 0;
  private caughtLock = false;
  private shakeTime = 0;
  private shakePower = 0;
  private flashColor = '#ffffff';
  private flashTime = 0;
  private flashMax = 1;
  private fade = 0;
  private fadeTarget = 0;
  private fadeSpeed = 2;
  private fadeResolve: (() => void) | null = null;
  private toastText = '';
  private toastTime = 0;
  private toolIndex = 0;
  private toolCooldown = 0;
  private paused = false;
  private pauseIndex = 0;
  private journalOpen = false;
  private journalScroll = 0;
  private musicOverride: MusicTheme | null = null;
  private time = 0;
  private visits = 0;
  private interactTarget: Entity | null = null;
  private readonly onArrive: ArriveScript | null;

  constructor(game: Game, def: EraDef, options: WorldOptions = {}) {
    this.game = game;
    this.def = def;
    this.map = new TileMap(def.map, def.tiles, def.markerBase, def.defaultTile);
    const start = options.spawn ?? this.feet(def.arrival);
    this.hero.x = start.x;
    this.hero.y = start.y;
    this.activeCheckpoint = { ...start };
    this.entities.push(this.hero);
    this.dialogue.format = (text) => game.input.format(text);
    this.dialogue.onLine = (speaker, text) => game.state.record(speaker, text);
    for (const zone of def.musicZones ?? []) {
      this.musicZones.push({ rect: this.rectOf(zone.area), theme: zone.theme, when: zone.when });
    }
    this.onArrive = def.setup(this) ?? null;
    this.view = new WorldView(this);
    this.game.state.checkpoint = { era: def.id, x: start.x, y: start.y };
  }

  /** Read-only lists for the 3D view. */
  get entityList(): readonly Entity[] {
    return this.entities;
  }

  get watcherList(): readonly Watcher[] {
    return this.watchers;
  }

  get particleList(): readonly Particle[] {
    return this.particles;
  }

  get ringList(): readonly NoiseRing[] {
    return this.rings;
  }

  // ---------------------------------------------------------------------------
  // Scene lifecycle

  enter(): void {
    this.visits++;
    this.updateMusic();
    if (this.visits === 1) {
      const visitedFlag = progress.visited(this.def.id);
      const firstVisit = !this.flag(visitedFlag);
      this.setFlag(visitedFlag);
      this.save();
      const onArrive = this.onArrive;
      if (onArrive) void this.runScript((w) => onArrive(w, firstVisit));
    }
  }

  get controlsLocked(): boolean {
    return this.scriptDepth > 0 || this.dialogue.active || this.menu.active || this.yearPicker.active || this.paused;
  }

  update(dt: number): void {
    const input = this.game.input;
    if (this.paused) {
      this.updatePause();
      return;
    }
    if (input.wasPressed('pause') && !this.controlsLocked) {
      input.consume('pause');
      this.paused = true;
      this.pauseIndex = 0;
      this.journalOpen = false;
      this.game.audio.sfx('select');
      return;
    }

    this.time += dt;
    this.timers.update(dt);
    this.updateFade(dt);
    if (this.dialogue.active) this.dialogue.update(dt, input, this.game.audio);
    else if (this.menu.active) this.menu.update(input, this.game.audio);
    else if (this.yearPicker.active) this.yearPicker.update(input, this.game.audio);

    for (const entity of this.entities) entity.update(dt, this);
    this.entities = this.entities.filter((e) => !e.removed);
    this.updateTrail();
    this.updateParticles(dt);

    this.interactTarget = null;
    if (!this.controlsLocked) {
      this.updateTriggers();
      this.updateHazards(dt);
      this.updateCheckpoints();
      this.updateInteraction();
      this.updateTools(dt);
    }
    this.updateMusic();

    this.view.sync(this.time, dt, this.shakeTime > 0 ? this.shakePower : 0);
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    this.flashTime = Math.max(0, this.flashTime - dt);
    this.toastTime = Math.max(0, this.toastTime - dt);
  }

  // ---------------------------------------------------------------------------
  // Gameplay systems

  /**
   * True when a box at (x, y) would overlap a wall or a solid entity. Pass the
   * movement (dx, dy) to also respect one-way ledges.
   */
  isBlocked(x: number, y: number, hw: number, hh: number, self?: Entity, dx = 0, dy = 0): boolean {
    if (this.map.boxBlocked(x, y, hw, hh)) return true;
    if ((dx !== 0 || dy !== 0) && this.map.ledgeBlocks(x, y, hw, hh, dx, dy)) return true;
    for (const e of this.entities) {
      if (e === self || !e.solid || e.removed) continue;
      const cy = e.y + (e.solid.offsetY ?? 0);
      if (Math.abs(x - e.x) < hw + e.solid.hw && Math.abs(y - cy) < hh + e.solid.hh) return true;
    }
    return false;
  }

  /** Emits a sound. Watchers investigate, dogs come for food, sleepers wake up. */
  noise(x: number, y: number, radius: number, kind: 'step' | 'noise' | 'food', food?: Food): void {
    if (kind !== 'food') this.rings.push({ x, y, radius, t: 0 });
    for (const watcher of this.watchers) watcher.hear(x, y, radius, kind, this, food);
    if (kind === 'food') return;
    for (const sleeper of this.sleepers) {
      if (sleeper.hear(x, y, radius)) {
        this.caught(sleeper, sleeper.caughtLines, sleeper.sound);
        return;
      }
    }
  }

  /** The player got spotted (or woke something up): play the scene and respawn. */
  caught(by: Entity | null, lines: Line[], sound: SfxName = 'spotted'): void {
    if (this.caughtLock || this.scriptDepth > 0 || this.game.godMode) return;
    this.caughtLock = true;
    void this.runScript(async () => {
      this.game.audio.sfx(sound);
      if (by instanceof Watcher && by.kind === 'dog') this.game.audio.sfx('bark');
      if (by instanceof Watcher && by.kind === 'raptor') this.game.audio.sfx('growl');
      if (by instanceof Watcher && (by.kind === 'camera' || by.kind === 'drone' || by.kind === 'bot')) this.game.audio.sfx('alarm');
      if (sound === 'roar') this.shake(4, 1.2);
      by?.emote('alert', 1.5);
      this.hero.emote('alert', 1);
      await this.wait(0.7);
      await this.say(...lines);
      await this.fadeOut(0.4);
      this.respawn();
      await this.fadeIn(0.4);
      this.caughtLock = false;
    });
  }

  private respawn(): void {
    this.hero.x = this.activeCheckpoint.x;
    this.hero.y = this.activeCheckpoint.y;
    this.hero.stun = 0;
    for (const entity of this.entities) {
      if (entity instanceof Bait || entity instanceof Thrown || entity instanceof FallingRock || entity instanceof Arrow) {
        entity.removed = true;
      }
      entity.reset?.();
    }
    this.trail.length = 0;
    for (const entity of this.entities) if (entity instanceof Companion && entity.following) entity.regroup(this);
    for (const t of this.triggers) {
      t.inside = pointInRect(this.hero.x, this.hero.y, t.rect);
      t.lastOutX = this.hero.x;
      t.lastOutY = this.hero.y;
    }
    this.rings = [];
    this.view.snap();
  }

  private hitHero(): void {
    if (this.game.godMode) return;
    if (this.has('shield')) {
      this.game.audio.sfx('clang');
      this.burst(this.hero.x, this.hero.y, '#fff3a0', 8, 16);
      this.hero.stun = 0.25;
    } else {
      this.caught(null, ['Ouch! That was too close.']);
    }
  }

  private updateTrail(): void {
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last.x - this.hero.x, last.y - this.hero.y) >= 3) {
      this.trail.push({ x: this.hero.x, y: this.hero.y });
      if (this.trail.length > 80) this.trail.shift();
    }
  }

  private updateTriggers(): void {
    const { x, y } = this.hero;
    for (const t of this.triggers) {
      const inside = pointInRect(x, y, t.rect);
      if (!inside) {
        t.inside = false;
        t.lastOutX = x;
        t.lastOutY = y;
        continue;
      }
      if (t.inside) continue;
      t.inside = true;
      const spec = t.spec;
      if (spec.when && !spec.when(this)) continue;
      if (spec.once && this.flag(spec.once)) continue;
      if (spec.once) this.setFlag(spec.once);
      if (spec.block) {
        // Step back out and nudge a little further away from the area.
        const cx = t.rect.x + t.rect.w / 2;
        const cy = t.rect.y + t.rect.h / 2;
        const dx = t.lastOutX - cx;
        const dy = t.lastOutY - cy;
        const len = Math.hypot(dx, dy) || 1;
        this.hero.x = t.lastOutX;
        this.hero.y = t.lastOutY;
        const nx = this.hero.x + (dx / len) * 4;
        const ny = this.hero.y + (dy / len) * 4;
        if (!this.isBlocked(nx, ny, this.hero.hw, this.hero.hh, this.hero)) {
          this.hero.x = nx;
          this.hero.y = ny;
        }
        t.inside = false;
      }
      void this.runScript(spec.run);
      return;
    }
  }

  private updateHazards(dt: number): void {
    const hero = this.hero;
    for (const h of this.hazards) {
      if (!pointInRect(hero.x, hero.y, h.rect) || (h.spec.when && !h.spec.when(this))) {
        h.timer = 0.3;
        continue;
      }
      h.timer -= dt;
      if (h.timer > 0) continue;
      if (h.spec.kind === 'rocks') {
        h.timer = 0.4;
        const near = Math.random() < 0.6;
        const tx = near ? hero.x + (Math.random() - 0.5) * 36 : h.rect.x + Math.random() * h.rect.w;
        const ty = near ? hero.y + (Math.random() - 0.5) * 30 : h.rect.y + Math.random() * h.rect.h;
        if (this.map.defAt(tx, ty).solid) continue;
        this.entities.push(
          new FallingRock(tx, ty, (lx, ly) => {
            this.game.audio.sfx('crack');
            this.burst(lx, ly, '#8a8378', 10, 2);
            if (Math.hypot(hero.x - lx, hero.y - ly) < 10) this.hitHero();
          }),
        );
      } else if (h.shooters.length > 0) {
        // Archers in their alcoves shoot straight across the corridor.
        h.timer = 0.3;
        const shooter = h.shooters[Math.floor(Math.random() * h.shooters.length)];
        const down = shooter.y < h.rect.y + h.rect.h / 2;
        const bounds = { minX: h.rect.x - 8, maxX: h.rect.x + h.rect.w + 8, minY: h.rect.y - 20, maxY: h.rect.y + h.rect.h + 20 };
        this.game.audio.sfx('throw');
        const height = ((this.map.defAt(shooter.x, shooter.y).height ?? 0) + 0.7) * TILE;
        this.entities.push(new Arrow(shooter.x + (Math.random() - 0.5) * 6, shooter.y, 0, down ? 180 : -180, bounds, hero, () => this.hitHero(), height));
      } else {
        h.timer = 0.45;
        const fromLeft = Math.random() < 0.5;
        const ay = clamp(hero.y + (Math.random() - 0.5) * 20, h.rect.y + 6, h.rect.y + h.rect.h - 2);
        const bounds = { minX: h.rect.x - 24, maxX: h.rect.x + h.rect.w + 24, minY: h.rect.y - 24, maxY: h.rect.y + h.rect.h + 24 };
        this.entities.push(new Arrow(fromLeft ? bounds.minX + 2 : bounds.maxX - 2, ay, fromLeft ? 170 : -170, 0, bounds, hero, () => this.hitHero()));
      }
    }
  }

  private updateCheckpoints(): void {
    for (const cp of this.checkpoints) {
      if (cp === this.activeCheckpoint || Math.hypot(cp.x - this.hero.x, cp.y - this.hero.y) >= 24) continue;
      this.activeCheckpoint = cp;
      // Continuing a saved game resumes from here.
      this.game.state.checkpoint = { era: this.def.id, x: cp.x, y: cp.y };
      this.save();
    }
  }

  private updateMusic(): void {
    let theme: MusicTheme = this.def.music;
    if (this.musicOverride) theme = this.musicOverride;
    else if (this.def.darkMusic && this.map.defAt(this.hero.x, this.hero.y).dark) theme = this.def.darkMusic;
    else {
      const zone = this.musicZones.find((z) => pointInRect(this.hero.x, this.hero.y, z.rect) && (!z.when || z.when(this)));
      if (zone) theme = zone.theme;
    }
    this.game.audio.music(theme);
  }

  private findInteractTarget(): Entity | null {
    const dir = this.hero.dir;
    const px = this.hero.x + dir.x * 9;
    const py = this.hero.y - 4 + dir.y * 9;
    let best: Entity | null = null;
    let bestDist = 10;
    for (const e of this.entities) {
      if (!e.interactLabel || e.removed || e === this.hero) continue;
      let dist: number;
      if (e instanceof Inspect) {
        // Signs, panels and statues have no body of their own: the whole tile answers.
        dist = Math.hypot(Math.max(0, Math.abs(px - e.x) - TILE / 2), Math.max(0, Math.abs(py - (e.y - 4)) - TILE / 2));
      } else if (e.solid) {
        const cy = e.y + (e.solid.offsetY ?? 0);
        dist = Math.hypot(Math.max(0, Math.abs(px - e.x) - e.solid.hw), Math.max(0, Math.abs(py - cy) - e.solid.hh));
      } else {
        dist = Math.max(0, Math.hypot(px - e.x, py - (e.y - 4)) - 5);
      }
      if (dist < bestDist) {
        best = e;
        bestDist = dist;
      }
    }
    return best;
  }

  private updateInteraction(): void {
    this.interactTarget = this.findInteractTarget();
    if (this.interactTarget && this.game.input.consume('interact')) {
      const target = this.interactTarget;
      void this.runScript((w) => target.interact?.(w as World));
    }
  }

  private availableTools(): ItemId[] {
    return TOOLS.filter((item) => this.has(item));
  }

  private updateTools(dt: number): void {
    this.toolCooldown = Math.max(0, this.toolCooldown - dt);
    const input = this.game.input;
    const options = this.availableTools();
    if (input.consume('cycle') && options.length > 1) {
      this.toolIndex = (this.toolIndex + 1) % options.length;
      this.game.audio.sfx('blip');
      this.toast(`Using: ${ITEMS[options[this.toolIndex]].name}`);
    }
    if (!input.consume('throw') || this.toolCooldown > 0) return;
    if (options.length === 0) {
      this.toast('Nothing to use.');
      return;
    }
    const item = options[this.toolIndex % options.length];
    if (item === 'pifilka') {
      this.whistle();
      return;
    }
    const dir = this.hero.dir;
    let reach = 8;
    for (let s = 8; s <= THROW_RANGE; s += 4) {
      const def = this.map.defAt(this.hero.x + dir.x * s, this.hero.y - 4 + dir.y * s);
      if (def.solid && !def.low) break;
      reach = s;
    }
    const tx = this.hero.x + dir.x * reach;
    const ty = this.hero.y + dir.y * reach;
    this.toolCooldown = 0.6;
    this.game.audio.sfx('throw');
    this.entities.push(
      new Thrown(item, this.hero.x, this.hero.y - 2, tx, ty, (lx, ly) => {
        if (FOODS.includes(item)) {
          const bait = new Bait(lx, ly, item);
          this.entities.push(bait);
          this.noise(lx, ly, 110, 'food', bait);
        } else {
          this.game.audio.sfx('thud');
          this.burst(lx, ly, '#c9b78a', 6, 2);
          this.noise(lx, ly, 96, 'noise');
        }
      }),
    );
  }

  /**
   * The pifilka signal: hidden allies in range answer with a trutruka call from
   * their own position, pulling nearby watchers away. The whistle itself is soft.
   */
  private whistle(): void {
    this.toolCooldown = 1.2;
    this.game.audio.sfx('whistle');
    this.rings.push({ x: this.hero.x, y: this.hero.y, radius: 30, t: 0 });
    const ready = this.allies.filter((a) => a.cooldown <= 0 && Math.hypot(a.x - this.hero.x, a.y - this.hero.y) <= WHISTLE_RANGE);
    if (ready.length === 0) {
      const anyNear = this.allies.some((a) => Math.hypot(a.x - this.hero.x, a.y - this.hero.y) <= WHISTLE_RANGE);
      this.toast(anyNear ? 'The scouts need a moment to move.' : 'No one is close enough to hear it.');
      return;
    }
    for (const ally of ready) {
      ally.cooldown = 12;
      void this.timers.wait(0.7).then(() => {
        this.game.audio.sfx('horn');
        ally.emote('note', 1.5);
        this.noise(ally.x, ally.y, 150, 'noise');
      });
    }
  }

  private updateFade(dt: number): void {
    if (this.fade === this.fadeTarget) return;
    const step = dt * this.fadeSpeed;
    this.fade = this.fade < this.fadeTarget ? Math.min(this.fadeTarget, this.fade + step) : Math.max(this.fadeTarget, this.fade - step);
    if (this.fade === this.fadeTarget && this.fadeResolve) {
      const resolve = this.fadeResolve;
      this.fadeResolve = null;
      resolve();
    }
  }

  /** The debug entry only appears while god mode is on. */
  private get pauseOptions(): PauseOption[] {
    return this.game.godMode ? ['Resume', 'Journal', 'Sound', 'Debug', 'Quit to title'] : ['Resume', 'Journal', 'Sound', 'Quit to title'];
  }

  private updatePause(): void {
    const input = this.game.input;
    const PAUSE_OPTIONS = this.pauseOptions;
    this.pauseIndex = Math.min(this.pauseIndex, PAUSE_OPTIONS.length - 1);
    if (this.journalOpen) {
      if (input.consume('up')) this.journalScroll++;
      if (input.consume('down')) this.journalScroll = Math.max(0, this.journalScroll - 1);
      if (input.consume('back') || input.consume('pause') || input.consume('interact')) this.journalOpen = false;
      return;
    }
    if (input.consume('up')) this.pauseIndex = (this.pauseIndex + PAUSE_OPTIONS.length - 1) % PAUSE_OPTIONS.length;
    if (input.consume('down')) this.pauseIndex = (this.pauseIndex + 1) % PAUSE_OPTIONS.length;
    if (input.consume('pause') || input.consume('back')) {
      this.paused = false;
      return;
    }
    if (!input.consume('interact')) return;
    this.game.audio.sfx('select');
    const option = PAUSE_OPTIONS[this.pauseIndex];
    if (option === 'Resume') this.paused = false;
    else if (option === 'Journal') {
      this.journalOpen = true;
      this.journalScroll = 0;
    } else if (option === 'Sound') this.game.audio.toggleMute();
    else if (option === 'Debug') {
      this.paused = false;
      void this.runScript(() => this.debugMenu());
    } else {
      this.save();
      toTitle(this.game);
    }
  }

  /** Testing tools, available while god mode is on (type "letmetest"). */
  private async debugMenu(): Promise<void> {
    const options = ['Give all items', 'Unlock all eras', 'Warp to era...', 'Repair the machine in this era', 'Restart this era', 'Back'];
    const pick = await this.choose('DEBUG', options);
    if (pick === 0) {
      for (const item of ITEM_IDS) this.give(item);
      this.toast('All items added');
    } else if (pick === 1) {
      for (const era of ERA_IDS) {
        this.setFlag(progress.visited(era));
        this.setFlag(progress.diagnosed(era));
        if (era !== 'ruins') this.setFlag(progress.fixed(era));
      }
      this.setFlag(progress.got('notes'));
      this.setFlag(Flag.EmitterInstalled);
      this.setFlag(Flag.NavInstalled);
      this.setFlag(Flag.PipFriend);
      this.setFlag(Flag.PipAboard);
      this.toast('All eras unlocked');
    } else if (pick === 2) {
      const eras = ERA_IDS.filter((era) => era !== this.def.id);
      const choice = await this.choose('WARP TO', [...eras.map((era) => `${ERA_INFO[era].name}  ·  ${ERA_INFO[era].year}`), 'Cancel']);
      if (choice < eras.length) {
        this.save();
        await this.travel(eras[choice]);
      }
    } else if (pick === 3) {
      this.setFlag(progress.diagnosed(this.def.id));
      this.setFlag(progress.fixed(this.def.id));
      this.toast('Machine repaired');
    } else if (pick === 4) {
      const sure = await this.choose('Restart this era? Its items, flags and dialogue reset.', ['Restart', 'Cancel']);
      if (sure === 0) {
        this.restartEra();
        return;
      }
    }
    this.save();
  }

  /** Debug: forgets everything gained in this era and reloads it from the arrival point. */
  private restartEra(): void {
    const era = this.def.id;
    const state = this.game.state;
    for (const item of ITEM_IDS) {
      if (ITEMS[item].era !== era) continue;
      state.take(item);
      state.setFlag(progress.got(item), false);
    }
    for (const flag of eraFlags(era)) state.setFlag(flag, false);
    state.setFlag(progress.visited(era), false);
    state.setFlag(progress.diagnosed(era), false);
    state.setFlag(progress.fixed(era), false);
    state.checkpoint = null;
    state.save();
    this.game.switchTo(new World(this.game, this.def), 0.6);
  }

  // ---------------------------------------------------------------------------
  // Effects

  /** Little cubes flying out of a point (pickups, impacts, debris). */
  burst(x: number, y: number, color: string, count: number, height = 8): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 15 + Math.random() * 35;
      this.particles.push({ x, y, h: height, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vh: 30 + Math.random() * 40, life: 0.6, max: 0.6, color, gravity: 140, size: 0.08 });
    }
  }

  smoke(x: number, y: number, height: number): void {
    this.particles.push({ x, y, h: height, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, vh: 14, life: 1.8, max: 1.8, color: '#a8adb5', gravity: 0, size: 0.16 });
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vh -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.h = Math.max(0, p.h + p.vh * dt);
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const ring of this.rings) ring.t += dt * 2.2;
    this.rings = this.rings.filter((ring) => ring.t < 1);
  }

  // ---------------------------------------------------------------------------
  // Drawing

  draw(screen: Screen, time: number): void {
    this.view.render(screen);
    this.drawOverheads(screen, time);
    this.drawPrompt(screen, time);
    this.drawHud(screen);
    this.dialogue.draw(screen, time);
    this.menu.draw(screen, time);
    this.yearPicker.draw(screen, time);

    const ui = screen.ui;
    if (this.flashTime > 0) {
      ui.globalAlpha = this.flashTime / this.flashMax;
      ui.fillStyle = this.flashColor;
      ui.fillRect(0, 0, VIEW_W, VIEW_H);
      ui.globalAlpha = 1;
    }
    if (this.fade > 0) {
      ui.fillStyle = `rgba(0,0,0,${this.fade})`;
      ui.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.paused) {
      if (this.journalOpen) this.drawJournal(screen);
      else this.drawPause(screen);
    }
  }

  /** Emotes, speech bubbles and suspicion meters floating above characters. */
  private drawOverheads(screen: Screen, time: number): void {
    const ui = screen.ui;
    for (const entity of this.entities) {
      const emote = entity.currentEmote;
      if (emote) {
        const p = this.view.project(entity.x, entity.y, entity.height + 6);
        if (p.visible) {
          const sprite = EMOTES[emote];
          const w = sprite.width * 2;
          const h = sprite.height * 2;
          const bob = Math.sin(time * 6) * 1;
          drawPanel(ui, p.x - w / 2 - 3, p.y - h - 4 + bob, w + 6, h + 6, 0.8);
          ui.drawImage(sprite, Math.round(p.x - w / 2), Math.round(p.y - h - 1 + bob), w, h);
        }
      }
      if (!(entity instanceof Watcher)) continue;
      if (entity.bark) {
        const p = this.view.project(entity.x, entity.y, entity.height + 10);
        if (p.visible) {
          ui.font = `5.5px ${FONT_FAMILY}`;
          const w = ui.measureText(entity.bark.text).width + 8;
          const y = p.y - (emote ? 26 : 12);
          ui.globalAlpha = Math.min(1, entity.bark.time * 3);
          drawPanel(ui, p.x - w / 2, y, w, 9, 0.9);
          drawText(ui, entity.bark.text, p.x, y + 1.8, { size: 5.5, align: 'center', color: '#f4f1de', shadow: null });
          ui.globalAlpha = 1;
        }
      }
      if (entity.suspicion > 0.02 && !emote) {
        const p = this.view.project(entity.x, entity.y, entity.height + 4);
        if (!p.visible) continue;
        const w = 16;
        ui.fillStyle = 'rgba(0,0,0,0.65)';
        ui.fillRect(p.x - w / 2 - 1, p.y - 4, w + 2, 4);
        ui.fillStyle = entity.suspicion > 0.66 ? '#ff4040' : '#ffd23f';
        ui.fillRect(p.x - w / 2, p.y - 3, w * Math.min(1, entity.suspicion), 2);
      }
    }
  }

  private drawPrompt(screen: Screen, time: number): void {
    const target = this.interactTarget;
    if (!target || !target.interactLabel) return;
    const p = this.view.project(target.x, target.y, target.height + 8);
    if (!p.visible) return;
    const ui = screen.ui;
    const bob = Math.floor(time * 3) % 2;
    const label = target.interactLabel;
    const key = this.game.input.glyph('interact');
    ui.font = `6px ${FONT_FAMILY}`;
    const keyW = Math.max(8, ui.measureText(key).width + 4);
    const w = ui.measureText(label).width + keyW + 10;
    const x = Math.round(p.x - w / 2);
    const y = Math.round(p.y - 12 - bob);
    drawPanel(ui, x, y, w, 11, 0.85);
    ui.fillStyle = '#f4f1de';
    ui.beginPath();
    ui.roundRect(x + 2, y + 2, keyW, 7, 1.5);
    ui.fill();
    drawText(ui, key, x + 2 + keyW / 2, y + 2.5, { size: 6, bold: true, align: 'center', color: '#1a1d2a', shadow: null });
    drawText(ui, label, x + keyW + 5, y + 2.5, { size: 6, color: '#f4f1de', shadow: null });
  }

  private drawHud(screen: Screen): void {
    const ui = screen.ui;
    const info = ERA_INFO[this.def.id];
    drawPanel(ui, 4, 4, 142, 21);
    drawText(ui, `${info.name.toUpperCase()}  ·  ${info.year}`, 9, 7.5, { size: 6.5, color: '#f1c232', bold: true });
    drawText(ui, info.place, 9, 16, { size: 5.5, color: '#9aa6bb' });

    this.drawParts(screen);

    if (this.toastTime > 0 && this.toastText) {
      const tw = Math.min(220, this.toastText.length * 5 + 16);
      const alpha = Math.min(1, this.toastTime * 3);
      ui.globalAlpha = alpha;
      drawPanel(ui, (VIEW_W - tw) / 2, 30, tw, 13);
      ui.globalAlpha = 1;
      drawText(ui, this.toastText, VIEW_W / 2, 33, { size: 6.5, align: 'center', alpha });
    }

    if (this.dialogue.active || this.menu.active || this.yearPicker.active) return;

    if (this.game.godMode) {
      ui.font = `bold 6px ${FONT_FAMILY}`;
      const w = ui.measureText('GOD MODE').width + 12;
      drawPanel(ui, (VIEW_W - w) / 2, VIEW_H - 18, w, 13);
      drawText(ui, 'GOD MODE', VIEW_W / 2, VIEW_H - 14.5, { size: 6, align: 'center', bold: true, color: '#ff6bd6' });
    }

    if (this.hero.hidden || this.hero.sneaking) {
      const label = this.hero.hidden ? 'HIDDEN' : 'SNEAKING';
      drawPanel(ui, 4, VIEW_H - 18, 50, 14);
      drawText(ui, label, 29, VIEW_H - 14.5, { size: 6.5, align: 'center', bold: true, color: this.hero.hidden ? '#5aff8a' : '#7fd8ff' });
    }

    const options = this.availableTools();
    if (options.length > 0) {
      const input = this.game.input;
      const item = options[this.toolIndex % options.length];
      const label = `${input.glyph('throw')} ${ITEMS[item].name}`;
      ui.font = `6px ${FONT_FAMILY}`;
      const cycle = options.length > 1 ? `  ${input.glyph('cycle')}` : '';
      const bw = ui.measureText(label + cycle).width + 22;
      const bx = VIEW_W - bw - 4;
      drawPanel(ui, bx, VIEW_H - 18, bw, 14);
      ui.drawImage(ITEM_SPRITES[item], bx + 4, VIEW_H - 15);
      drawText(ui, label, bx + 15, VIEW_H - 14.5, { size: 6 });
      if (cycle) drawText(ui, cycle.trim(), bx + bw - 6, VIEW_H - 14.5, { size: 6, align: 'right', color: '#9aa6bb' });
    }
  }

  /** Top-right checklist of the machine parts this era needs, by name once diagnosed. */
  private drawParts(screen: Screen): void {
    const ui = screen.ui;
    const parts = this.def.parts;
    if (parts.length === 0) return;
    const fixed = this.flag(progress.fixed(this.def.id));
    const diagnosed = fixed || this.flag(progress.diagnosed(this.def.id));
    const w = 104;
    const x0 = VIEW_W - w - 4;
    const h = diagnosed ? 13 + parts.length * 10 : 23;
    drawPanel(ui, x0, 4, w, h);
    drawText(ui, fixed ? 'MACHINE REPAIRED' : 'MACHINE PARTS', x0 + 6, 7, { size: 5.5, bold: true, color: fixed ? '#5aff8a' : '#f1c232' });
    if (!diagnosed) {
      drawText(ui, 'Check the time machine', x0 + 6, 15, { size: 5.5, color: '#9aa6bb' });
      return;
    }
    parts.forEach((part, i) => {
      const y = 15 + i * 10;
      const got = fixed || this.has(part);
      ui.fillStyle = '#1a1d2a';
      ui.fillRect(x0 + 5, y - 1, 9, 9);
      if (got) ui.drawImage(ITEM_SPRITES[part], x0 + 5.5, y - 0.5);
      drawText(ui, ITEMS[part].name, x0 + 18, y, { size: 5.5, color: got ? '#5aff8a' : '#d8dceb' });
      if (got) drawText(ui, '✓', x0 + w - 8, y, { size: 6, align: 'center', color: '#5aff8a', shadow: null });
    });
  }

  private drawPause(screen: Screen): void {
    const ui = screen.ui;
    const input = this.game.input;
    ui.fillStyle = 'rgba(0,0,0,0.55)';
    ui.fillRect(0, 0, VIEW_W, VIEW_H);
    drawPanel(ui, 20, 12, 280, 156, 0.95);
    drawText(ui, 'PAUSED', VIEW_W / 2, 18, { size: 10, bold: true, align: 'center', color: '#f1c232' });

    drawText(ui, 'GOAL', 32, 32, { size: 6, bold: true, color: '#7fd8ff' });
    wrapText(ui, this.def.objective(this), 250, 6.5).slice(0, 2).forEach((line, i) => {
      drawText(ui, line, 56, 32 + i * 8, { size: 6.5, color: '#f4f1de' });
    });

    this.pauseOptions.forEach((option, i) => {
      const label = option === 'Sound' ? `Sound: ${this.game.audio.muted ? 'Off' : 'On'}` : option;
      const selected = i === this.pauseIndex;
      drawText(ui, `${selected ? '>' : ' '} ${label}`, 32, 54 + i * 11, { color: selected ? '#ffffff' : '#9aa6bb' });
    });
    const pad = input.device !== 'keyboard';
    const controls = [
      `Move ........ ${pad ? 'Left stick / D-pad' : 'WASD / Arrows'}`,
      `Interact .... ${input.glyph('interact')}${pad ? '' : ' / Space'}`,
      `Sneak ....... Hold ${input.glyph('sneak')}${pad ? ' / tilt gently' : ''}`,
      `Use item .... ${input.glyph('throw')}`,
      `Switch item . ${input.glyph('cycle')}`,
      `Pause ....... ${input.glyph('pause')}`,
    ];
    controls.forEach((line, i) => drawText(ui, line, 150, 54 + i * 10, { size: 6.5, color: '#b8c4d8' }));
    drawText(ui, 'INVENTORY', 32, 116, { size: 7, bold: true, color: '#f1c232' });
    const items = [...this.game.state.items];
    if (items.length === 0) drawText(ui, '(empty)', 32, 127, { size: 6.5, color: '#55607a' });
    // Shrink the grid as the bag fills up, so it always fits inside the panel.
    const cols = items.length > 16 ? 5 : 4;
    const rows = Math.ceil(items.length / cols);
    const rowH = Math.min(10, 39 / Math.max(1, rows));
    const colW = 264 / cols;
    items.forEach((item, i) => {
      const x = 32 + (i % cols) * colW;
      const y = 127 + Math.floor(i / cols) * rowH;
      ui.drawImage(ITEM_SPRITES[item], x, y);
      drawText(ui, ITEMS[item].name, x + 11, y + 0.5, { size: cols === 4 ? 5.5 : 4.5 });
    });
  }

  /** The story so far: every line of dialogue, newest at the bottom. */
  private drawJournal(screen: Screen): void {
    const ui = screen.ui;
    ui.fillStyle = 'rgba(0,0,0,0.6)';
    ui.fillRect(0, 0, VIEW_W, VIEW_H);
    drawPanel(ui, 16, 10, 288, 160, 0.96);
    drawText(ui, 'JOURNAL', VIEW_W / 2, 15, { size: 9, bold: true, align: 'center', color: '#f1c232' });

    const rows: Array<{ text: string; color: string }> = [];
    for (const [speaker, text] of this.game.state.log) {
      const prefix = speaker ? `${speaker}: ` : '';
      wrapText(ui, prefix + text, 266, 6).forEach((line, i) => {
        rows.push({ text: line, color: i === 0 && speaker ? speakerColor(speaker) : speaker ? '#f4f1de' : '#b8c4d8' });
      });
      rows.push({ text: '', color: '' });
    }
    const visible = 15;
    const maxScroll = Math.max(0, rows.length - visible);
    this.journalScroll = Math.min(this.journalScroll, maxScroll);
    const start = Math.max(0, rows.length - visible - this.journalScroll);
    rows.slice(start, start + visible).forEach((row, i) => {
      if (row.text) drawText(ui, row.text, 26, 29 + i * 8.6, { size: 6, color: row.color, shadow: null });
    });
    if (rows.length === 0) drawText(ui, 'Nothing written yet.', VIEW_W / 2, 80, { size: 6.5, align: 'center', color: '#55607a' });
    const input = this.game.input;
    drawText(ui, `Up/Down scroll · ${input.glyph('back')} close`, VIEW_W / 2, 161, { size: 5.5, align: 'center', color: '#9aa6bb' });
  }

  // ---------------------------------------------------------------------------
  // Helpers

  /** Ground position for characters standing on a marker tile. */
  feet(marker: string): { x: number; y: number } {
    const p = this.map.marker(marker);
    return { x: p.tx * TILE + TILE / 2, y: p.ty * TILE + 12 };
  }

  private rectOf(area: string | TileRect): PixelRect {
    const a = typeof area === 'string' ? this.map.markerArea(area) : area;
    return { x: a.x * TILE, y: a.y * TILE, w: a.w * TILE, h: a.h * TILE };
  }

  private handle(entity: Entity): ActorHandle {
    return {
      get x() {
        return entity.x;
      },
      get y() {
        return entity.y;
      },
      moveTo: (marker, speed) => {
        const p = this.feet(marker);
        return entity.moveToPoint(p.x, p.y, speed);
      },
      moveBy: (dx, dy, speed) => entity.moveToPoint(entity.x + dx, entity.y + dy, speed),
      emote: (kind, seconds) => entity.emote(kind, seconds),
      remove: () => {
        entity.removed = true;
        this.burst(entity.x, entity.y - 8, '#9b958b', 18);
        this.burst(entity.x, entity.y - 8, '#5f594f', 12);
      },
    };
  }

  private runScript(script: Script): Promise<void> {
    this.scriptDepth++;
    return Promise.resolve()
      .then(() => script(this))
      .catch((error: unknown) => console.error('Script error:', error))
      .finally(() => {
        this.scriptDepth--;
      });
  }

  // ---------------------------------------------------------------------------
  // WorldApi: progress

  get era(): EraId {
    return this.def.id;
  }

  has(item: ItemId): boolean {
    return this.game.state.has(item);
  }

  give(item: ItemId): void {
    this.game.state.give(item);
    this.game.state.setFlag(progress.got(item));
  }

  take(item: ItemId): void {
    this.game.state.take(item);
  }

  flag(name: FlagName): boolean {
    return this.game.state.flag(name);
  }

  setFlag(name: FlagName, on = true): void {
    this.game.state.setFlag(name, on);
  }

  save(): void {
    this.game.state.era = this.def.id;
    this.game.state.save();
  }

  // WorldApi: presentation

  say(...lines: Line[]): Promise<void> {
    return this.dialogue.open(lines);
  }

  choose(prompt: string, options: string[]): Promise<number> {
    return this.menu.open(prompt, options);
  }

  toast(text: string): void {
    this.toastText = this.game.input.format(text);
    this.toastTime = 2.2;
  }

  wait(seconds: number): Promise<void> {
    return this.timers.wait(seconds);
  }

  sfx(name: SfxName): void {
    this.game.audio.sfx(name);
  }

  music(theme: MusicTheme | null): void {
    this.musicOverride = theme;
    this.updateMusic();
  }

  shake(power: number, seconds: number): void {
    this.shakePower = power;
    this.shakeTime = seconds;
  }

  flash(color: string, seconds: number): void {
    this.flashColor = color;
    this.flashTime = seconds;
    this.flashMax = seconds;
  }

  fadeOut(seconds = 0.5): Promise<void> {
    return this.fadeTo(1, seconds);
  }

  fadeIn(seconds = 0.5): Promise<void> {
    return this.fadeTo(0, seconds);
  }

  private fadeTo(target: number, seconds: number): Promise<void> {
    this.fadeResolve?.();
    this.fadeTarget = target;
    this.fadeSpeed = 1 / Math.max(0.05, seconds);
    if (this.fade === target) return Promise.resolve();
    return new Promise((resolve) => {
      this.fadeResolve = resolve;
    });
  }

  machineGlitch(on: boolean): void {
    if (this.machineEntity) this.machineEntity.glitch = on;
  }

  // WorldApi: spawning

  watcher(spec: WatcherSpec): void {
    const route: TilePoint[] = spec.route.split('').map((ch) => this.map.marker(ch));
    const watcher = new Watcher(spec, route);
    this.watchers.push(watcher);
    this.entities.push(watcher);
  }

  npc(spec: NpcSpec): ActorHandle {
    const p = this.feet(spec.marker);
    const npc = new Npc(p.x, p.y, spec.look, spec.name, spec.facing ?? 'down', spec.talk);
    this.entities.push(npc);
    return this.handle(npc);
  }

  pickup(spec: PickupSpec): void {
    if (this.flag(progress.got(spec.item))) return;
    const p = this.feet(spec.marker);
    this.entities.push(new Pickup(p.x, p.y, spec.item, spec.lines ?? [], spec.after));
  }

  trigger(spec: TriggerSpec): void {
    const rect = this.rectOf(spec.area);
    this.triggers.push({ spec, rect, inside: pointInRect(this.hero.x, this.hero.y, rect), lastOutX: this.hero.x, lastOutY: this.hero.y });
  }

  hazard(spec: HazardSpec): void {
    const shooters = (spec.shooters ?? '').split('').filter(Boolean).map((ch) => this.feet(ch));
    this.hazards.push({ spec, rect: this.rectOf(spec.area), timer: 0.5, shooters });
  }

  sleeper(spec: SleeperSpec): void {
    const p = this.map.marker(spec.marker);
    // The T. rex spans two tiles to the right of its marker; a boar fits in one.
    const x = spec.look === 'boar' ? p.tx * TILE + TILE / 2 : p.tx * TILE + TILE;
    const sleeper = new Sleeper(x, p.ty * TILE + 14, spec);
    this.sleepers.push(sleeper);
    this.entities.push(sleeper);
  }

  companion(spec: CompanionSpec): CompanionHandle {
    const p = this.feet(spec.marker);
    const companion = new Companion(p.x, p.y, spec.name, spec.following, spec.talk);
    if (spec.following) companion.regroup(this);
    this.entities.push(companion);
    const base = this.handle(companion);
    return {
      ...base,
      get x() {
        return companion.x;
      },
      get y() {
        return companion.y;
      },
      get following() {
        return companion.following;
      },
      follow: () => {
        companion.following = true;
        this.trail.length = 0;
      },
      rest: () => {
        companion.following = false;
      },
      regroup: () => companion.regroup(this),
    };
  }

  obstacle(spec: ObstacleSpec): ActorHandle {
    const p = this.map.marker(spec.marker);
    const label = spec.label ?? { boulder: 'Boulder', column: 'Fallen column', log: 'Fallen trunk', blastdoor: 'Blast door', chest: 'Strongbox' }[spec.look];
    const obstacle = new Obstacle(p.tx * TILE + TILE / 2, (p.ty + 1) * TILE, spec.look, label, spec.interact);
    this.entities.push(obstacle);
    return this.handle(obstacle);
  }

  machine(marker: string, interact: Script): void {
    const p = this.map.marker(marker);
    this.machineEntity = new Machine(p.tx * TILE + TILE / 2, p.ty * TILE + 14, this, interact);
    this.entities.push(this.machineEntity);
  }

  inspect(marker: string, label: string, interact: Script): void {
    const p = this.map.marker(marker);
    this.entities.push(new Inspect(p.tx * TILE + TILE / 2, p.ty * TILE + TILE / 2 + 4, label, interact));
  }

  inspectEach(marker: string, label: string, interact: (w: WorldApi, index: number) => Promise<void> | void): void {
    this.map.markerAll(marker).forEach((p, index) => {
      this.entities.push(new Inspect(p.tx * TILE + TILE / 2, p.ty * TILE + TILE / 2 + 4, label, (w) => interact(w, index)));
    });
  }

  checkpoint(marker: string): void {
    this.checkpoints.push(this.feet(marker));
  }

  gate(spec: GateSpec): GateHandle {
    const p = this.map.marker(spec.marker);
    const gate = new Gate(p.tx * TILE + TILE / 2, (p.ty + 1) * TILE, spec.look, spec.openFlag ? this.flag(spec.openFlag) : false);
    this.entities.push(gate);
    return {
      get isOpen() {
        return gate.isOpen;
      },
      open: () => {
        gate.setOpen(true);
        this.game.audio.sfx(spec.look === 'laser' ? 'zap' : 'door');
        if (spec.openFlag) this.setFlag(spec.openFlag);
      },
      close: () => {
        gate.setOpen(false);
        if (spec.openFlag) this.setFlag(spec.openFlag, false);
      },
    };
  }

  decor(marker: string, kind: DecorKind): void {
    const p = this.map.marker(marker);
    this.entities.push(new Decor(p.tx * TILE + TILE / 2, p.ty * TILE + TILE / 2, kind));
  }

  decorEach(marker: string, kinds: Array<DecorKind | null>): Array<ActorHandle | null> {
    return this.map.markerAll(marker).map((p, i) => {
      const kind = kinds[i];
      if (!kind) return null;
      const decor = new Decor(p.tx * TILE + TILE / 2, p.ty * TILE + TILE / 2, kind);
      this.entities.push(decor);
      return this.handle(decor);
    });
  }

  ally(spec: AllySpec): ActorHandle {
    const p = this.feet(spec.marker);
    const ally = new Ally(p.x, p.y, spec.look, spec.name, spec.talk);
    this.allies.push(ally);
    this.entities.push(ally);
    return this.handle(ally);
  }

  // WorldApi: systems

  alarm(radius: number): void {
    this.noise(this.hero.x, this.hero.y, radius, 'noise');
  }

  disable(group: string, seconds: number): void {
    for (const watcher of this.watchers) {
      if (watcher.spec.group === group) watcher.disabledTime = seconds;
    }
  }

  enterYear(prompt: string, start: number): Promise<number> {
    return this.yearPicker.open(prompt, start);
  }

  // WorldApi: player & flow

  get player(): ActorHandle {
    return this.handle(this.hero);
  }

  travel(to: EraId): Promise<void> {
    this.game.state.era = to;
    this.game.state.checkpoint = null;
    this.game.state.save();
    startTravel(this.game, this.def.id, to);
    // The world is discarded after traveling, so this never resolves.
    return new Promise(() => {});
  }

  ending(): Promise<void> {
    showEnding(this.game);
    return new Promise(() => {});
  }
}
