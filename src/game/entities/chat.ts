import type { ChatSpec } from '../../eras/types.ts';
import type { World } from '../world.ts';
import type { Watcher } from './watcher.ts';

/** How close (px) the two have to stand to strike up a conversation. */
const CHAT_DISTANCE = 48;
/** Seconds between lines, and how long each speech bubble stays up. */
const LINE_GAP = 3;
const BUBBLE_TIME = 2.8;
/** Seconds of plain watching between two conversations. */
const COOLDOWN = 10;
/** A short beat before the first line, so they visibly turn to each other first. */
const OPENING = 0.6;

type Phase = 'idle' | 'talking' | 'cooldown';

/**
 * Two watchers who chat whenever both stand still close together (see `ChatSpec`).
 * State only: the speech bubbles and the narrower cones are drawn from the watchers.
 */
export class Chat {
  private readonly a: Watcher;
  private readonly b: Watcher;
  private readonly spec: ChatSpec;
  private phase: Phase = 'cooldown';
  private timer = COOLDOWN / 2;
  private talk = 0;
  private line = 0;

  constructor(a: Watcher, b: Watcher, spec: ChatSpec) {
    this.a = a;
    this.b = b;
    this.spec = spec;
  }

  /** After the player is caught: everyone back to their posts, the next conversation a while later. */
  reset(): void {
    this.release();
    this.phase = 'cooldown';
    this.timer = COOLDOWN / 2;
  }

  update(dt: number, world: World): void {
    if (world.controlsLocked) return;
    switch (this.phase) {
      case 'cooldown':
        this.timer -= dt;
        if (this.timer <= 0) this.phase = 'idle';
        break;
      case 'idle':
        if (this.calm(this.a) && this.calm(this.b) && Math.hypot(this.a.x - this.b.x, this.a.y - this.b.y) <= CHAT_DISTANCE) this.start();
        break;
      case 'talking': {
        // Anything suspicious (a glimpse, a noise sending one off to look) ends the chat at once.
        if (!this.calm(this.a) || !this.calm(this.b)) {
          this.stop();
          break;
        }
        this.timer -= dt;
        if (this.timer > 0) break;
        const lines = this.spec.talks[this.talk];
        if (this.line >= lines.length) {
          this.talk = (this.talk + 1) % this.spec.talks.length;
          this.stop();
          break;
        }
        const speaker = this.line % 2 === 0 ? this.a : this.b;
        speaker.speak(lines[this.line], BUBBLE_TIME);
        this.line++;
        this.timer = LINE_GAP;
        break;
      }
    }
  }

  /** Standing still at a post or a stop, with nothing on their mind. */
  private calm(w: Watcher): boolean {
    return w.watching && w.suspicion === 0 && w.state === 'pause' && !w.removed;
  }

  private start(): void {
    this.phase = 'talking';
    this.line = 0;
    this.timer = OPENING;
    for (const [self, other] of [[this.a, this.b], [this.b, this.a]] as const) {
      self.chatPartner = other;
      self.chatDistracted = this.spec.distracted;
    }
  }

  private stop(): void {
    this.release();
    this.phase = 'cooldown';
    this.timer = COOLDOWN;
  }

  private release(): void {
    this.a.chatPartner = null;
    this.b.chatPartner = null;
  }
}
