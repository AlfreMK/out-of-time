import { AudioEngine } from '../engine/audio.ts';
import { Input } from '../engine/input.ts';
import { Screen, VIEW_H, VIEW_W } from '../engine/screen.ts';
import { TouchControls } from '../engine/touch.ts';
import { GameState } from './state.ts';

export interface Scene {
  /** Called every time the scene becomes active. */
  enter?(): void;
  update(dt: number): void;
  draw(screen: Screen, time: number): void;
}

const MAX_DT = 1 / 20;

export class Game {
  readonly screen: Screen;
  readonly input = new Input();
  readonly audio = new AudioEngine();
  private readonly touch: TouchControls;
  state = new GameState();
  /** Debug cheat, toggled by typing "letmetest". Never saved. */
  godMode = false;
  private scene: Scene | null = null;
  private pending: Scene | null = null;
  private fadeAlpha = 0;
  private fadeDir: -1 | 0 | 1 = 0;
  private fadeSpeed = 2;
  private last = 0;
  private time = 0;

  constructor(parent: HTMLElement) {
    this.screen = new Screen(parent);
    this.touch = new TouchControls(parent, this.input);
    this.input.onGesture(() => this.audio.unlock());
    this.input.onCheat('letmetest', (cleared) => {
      this.godMode = !this.godMode;
      // Typing the code pressed M once; undo that mute toggle if it already happened.
      if (!cleared.has('mute')) this.audio.toggleMute();
      this.audio.sfx(this.godMode ? 'success' : 'error');
    });
  }

  start(scene: Scene): void {
    this.scene = scene;
    scene.enter?.();
    requestAnimationFrame((now) => {
      this.last = now;
      requestAnimationFrame(this.frame);
    });
  }

  /** Fades to black, swaps scenes, and fades back in. */
  switchTo(scene: Scene, seconds = 0.6): void {
    this.pending = scene;
    this.fadeDir = 1;
    this.fadeSpeed = 1 / Math.max(0.05, seconds / 2);
  }

  get transitioning(): boolean {
    return this.fadeDir !== 0;
  }

  private readonly frame = (now: number): void => {
    const dt = Math.min(MAX_DT, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.input.poll();
    this.touch.sync();

    if (this.input.wasPressed('mute')) this.audio.toggleMute();

    if (this.fadeDir === 1) {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + dt * this.fadeSpeed);
      if (this.fadeAlpha >= 1 && this.pending) {
        this.scene = this.pending;
        this.pending = null;
        // A train rumbling in the world left behind mustn't follow into the next scene.
        this.audio.train(0);
        this.scene.enter?.();
        this.fadeDir = -1;
      }
    } else if (this.fadeDir === -1) {
      this.fadeAlpha = Math.max(0, this.fadeAlpha - dt * this.fadeSpeed);
      if (this.fadeAlpha <= 0) this.fadeDir = 0;
    }

    // Scenes are frozen while fading out so nothing happens behind the curtain.
    if (this.scene && this.fadeDir !== 1) this.scene.update(dt);

    this.screen.beginFrame();
    // The scene redraws its item bar (if it has one) and reports where it is.
    this.input.hotbar = null;
    this.scene?.draw(this.screen, this.time);
    if (this.fadeAlpha > 0) {
      this.screen.ui.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      this.screen.ui.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    this.input.endFrame();
    requestAnimationFrame(this.frame);
  };
}
