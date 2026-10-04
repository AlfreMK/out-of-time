import type { Action, Input } from './input.ts';

/** Joystick travel in CSS pixels; dragging further than this is full tilt. */
const STICK_RADIUS = 42;
const STICK_DEADZONE = 0.12;

/** Gamepad-style face buttons, lettered like the touch glyphs in `input.ts`. */
const BUTTONS: Array<{ letter: string; caption: string; slot: string; actions: Action[] }> = [
  { letter: 'A', caption: 'use', slot: 'a', actions: ['interact'] },
  { letter: 'B', caption: 'sneak', slot: 'b', actions: ['sneak'] },
  { letter: 'X', caption: 'item', slot: 'x', actions: ['throw'] },
  { letter: 'Y', caption: 'swap', slot: 'y', actions: ['cycle'] },
];

/**
 * On-screen controls for phones and tablets: a floating joystick on the left
 * half of the screen and A/B/X/Y buttons on the right, plus Menu (which also
 * skips cinematics, like Esc) and fullscreen. They feed the same `Input`
 * actions as the keyboard and gamepads, and only show while touch is the
 * last device used.
 */
export class TouchControls {
  private readonly input: Input;
  private readonly root: HTMLDivElement;
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private stickPointer: number | null = null;
  private originX = 0;
  private originY = 0;
  private shown = false;

  constructor(parent: HTMLElement, input: Input) {
    this.input = input;
    this.root = el('div', 'touch');
    this.root.setAttribute('aria-hidden', 'true');

    const zone = el('div', 'touch-stick-zone');
    this.base = el('div', 'touch-stick');
    this.knob = el('div', 'touch-knob');
    this.base.append(this.knob);
    zone.append(this.base);
    zone.addEventListener('pointerdown', (e) => this.stickStart(e));
    zone.addEventListener('pointermove', (e) => this.stickMove(e));
    zone.addEventListener('pointerup', (e) => this.stickEnd(e));
    zone.addEventListener('pointercancel', (e) => this.stickEnd(e));

    const pad = el('div', 'touch-pad');
    for (const spec of BUTTONS) {
      const button = this.button(`touch-btn touch-${spec.slot}`, spec.actions);
      button.append(el('span', 'touch-letter', spec.letter), el('span', 'touch-caption', spec.caption));
      pad.append(button);
    }

    const system = el('div', 'touch-system');
    const menu = this.button('touch-sys', ['pause', 'skip', 'back']);
    menu.textContent = 'Menu';
    system.append(menu);
    if (document.fullscreenEnabled) {
      const full = el('button', 'touch-sys', '⛶');
      full.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        void toggleFullscreen();
      });
      system.prepend(full);
    }

    this.root.append(zone, pad, system);
    // Long presses would otherwise open the browser's context menu or text selection.
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    parent.append(this.root);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.release();
    });
    this.sync();
  }

  /** Shows the controls while touch is the active device. Call once per frame. */
  sync(): void {
    const show = this.input.device === 'touch';
    if (show === this.shown) return;
    this.shown = show;
    this.root.classList.toggle('shown', show);
    if (!show) this.release();
  }

  private button(className: string, actions: Action[]): HTMLButtonElement {
    const button = el('button', className);
    const up = (): void => {
      button.classList.remove('down');
      this.input.touchUp(actions);
    };
    button.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      button.classList.add('down');
      this.input.touchDown(actions);
    });
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    return button;
  }

  private stickStart(e: PointerEvent): void {
    if (this.stickPointer !== null) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.stickPointer = e.pointerId;
    // The joystick appears wherever the thumb lands.
    this.originX = e.clientX;
    this.originY = e.clientY;
    this.base.style.left = `${e.clientX}px`;
    this.base.style.top = `${e.clientY}px`;
    this.base.classList.add('active');
    this.moveKnob(0, 0);
  }

  private stickMove(e: PointerEvent): void {
    if (e.pointerId !== this.stickPointer) return;
    let dx = (e.clientX - this.originX) / STICK_RADIUS;
    let dy = (e.clientY - this.originY) / STICK_RADIUS;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    this.moveKnob(dx, dy);
    if (length < STICK_DEADZONE) this.input.touchStick(0, 0);
    else this.input.touchStick(dx, dy);
  }

  private stickEnd(e: PointerEvent): void {
    if (e.pointerId !== this.stickPointer) return;
    this.stickPointer = null;
    this.base.classList.remove('active');
    this.input.touchStick(0, 0);
  }

  private moveKnob(x: number, y: number): void {
    this.knob.style.transform = `translate(${x * STICK_RADIUS}px, ${y * STICK_RADIUS}px)`;
  }

  private release(): void {
    this.stickPointer = null;
    this.base.classList.remove('active');
    for (const button of this.root.querySelectorAll('.down')) button.classList.remove('down');
    this.input.releaseTouch();
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    // Phones that allow it (Android) stay in landscape; elsewhere this simply fails.
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientation.lock?.('landscape').catch(() => undefined);
  } catch {
    // Fullscreen was refused (no user gesture, or unsupported): keep playing in the page.
  }
}
