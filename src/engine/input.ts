export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'interact'
  | 'sneak'
  | 'throw'
  | 'cycle'
  | 'pause'
  | 'back'
  | 'mute'
  | 'skip';

/** Which controls the player used last; drives the button prompts on screen. */
export type Device = 'keyboard' | 'xbox' | 'playstation';

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
 * 0 A/Cross, 1 B/Circle, 2 X/Square, 3 Y/Triangle, 6 LT/L2, 7 RT/R2,
 * 8 View/Create, 9 Menu/Options, 12-15 D-pad.
 */
const PAD_BUTTONS: Array<[number, Action[]]> = [
  [0, ['interact']],
  [1, ['sneak', 'back']],
  [2, ['throw']],
  [3, ['cycle']],
  [6, ['sneak']],
  [7, ['throw']],
  [8, ['pause']],
  [9, ['pause', 'skip']],
  [12, ['up']],
  [13, ['down']],
  [14, ['left']],
  [15, ['right']],
];

const GLYPHS: Record<Device, Partial<Record<Action, string>>> = {
  keyboard: { interact: 'E', sneak: 'Shift', throw: 'F', cycle: 'Q', pause: 'Esc', back: 'Esc' },
  xbox: { interact: 'A', sneak: 'B', throw: 'X', cycle: 'Y', pause: 'Menu', back: 'B' },
  playstation: { interact: '✕', sneak: '○', throw: '□', cycle: '△', pause: 'Options', back: '○' },
};

const DEADZONE = 0.22;

export class Input {
  device: Device = 'keyboard';
  private readonly keysHeld = new Set<Action>();
  private padHeld = new Set<Action>();
  private readonly pressed = new Set<Action>();
  private stickX = 0;
  private stickY = 0;
  private readonly gestureListeners: Array<() => void> = [];
  /** Recently typed letters, for GTA-style cheat codes. */
  private typed = '';
  private readonly cheats = new Map<string, (cleared: ReadonlySet<Action>) => void>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      const actions = KEYMAP[e.code];
      this.notifyGesture();
      if (!e.repeat && /^[a-z]$/i.test(e.key)) this.typeLetter(e.key.toLowerCase());
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
    window.addEventListener('pointerdown', () => this.notifyGesture());
    // Avoid "stuck" keys when the window loses focus mid-press.
    window.addEventListener('blur', () => this.keysHeld.clear());
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
        this.device = /playstation|dualsense|dualshock|054c|wireless controller/i.test(pad.id) ? 'playstation' : 'xbox';
        this.notifyGesture();
      }
    }
    this.padHeld = held;
  }

  isHeld(action: Action): boolean {
    return this.keysHeld.has(action) || this.padHeld.has(action);
  }

  wasPressed(action: Action): boolean {
    return this.pressed.has(action);
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
    return GLYPHS[this.device][action] ?? action;
  }

  /** Replaces {interact}, {sneak}, {throw}, {cycle} and {pause} with the current device's buttons. */
  format(text: string): string {
    return text.replace(/\{(interact|sneak|throw|cycle|pause|back)\}/g, (_, action: Action) => this.glyph(action));
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

  endFrame(): void {
    this.pressed.clear();
  }

  private notifyGesture(): void {
    for (const listener of this.gestureListeners) listener();
  }
}
