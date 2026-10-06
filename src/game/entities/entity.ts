import type { EmoteKind } from '../looks.ts';
import type { World } from '../world.ts';
import { tr } from '../../i18n/index.ts';

export interface SolidBox {
  /** Half width / half height of the blocking box, centered on (x, y + offsetY). */
  hw: number;
  hh: number;
  offsetY?: number;
}

interface MoveTarget {
  x: number;
  y: number;
  speed: number;
  resolve: () => void;
}

/**
 * Base class for everything that lives in the world. (x, y) is the point where
 * the entity touches the ground, in map pixels (16 per tile). Entities only hold
 * state; the 3D views in src/render read it every frame.
 */
export abstract class Entity {
  x = 0;
  y = 0;
  solid: SolidBox | null = null;
  removed = false;
  /** When set, the player can interact with this entity and sees this label (see `promptLabel`). */
  interactLabel: string | null = null;
  /** Height of the character in map pixels, used to place emotes and prompts. */
  height = 18;
  facingLeft = false;
  /** Advances while the entity walks; drives walk cycles. */
  animTime = 0;
  protected scriptedMove: MoveTarget | null = null;

  /** The interact label as the player reads it, in their language. */
  promptLabel(): string {
    return this.interactLabel ? tr(this.interactLabel) : '';
  }
  private emoteKind: EmoteKind | null = null;
  private emoteTime = 0;

  update(dt: number, _world: World): void {
    this.updateScriptedMove(dt);
    this.updateEmote(dt);
  }

  interact?(world: World): Promise<void> | void;

  /** Called when the world resets after the player is caught. */
  reset?(): void;

  get isScriptMoving(): boolean {
    return this.scriptedMove !== null;
  }

  moveToPoint(x: number, y: number, speed = 50): Promise<void> {
    this.scriptedMove?.resolve();
    return new Promise((resolve) => {
      this.scriptedMove = { x, y, speed, resolve };
    });
  }

  /** Returns true while moving. */
  protected updateScriptedMove(dt: number): boolean {
    const move = this.scriptedMove;
    if (!move) return false;
    const dx = move.x - this.x;
    const dy = move.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = move.speed * dt;
    if (dist <= step) {
      this.x = move.x;
      this.y = move.y;
      this.scriptedMove = null;
      move.resolve();
      return false;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    if (Math.abs(dx) > 0.5) this.facingLeft = dx < 0;
    this.animTime += dt;
    return true;
  }

  emote(kind: EmoteKind, seconds = 1.2): void {
    this.emoteKind = kind;
    this.emoteTime = seconds;
  }

  protected updateEmote(dt: number): void {
    if (this.emoteTime > 0) this.emoteTime -= dt;
  }

  /** The emote currently shown above this entity, if any. */
  get currentEmote(): EmoteKind | null {
    return this.emoteTime > 0 ? this.emoteKind : null;
  }

}
