import type { Facing } from '../../eras/types.ts';
import { FACING_VECTORS, TILE } from '../tilemap.ts';
import type { World } from '../world.ts';
import { Entity } from './entity.ts';

const WALK_SPEED = 62;
const SNEAK_SPEED = 30;
/** Below this stick tilt the player creeps silently, like holding the sneak button. */
const CREEP_TILT = 0.55;
/** Radius (px) of the noise made by normal footsteps. Sneaking is silent. */
export const STEP_NOISE = 36;
const HOP_TIME = 0.42;
const HOP_DISTANCE = 22;

export class Player extends Entity {
  facing: Facing = 'down';
  sneaking = false;
  hidden = false;
  moving = false;
  stun = 0;
  prevX = 0;
  prevY = 0;
  /** Height above the ground while hopping down a ledge, in pixels. */
  hopHeight = 0;
  private hop: { fromX: number; fromY: number; toX: number; toY: number; fromHeight: number; t: number } | null = null;
  private stepTimer = 0;
  readonly hw = 4;
  readonly hh = 3;

  override update(dt: number, world: World): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.moving = false;
    this.updateEmote(dt);

    if (this.hop) {
      this.updateHop(dt, world);
      return;
    }
    if (this.updateScriptedMove(dt)) {
      this.moving = true;
      const move = this.scriptedMove;
      if (move) this.faceToward(move.x - this.x, move.y - this.y);
      return;
    }

    if (world.controlsLocked) {
      this.sneaking = false;
    } else {
      this.handleInput(dt, world);
    }
    this.hidden = world.map.defAt(this.x, this.y).hide === true;
  }

  get isHopping(): boolean {
    return this.hop !== null;
  }

  private handleInput(dt: number, world: World): void {
    const input = world.game.input;
    const move = input.move;
    const tilt = Math.hypot(move.x, move.y);
    this.sneaking = input.isHeld('sneak') || (move.analog && tilt > 0 && tilt < CREEP_TILT);

    if (this.stun > 0) {
      this.stun -= dt;
      return;
    }
    if (tilt === 0) {
      this.stepTimer = Math.min(this.stepTimer, 0.1);
      return;
    }

    this.faceToward(move.x, move.y);
    const speed = (this.sneaking ? SNEAK_SPEED : WALK_SPEED) * (world.game.godMode ? 2 : 1);
    const stepX = (move.x / tilt) * speed * dt;
    const stepY = (move.y / tilt) * speed * dt;
    if (!world.isBlocked(this.x + stepX, this.y, this.hw, this.hh, this, stepX, 0)) this.x += stepX;
    if (!world.isBlocked(this.x, this.y + stepY, this.hw, this.hh, this, 0, stepY)) this.y += stepY;

    this.moving = this.x !== this.prevX || this.y !== this.prevY;
    if (!this.moving) return;
    this.animTime += dt * (this.sneaking ? 0.6 : 1);

    // Stepping onto a ledge (in its direction) hops down to the other side.
    const ledge = world.map.defAt(this.x, this.y).ledge;
    if (ledge) {
      const d = FACING_VECTORS[ledge];
      const toX = this.x + d.x * HOP_DISTANCE;
      const toY = this.y + d.y * HOP_DISTANCE;
      if (!world.isBlocked(toX, toY, this.hw, this.hh, this)) {
        this.hop = { fromX: this.x, fromY: this.y, toX, toY, fromHeight: (world.map.defAt(this.x, this.y).height ?? 0) * TILE, t: 0 };
        this.facing = ledge;
        world.game.audio.sfx('hop');
        return;
      }
    }

    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = this.sneaking ? 0.45 : 0.3;
      this.footstep(world);
    }
  }

  /** Jumping down a ledge: a short arc from the landing's height down to the ground. */
  private updateHop(dt: number, world: World): void {
    const hop = this.hop!;
    hop.t = Math.min(1, hop.t + dt / HOP_TIME);
    this.x = hop.fromX + (hop.toX - hop.fromX) * hop.t;
    this.y = hop.fromY + (hop.toY - hop.fromY) * hop.t;
    this.hopHeight = hop.fromHeight * (1 - hop.t * hop.t) + Math.sin(hop.t * Math.PI) * TILE * 0.5;
    this.moving = true;
    this.animTime += dt;
    if (hop.t >= 1) {
      this.hop = null;
      this.hopHeight = 0;
      world.game.audio.sfx('thud');
      world.burst(this.x, this.y, '#c9b78a', 8, 1);
    }
  }

  private footstep(world: World): void {
    const tile = world.map.defAt(this.x, this.y);
    if (tile.noise) {
      world.game.audio.sfx(tile.look === 'puddle' ? 'thud' : 'crack');
      world.noise(this.x, this.y, tile.noise, 'noise');
    } else if (!this.sneaking) {
      world.game.audio.sfx('step');
      world.noise(this.x, this.y, STEP_NOISE, 'step');
    }
  }

  private faceToward(dx: number, dy: number): void {
    // Keep the current facing when it still matches one of the pressed directions (smooth diagonals).
    const matches =
      (this.facing === 'left' && dx < 0) ||
      (this.facing === 'right' && dx > 0) ||
      (this.facing === 'up' && dy < 0) ||
      (this.facing === 'down' && dy > 0);
    if (matches && Math.abs(dx) > 0.2 && Math.abs(dy) > 0.2) return;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx < 0 ? 'left' : 'right';
    else if (dy !== 0) this.facing = dy < 0 ? 'up' : 'down';
  }

  /** Unit vector of the facing direction. */
  get dir(): { x: number; y: number } {
    return FACING_VECTORS[this.facing];
  }
}
