import { isText, t, type Text } from '../i18n/index.ts';

export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'interact'
  | 'sneak'
  | 'throw'
  | 'cycle'
  | 'prev'
  | 'pause'
  | 'back'
  | 'mute'
  | 'skip';

/** Which controls the player used last; drives the button prompts on screen. */
export type Device = 'keyboard' | 'xbox' | 'playstation' | 'touch';

const KEYMAP: Record<string, Action[]> = {
  ArrowUp: ['up'],
  KeyW: ['up'],
  ArrowDown: ['down'],
  KeyS: ['down'],
  ArrowLeft: ['left'],
  KeyA: ['left'],
  ArrowRight: ['right'],
  KeyD: ['right'],
  KeyE: ['interact'],
  Space: ['interact'],
  Enter: ['interact', 'skip'],
  ShiftLeft: ['sneak'],
  ShiftRight: ['sneak'],
  KeyF: ['throw'],
  KeyQ: ['cycle'],
  Escape: ['pause', 'skip', 'back'],
  Backspace: ['back'],
  KeyP: ['pause'],
  KeyM: ['mute'],
};

/**
 * Standard gamepad layout (Xbox / PlayStation / most others in browsers):
 * 0 A/Cross, 1 B/Circle, 2 X/Square, 3 Y/Triangle, 4 LB/L1, 5 RB/R1, 6 LT/L2, 7 RT/R2,
 * 8 View/Create, 9 Menu/Options, 12-15 D-pad.
 */
const PAD_BUTTONS: Array<[number, Action[]]> = [
  [0, ['interact']],
  [1, ['sneak', 'back']],
  [2, ['throw']],
  [3, ['cycle']],
  [4, ['prev']],
  [5, ['cycle']],
  [6, ['sneak']],
  [7, ['throw']],
  [8, ['pause']],
  [9, ['pause', 'skip']],
  [12, ['up']],
  [13, ['down']],
  [14, ['left']],
  [15, ['right']],
];

/** Letters and symbols printed on keys and buttons, the same in every language (names like "Shift" are translated). */
type ButtonSymbol = 'E' | 'F' | '1-3' | 'A' | 'B' | 'X' | 'Y' | 'LB' | 'LB/RB' | 'L1' | 'L1/R1' | '✕' | '○' | '□';

const GLYPHS: Record<Device, Partial<Record<Action, Text | ButtonSymbol>>> = {
  // Items are picked with the number keys (Q steps to the next one).
  keyboard: { interact: 'E', sneak: 'Shift', throw: 'F', cycle: '1-3', pause: 'Esc', back: 'Esc' },
  xbox: { interact: 'A', sneak: 'B', throw: 'X', cycle: 'LB/RB', prev: 'LB', pause: 'Menu', back: 'B' },
  playstation: { interact: '✕', sneak: '○', throw: '□', cycle: 'L1/R1', prev: 'L1', pause: 'Options', back: '○' },
  // The on-screen buttons are laid out and lettered like a gamepad (see TouchControls); items can also be tapped.
  touch: { interact: 'A', sneak: 'B', throw: 'X', cycle: 'Y', prev: 'Y', pause: 'Menu', back: 'Menu' },
};

/** How movement is described in tutorial text ({move}). */
const MOVE_HINT: Record<Device, Text> = {
  keyboard: 'WASD or the arrow keys',
  xbox: 'the left stick',
  playstation: 'the left stick',
  touch: 'the joystick on the left',
};

const DEADZONE = 0.22;

const padDevice = (pad: Gamepad): Device => (/playstation|dualsense|dualshock|054c|wireless controller/i.test(pad.id) ? 'playstation' : 'xbox');

/** Where the item bar is drawn, in UI pixels, so the touch controls can make its slots tappable. */
export interface HotbarRect {
  x: number;
  y: number;
  slotW: number;
  h: number;
  count: number;
}

export class Input {
  device: Device = 'keyboard';
  /** Set by the scene that draws an item bar, every frame it does (null otherwise). */
  hotbar: HotbarRect | null = null;
  /** A slot picked directly (number key or tap), until the game reads it. */
  private slotPick: number | null = null;
  private readonly keysHeld = new Set<Action>();
  private padHeld = new Set<Action>();
  private readonly touchHeld = new Set<Action>();
  private touchDirs = new Set<Action>();
  private touchX = 0;
  private touchY = 0;
  private readonly pressed = new Set<Action>();
  private stickX = 0;
  private stickY = 0;
  private readonly gestureListeners: Array<() => void> = [];
  /** Mouse wheel travel (px) not yet turned into whole lines by `wheelLines()`. */
  private wheel = 0;
  /** Recently typed letters, for GTA-style cheat codes. */
  private typed = '';
  private readonly cheats = new Map<string, (cleared: ReadonlySet<Action>) => void>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      const actions = KEYMAP[e.code];
      this.notifyGesture();
      if (!e.repeat && /^[a-z]$/i.test(e.key)) this.typeLetter(e.key.toLowerCase());
      const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (digit && !e.repeat) {
        this.device = 'keyboard';
        this.slotPick = Number(digit[1]) - 1;
        return;
      }
      if (!actions) return;
      e.preventDefault();
      this.device = 'keyboard';
      for (const action of actions) {
        if (!e.repeat) this.pressed.add(action);
        this.keysHeld.add(action);
      }
    });
    window.addEventListener('keyup', (e) => {
      for (const action of KEYMAP[e.code] ?? []) this.keysHeld.delete(action);
    });
    window.addEventListener('pointerdown', (e) => {
      // Only a real finger brings up the touch controls; a mouse click puts them away again.
      if (e.pointerType === 'touch') this.device = 'touch';
      else if (this.device === 'touch') this.device = 'keyboard';
      this.notifyGesture();
    });
    // Plugging in a controller puts the touch controls away straight away, before any button is pressed.
    window.addEventListener('gamepadconnected', (e) => {
      if (this.device === 'touch') this.device = padDevice(e.gamepad);
    });
    window.addEventListener('wheel', (e) => (this.wheel += e.deltaMode === 0 ? e.deltaY : e.deltaY * 30), { passive: true });
    // iOS only lets audio start from the end of a touch, not its start.
    window.addEventListener('touchend', () => this.notifyGesture());
    // Avoid "stuck" keys when the window loses focus mid-press.
    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.releaseTouch();
    });
    // Phones and tablets: touch is the main input and there is no mouse to hover with.
    // Touchscreen laptops report a fine, hovering pointer and start on the keyboard.
    if (window.matchMedia('(pointer: coarse) and (hover: none)').matches) this.device = 'touch';
  }

  /** An on-screen button went down. */
  touchDown(actions: readonly Action[]): void {
    this.device = 'touch';
    for (const action of actions) {
      if (!this.touchHeld.has(action)) this.pressed.add(action);
      this.touchHeld.add(action);
    }
  }

  touchUp(actions: readonly Action[]): void {
    for (const action of actions) this.touchHeld.delete(action);
  }

  /** The on-screen joystick, from -1 to 1 on each axis (0, 0 when released). It also works as a D-pad in menus. */
  touchStick(x: number, y: number): void {
    // No device switch here: releasing the stick (also on blur) must not bring the touch controls back.
    this.touchX = x;
    this.touchY = y;
    const dirs = new Set<Action>();
    if (y < -0.5) dirs.add('up');
    if (y > 0.5) dirs.add('down');
    if (x < -0.5) dirs.add('left');
    if (x > 0.5) dirs.add('right');
    for (const action of dirs) {
      if (!this.touchDirs.has(action)) this.pressed.add(action);
    }
    this.touchDirs = dirs;
  }

  releaseTouch(): void {
    this.touchHeld.clear();
    this.touchStick(0, 0);
  }

  /** Reads the first connected gamepad. Call once per frame, before game logic. */
  poll(): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const pad = [...pads].find((p): p is Gamepad => p !== null && p.connected);
    const held = new Set<Action>();
    this.stickX = 0;
    this.stickY = 0;
    if (pad) {
      for (const [index, actions] of PAD_BUTTONS) {
        if (pad.buttons[index]?.pressed) actions.forEach((a) => held.add(a));
      }
      const x = pad.axes[0] ?? 0;
      const y = pad.axes[1] ?? 0;
      const magnitude = Math.hypot(x, y);
      if (magnitude > DEADZONE) {
        // Rescale so the stick starts at 0 right outside the deadzone.
        const scale = Math.min(1, (magnitude - DEADZONE) / (1 - DEADZONE)) / magnitude;
        this.stickX = x * scale;
        this.stickY = y * scale;
        if (y < -0.5) held.add('up');
        if (y > 0.5) held.add('down');
        if (x < -0.5) held.add('left');
        if (x > 0.5) held.add('right');
      }
      for (const action of held) {
        if (!this.padHeld.has(action)) this.pressed.add(action);
      }
      if (held.size > 0) {
        this.device = padDevice(pad);
        this.notifyGesture();
      }
    }
    this.padHeld = held;
  }

  isHeld(action: Action): boolean {
    return this.keysHeld.has(action) || this.padHeld.has(action) || this.touchHeld.has(action) || this.touchDirs.has(action);
  }

  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
  }

  /** Picks an item slot directly (a tap on the item bar). */
  touchSlot(index: number): void {
    this.slotPick = index;
  }

  /** The item slot picked with a number key or a tap since the last call, if any. */
  pickedSlot(): number | null {
    const slot = this.slotPick;
    this.slotPick = null;
    return slot;
  }

  /** Consumes a press so other systems in the same frame don't react to it too. */
  consume(action: Action): boolean {
    const had = this.pressed.has(action);
    this.pressed.delete(action);
    return had;
  }

  /**
   * Movement vector. Keys give full-speed unit directions; the analog stick
   * gives a magnitude too, so a gentle tilt can creep.
   */
  get move(): { x: number; y: number; analog: boolean } {
    if (this.stickX !== 0 || this.stickY !== 0) return { x: this.stickX, y: this.stickY, analog: true };
    if (this.touchX !== 0 || this.touchY !== 0) return { x: this.touchX, y: this.touchY, analog: true };
    let x = 0;
    let y = 0;
    if (this.keysHeld.has('left') || this.padHeld.has('left')) x -= 1;
    if (this.keysHeld.has('right') || this.padHeld.has('right')) x += 1;
    if (this.keysHeld.has('up') || this.padHeld.has('up')) y -= 1;
    if (this.keysHeld.has('down') || this.padHeld.has('down')) y += 1;
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len, analog: false };
  }

  /** Label for an action's button on the current device, e.g. "E", "A" or "✕". */
  glyph(action: Action): string {
    const label = GLYPHS[this.device][action] ?? action;
    return isText(label) ? t(label) : label;
  }

  /** Replaces {interact}, {sneak}, {throw}, {cycle} and {pause} with the current device's buttons, and {move} with its movement controls. */
  format(text: string): string {
    return text
      .replace(/\{(interact|sneak|throw|cycle|prev|pause|back)\}/g, (_, action: Action) => this.glyph(action))
      .replace(/\{move\}/g, t(MOVE_HINT[this.device]));
  }

  /** Registers a cheat code: typing these letters in a row (anywhere in the game) runs the callback. */
  onCheat(code: string, callback: (cleared: ReadonlySet<Action>) => void): void {
    this.cheats.set(code.toLowerCase(), callback);
  }

  private typeLetter(letter: string): void {
    this.typed = (this.typed + letter).slice(-24);
    for (const [code, callback] of this.cheats) {
      if (!this.typed.endsWith(code)) continue;
      this.typed = '';
      // The letters of the code also triggered their normal actions; drop the ones still pending
      // and tell the callback which ones never ran.
      const cleared = new Set(this.pressed);
      this.pressed.clear();
      callback(cleared);
    }
  }

  /** Called on every key press, click or button press (browsers only allow audio after one). */
  onGesture(listener: () => void): void {
    this.gestureListeners.push(listener);
  }

  /** Whole lines scrolled with the mouse wheel since the last call (positive = down). */
  wheelLines(): number {
    const lines = Math.trunc(this.wheel / 30);
    this.wheel -= lines * 30;
    return lines;
  }

  endFrame(): void {
    this.pressed.clear();
  }

  private notifyGesture(): void {
    for (const listener of this.gestureListeners) listener();
  }
}
