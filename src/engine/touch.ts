import { onLangChange, t, type Text } from '../i18n/index.ts';
import type { Action, HotbarRect, Input } from './input.ts';
import { VIEW_W } from './screen.ts';

/** A second tap this soon (ms) after the last one is what makes iOS Safari zoom in. */
const DOUBLE_TAP_MS = 350;

/** Joystick travel in CSS pixels; dragging further than this is full tilt. */
const STICK_RADIUS = 42;
const STICK_DEADZONE = 0.12;

/** Gamepad-style face buttons, lettered like the touch glyphs in `input.ts`. */
const BUTTONS: Array<{ letter: string; caption: Text; slot: string; actions: Action[] }> = [
  { letter: 'A', caption: 'Use', slot: 'a', actions: ['interact'] },
  { letter: 'B', caption: 'Sneak', slot: 'b', actions: ['sneak'] },
  { letter: 'X', caption: 'Item', slot: 'x', actions: ['throw'] },
  { letter: 'Y', caption: 'Swap', slot: 'y', actions: ['cycle'] },
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
  /** Invisible strip over the item bar drawn on the canvas: tapping a slot picks that item. */
  private readonly hotbar: HTMLDivElement;
  private readonly parent: HTMLElement;
  private hotbarKey = '';
  private stickPointer: number | null = null;
  private originX = 0;
  private originY = 0;
  private shown = false;

  constructor(parent: HTMLElement, input: Input) {
    this.input = input;
    this.parent = parent;
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
    const captions: Array<{ node: HTMLElement; text: Text }> = [];
    for (const spec of BUTTONS) {
      const button = this.button(`touch-btn touch-${spec.slot}`, spec.actions);
      const caption = el('span', 'touch-caption');
      captions.push({ node: caption, text: spec.caption });
      button.append(el('span', 'touch-letter', spec.letter), caption);
      pad.append(button);
    }

    const system = el('div', 'touch-system');
    const menu = this.button('touch-sys', ['pause', 'skip', 'back']);
    captions.push({ node: menu, text: 'Menu' });
    const relabel = (): void => captions.forEach(({ node, text }) => (node.textContent = t(text)));
    relabel();
    onLangChange(relabel);
    system.append(menu);
    if (document.fullscreenEnabled) {
      const full = el('button', 'touch-sys', '⛶');
      full.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        void toggleFullscreen();
      });
      system.prepend(full);
    }

    this.hotbar = el('div', 'touch-hotbar');
    this.hotbar.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const bar = this.input.hotbar;
      if (!bar) return;
      const rect = this.hotbar.getBoundingClientRect();
      const slot = Math.floor(((e.clientX - rect.left) / rect.width) * bar.count);
      this.input.touchSlot(Math.max(0, Math.min(bar.count - 1, slot)));
    });

    this.root.append(zone, pad, system, this.hotbar);
    // Long presses would otherwise open the browser's context menu or text selection.
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    parent.append(this.root);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.release();
    });
    preventZoom();
    this.sync();
  }

  /** Shows the controls while touch is the active device. Call once per frame. */
  sync(): void {
    this.placeHotbar(this.input.hotbar);
    const show = this.input.device === 'touch';
    if (show === this.shown) return;
    this.shown = show;
    this.root.classList.toggle('shown', show);
    if (!show) this.release();
  }

  /** Lays the tappable strip over the item bar, wherever the scaled canvas puts it. */
  private placeHotbar(bar: HotbarRect | null): void {
    const canvas = this.parent.querySelector('canvas.ui');
    const rect = canvas?.getBoundingClientRect();
    const key = bar && rect ? `${bar.x},${bar.y},${bar.slotW},${bar.h},${bar.count},${rect.left},${rect.top},${rect.width}` : '';
    if (key === this.hotbarKey) return;
    this.hotbarKey = key;
    this.hotbar.style.display = key ? 'block' : 'none';
    if (!bar || !rect) return;
    const scale = rect.width / VIEW_W;
    this.hotbar.style.left = `${rect.left + bar.x * scale}px`;
    this.hotbar.style.top = `${rect.top + bar.y * scale}px`;
    this.hotbar.style.width = `${bar.slotW * bar.count * scale}px`;
    this.hotbar.style.height = `${bar.h * scale}px`;
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

/**
 * Phones must never zoom the page: a double tap or a pinch that slipped through could not be undone
 * (the whole screen is joystick and buttons) and left the game stuck magnified. The viewport meta
 * already forbids scaling; on top of that, cancel a second tap that comes too quickly (iOS Safari
 * double-tap zoom, where `touch-action` isn't always honored) and Safari's own pinch gesture.
 * The on-screen buttons work from pointer events, so cancelling the touchend never loses a press.
 */
function preventZoom(): void {
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (event) => {
      if (event.timeStamp - lastTouchEnd < DOUBLE_TAP_MS && event.cancelable) event.preventDefault();
      lastTouchEnd = event.timeStamp;
    },
    { passive: false },
  );
  const cancel = (event: Event): void => event.preventDefault();
  document.addEventListener('gesturestart', cancel, { passive: false });
  document.addEventListener('dblclick', cancel, { passive: false });
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
