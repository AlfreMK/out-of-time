export type SfxName =
  | 'blip'
  | 'select'
  | 'step'
  | 'pickup'
  | 'roar'
  | 'growl'
  | 'clang'
  | 'alarm'
  | 'error'
  | 'warp'
  | 'boom'
  | 'success'
  | 'bark'
  | 'crack'
  | 'throw'
  | 'thud'
  | 'spotted'
  | 'suspect'
  | 'hammer'
  | 'rumble'
  | 'chirp'
  | 'heal'
  | 'hop'
  | 'whistle'
  | 'horn'
  | 'shot'
  | 'zap'
  | 'hack'
  | 'beep'
  | 'door'
  | 'chime'
  | 'jingle'
  | 'trainhorn'
  | 'clack';

/** One music theme per environment; worlds switch between them as you walk around. */
export type MusicTheme =
  | 'none'
  | 'lab'
  | 'jungle'
  | 'forest'
  | 'cave'
  | 'mountain'
  | 'village'
  | 'castle'
  | 'tension'
  | 'araucania'
  | 'fort'
  | 'cyber'
  | 'tower'
  | 'ruins'
  | 'ending';

type Ambience = 'wind' | 'rain' | 'jungle' | 'hum' | 'fire';
type Sparkle = 'birds' | 'drips' | 'insects' | 'condor';

interface Voice {
  /** MIDI notes, 0 = rest, one per step (eighth notes). */
  notes: number[];
  wave: OscillatorType;
  vol: number;
  /** Note length in steps. */
  length?: number;
  /** 'pluck' decays quickly, 'pad' swells in and out, 'tone' is in between. */
  shape?: 'pluck' | 'pad' | 'tone';
  /** Second oscillator detuned by this many cents, for a fuller sound. */
  detune?: number;
  /** Lowpass cutoff in Hz. */
  cutoff?: number;
}

interface Pattern {
  bpm: number;
  voices: Voice[];
  /** Percussion lines, one character per step: 'x' hit, 'o' soft hit, '.' rest. */
  kick?: string;
  snare?: string;
  hat?: string;
  /** Low tom, e.g. the Mapuche kultrun. */
  tom?: string;
  ambience?: Ambience[];
  sparkle?: Sparkle;
}

const r = (n: number): number[] => Array<number>(n).fill(0);

const PATTERNS: Record<Exclude<MusicTheme, 'none'>, Pattern> = {
  // Clean synth arpeggio for the lab and menus.
  lab: {
    bpm: 100,
    voices: [
      { notes: [69, 0, 72, 76, 0, 72, 69, 0, 67, 0, 71, 74, 0, 71, 67, 0], wave: 'square', vol: 0.022, shape: 'pluck', cutoff: 2400 },
      { notes: [45, ...r(7), 43, ...r(7)], wave: 'triangle', vol: 0.06, length: 7 },
      { notes: [57, ...r(15)], wave: 'sawtooth', vol: 0.012, length: 16, shape: 'pad', detune: 12, cutoff: 900 },
    ],
    hat: '..o...o...o...o.',
  },
  // Open Cretaceous floodplain: hollow wooden plucks, hand drums and birds.
  jungle: {
    bpm: 88,
    voices: [
      { notes: [62, 0, 0, 65, 67, 0, 0, 0, 69, 0, 67, 0, 65, 0, 0, 0, 62, 0, 0, 60, 62, 0, 0, 0, ...r(8)], wave: 'triangle', vol: 0.05, shape: 'pluck' },
      { notes: [74, ...r(15), 72, ...r(7), 69, ...r(7)], wave: 'sine', vol: 0.025, length: 3 },
      { notes: [38, ...r(7), 36, ...r(7), 38, ...r(7), 33, ...r(7)], wave: 'triangle', vol: 0.07, length: 6 },
    ],
    tom: 'x.......x...x...x.......x.x.....',
    hat: '..o...o...o...o...o...o...o...o.',
    ambience: ['jungle'],
    sparkle: 'birds',
  },
  // Deep forest where the raptors hunt: a nervous low ostinato.
  forest: {
    bpm: 96,
    voices: [
      { notes: [38, 0, 41, 0, 38, 0, 43, 0, 38, 0, 41, 0, 38, 0, 44, 43], wave: 'triangle', vol: 0.06, shape: 'pluck' },
      { notes: [...r(8), 74, 0, 0, 0, 73, ...r(3)], wave: 'sine', vol: 0.02, length: 3 },
      { notes: [50, ...r(15)], wave: 'sawtooth', vol: 0.01, length: 16, shape: 'pad', cutoff: 600 },
    ],
    tom: 'x.....x.........x.....x.....x...',
    ambience: ['jungle'],
    sparkle: 'insects',
  },
  // The T-Rex cave: a low drone and water dripping in the dark.
  cave: {
    bpm: 56,
    voices: [
      { notes: [26, ...r(15)], wave: 'sine', vol: 0.09, length: 16, shape: 'pad' },
      { notes: [33, ...r(15)], wave: 'sine', vol: 0.04, length: 16, shape: 'pad' },
      { notes: [...r(12), 62, ...r(11), 61, ...r(7)], wave: 'sine', vol: 0.015, length: 4 },
    ],
    sparkle: 'drips',
  },
  // The mountain pass: wind and a few lonely notes.
  mountain: {
    bpm: 70,
    voices: [
      { notes: [69, ...r(7), 67, ...r(7), 64, ...r(7), 62, ...r(7)], wave: 'sine', vol: 0.025, length: 6, shape: 'pad' },
      { notes: [38, ...r(15), 36, ...r(15)], wave: 'triangle', vol: 0.05, length: 14 },
    ],
    ambience: ['wind'],
  },
  // Medieval village dance in D dorian: lute, recorder, drone and tambourine.
  village: {
    bpm: 116,
    voices: [
      { notes: [62, 0, 65, 67, 69, 0, 67, 65, 64, 0, 60, 62, 64, 0, 0, 0, 62, 0, 65, 67, 69, 0, 72, 71, 69, 67, 65, 64, 62, 0, 0, 0], wave: 'sine', vol: 0.04, length: 1.5 },
      { notes: [50, 57, 62, 57, 50, 57, 62, 57, 48, 55, 60, 55, 48, 55, 60, 55], wave: 'triangle', vol: 0.035, shape: 'pluck' },
      { notes: [38, ...r(15)], wave: 'sawtooth', vol: 0.012, length: 16, shape: 'pad', cutoff: 500, detune: 6 },
    ],
    tom: 'x.......x.......',
    hat: '..x...x...x...xx',
  },
  // Sneaking through the castle: sparse plucks and a chant-like pad in A aeolian.
  castle: {
    bpm: 80,
    voices: [
      { notes: [45, 0, 0, 48, 0, 0, 52, 0, 45, 0, 0, 48, 0, 0, 53, 52], wave: 'triangle', vol: 0.05, shape: 'pluck' },
      { notes: [69, ...r(7), 67, ...r(7), 65, ...r(7), 64, ...r(7)], wave: 'sine', vol: 0.02, length: 7, shape: 'pad' },
      { notes: [33, ...r(15)], wave: 'sawtooth', vol: 0.012, length: 16, shape: 'pad', cutoff: 400 },
    ],
    tom: 'x...............x.......x.......',
    ambience: ['fire'],
  },
  // Alarm!
  tension: {
    bpm: 132,
    voices: [
      { notes: [...r(8), 63, 0, 0, 0, 62, 0, 0, 0], wave: 'sawtooth', vol: 0.015, cutoff: 1800 },
      { notes: [38, 0, 38, 0, 38, 0, 38, 0, 39, 0, 39, 0, 39, 0, 39, 0], wave: 'square', vol: 0.025, shape: 'pluck', cutoff: 900 },
    ],
    kick: 'x...x...x...x.x.',
    hat: '.x.x.x.x.x.x.x.x',
  },
  // Araucanía: steady kultrun pulse, a trutruka horn drone and pifilka whistles.
  araucania: {
    bpm: 84,
    voices: [
      { notes: [38, ...r(15), 38, ...r(11), 45, ...r(3)], wave: 'sawtooth', vol: 0.02, length: 10, shape: 'pad', cutoff: 500 },
      { notes: [...r(6), 86, 0, ...r(14), 86, 86, ...r(8)], wave: 'sine', vol: 0.018, length: 0.7 },
      { notes: [62, 0, 0, 0, 64, 0, 62, 0, 57, ...r(7), 62, 0, 0, 0, 64, 0, 67, 0, 64, ...r(7)], wave: 'triangle', vol: 0.03, shape: 'pluck' },
    ],
    tom: 'x..x..x.x..x..x.',
    ambience: ['wind'],
    sparkle: 'birds',
  },
  // A 16th-century Spanish fort: vihuela-like plucks in E phrygian.
  fort: {
    bpm: 92,
    voices: [
      { notes: [52, 53, 52, 0, 55, 53, 52, 0, 50, 52, 53, 0, 52, 0, 0, 0], wave: 'triangle', vol: 0.045, shape: 'pluck' },
      { notes: [40, ...r(7), 41, ...r(7)], wave: 'triangle', vol: 0.06, length: 7 },
      { notes: [64, ...r(15)], wave: 'sine', vol: 0.012, length: 16, shape: 'pad' },
    ],
    tom: 'x.......x...x...',
    ambience: ['wind'],
  },
  // Neo-Tokyo: rainy synthwave.
  cyber: {
    bpm: 108,
    voices: [
      { notes: [45, 45, 57, 45, 45, 57, 45, 57, 41, 41, 53, 41, 41, 53, 41, 53, 43, 43, 55, 43, 43, 55, 43, 55, 40, 40, 52, 40, 40, 52, 40, 52], wave: 'sawtooth', vol: 0.03, shape: 'pluck', cutoff: 1100 },
      { notes: [69, ...r(7), 65, ...r(7), 67, ...r(7), 64, ...r(7)], wave: 'sawtooth', vol: 0.014, length: 8, shape: 'pad', detune: 14, cutoff: 1600 },
      { notes: [...r(4), 76, 0, 74, 0, ...r(12), 72, 0, 71, ...r(9)], wave: 'square', vol: 0.012, length: 2, cutoff: 2600 },
    ],
    kick: 'x...x...x...x...',
    snare: '....x.......x...',
    hat: 'o.o.o.o.o.o.o.o.',
    ambience: ['rain', 'hum'],
  },
  // Inside the Chronos Corp tower: a tense, clinical pulse.
  tower: {
    bpm: 120,
    voices: [
      { notes: [33, 0, 33, 33, 0, 33, 0, 33, 33, 0, 33, 33, 0, 36, 0, 35], wave: 'square', vol: 0.02, shape: 'pluck', cutoff: 700 },
      { notes: [81, ...r(15), 80, ...r(15)], wave: 'sine', vol: 0.012, length: 12, shape: 'pad' },
    ],
    kick: 'x.......x.......',
    hat: '..o...o...o...o.',
    ambience: ['hum'],
  },
  // The abandoned, drought-stricken city: wind and a sparse, sad melody.
  ruins: {
    bpm: 66,
    voices: [
      { notes: [64, 0, 67, 0, 69, ...r(3), 67, 0, 64, 0, 62, ...r(3), 60, 0, 62, 0, 64, ...r(5), ...r(8)], wave: 'sine', vol: 0.035, shape: 'pluck', length: 3 },
      { notes: [40, ...r(15), 36, ...r(15)], wave: 'triangle', vol: 0.05, length: 14, shape: 'pad' },
    ],
    ambience: ['wind'],
    sparkle: 'condor',
  },
  // Home.
  ending: {
    bpm: 92,
    voices: [
      { notes: [72, 0, 74, 0, 76, 0, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0, 69, 0, 71, 0, 72, 0, 74, 0, 72, ...r(7)], wave: 'triangle', vol: 0.045, length: 1.8 },
      { notes: [48, ...r(7), 53, ...r(7), 45, ...r(7), 55, ...r(7)], wave: 'sawtooth', vol: 0.016, length: 8, shape: 'pad', detune: 10, cutoff: 1200 },
      { notes: [36, ...r(7), 41, ...r(7), 33, ...r(7), 43, ...r(7)], wave: 'triangle', vol: 0.06, length: 7 },
    ],
    tom: 'x.......x.......',
    hat: '....o.......o...',
  },
};

const midiToHz = (note: number): number => 440 * Math.pow(2, (note - 69) / 12);
const FADE = 0.8;

/** Tiny procedural sound engine on top of WebAudio — no audio files needed. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly beds = new Map<Ambience, { gain: GainNode; volume: number }>();
  /** The Yamanote's roar: a low rumble whose loudness the world sets as the train comes and goes. */
  private trainBed: GainNode | null = null;
  /** Where the sound effect being played goes (a gain for a distant one), or null for the master bus. */
  private out: GainNode | null = null;
  private theme: MusicTheme = 'none';
  private playing: MusicTheme = 'none';
  private switchAt = 0;
  private step = 0;
  private nextNoteTime = 0;
  private timer: number | undefined;
  muted = false;

  /** Must be called from a user gesture (key press or click). Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);
      this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.createBeds();
      this.trainBed = this.createRumble();
      this.switchAt = ctx.currentTime;
      this.timer = window.setInterval(() => this.schedule(), 50);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  /** Crossfades to another theme (fades out, swaps the pattern, fades back in). */
  music(theme: MusicTheme): void {
    if (theme === this.theme) return;
    this.theme = theme;
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    const now = ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, now);
    this.musicBus.gain.linearRampToValueAtTime(0, now + FADE);
    this.switchAt = now + FADE;
  }

  private createBeds(): void {
    const ctx = this.ctx!;
    const filters: Record<Ambience, { type: BiquadFilterType; freq: number; q?: number; vol: number }> = {
      wind: { type: 'bandpass', freq: 500, q: 0.6, vol: 0.05 },
      rain: { type: 'highpass', freq: 2500, vol: 0.05 },
      jungle: { type: 'bandpass', freq: 3200, q: 2, vol: 0.012 },
      hum: { type: 'lowpass', freq: 140, vol: 0.06 },
      fire: { type: 'bandpass', freq: 900, q: 0.5, vol: 0.012 },
    };
    for (const [name, f] of Object.entries(filters) as Array<[Ambience, (typeof filters)[Ambience]]>) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = f.type;
      filter.frequency.value = f.freq;
      if (f.q) filter.Q.value = f.q;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.musicBus!);
      src.start();
      this.beds.set(name, { gain, volume: f.vol });
    }
  }

  private createRumble(): GainNode {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    // Straight to the master bus: music crossfades must not cut the train off.
    src.connect(filter).connect(gain).connect(this.master!);
    src.start();
    return gain;
  }

  /** How loud the passing train is, 0..1. Called every frame while a train runs on the map. */
  train(level: number): void {
    if (!this.ctx || !this.trainBed) return;
    this.trainBed.gain.setTargetAtTime(level * 0.3, this.ctx.currentTime, 0.12);
  }

  /** Plays a sound effect; `volume` below 1 makes it sound farther away. */
  sfx(name: SfxName, volume = 1): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    // Quieter sounds go through their own gain on the way to the master bus.
    if (volume < 1) {
      this.out = ctx.createGain();
      this.out.gain.value = Math.max(0, volume);
      this.out.connect(this.master!);
    }
    try {
      this.play(name, t);
    } finally {
      this.out = null;
    }
  }

  private play(name: SfxName, t: number): void {
    switch (name) {
      case 'blip':
        this.tone(t, 880, 0.04, 'square', 0.03);
        break;
      case 'select':
        this.tone(t, 660, 0.06, 'square', 0.05);
        this.tone(t + 0.06, 990, 0.08, 'square', 0.05);
        break;
      case 'step':
        this.noise(t, 0.04, 0.03, 900);
        break;
      case 'pickup':
        [660, 880, 1320].forEach((f, i) => this.tone(t + i * 0.07, f, 0.1, 'square', 0.05));
        break;
      case 'success':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.1, f, 0.18, 'triangle', 0.08));
        break;
      case 'heal':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(t + i * 0.09, f, 0.2, 'sine', 0.07));
        break;
      case 'roar':
        this.noise(t, 1.4, 0.35, 380, 120);
        this.tone(t, 110, 1.3, 'sawtooth', 0.12, 55);
        break;
      case 'growl':
        this.noise(t, 0.5, 0.12, 300, 150);
        this.tone(t, 90, 0.5, 'sawtooth', 0.05, 70);
        break;
      case 'clang':
        this.tone(t, 1250, 0.25, 'square', 0.06, 900);
        this.tone(t, 1870, 0.2, 'triangle', 0.05);
        this.noise(t, 0.06, 0.08, 4000);
        break;
      case 'hammer':
        this.tone(t, 900, 0.15, 'square', 0.06, 600);
        this.noise(t, 0.05, 0.1, 3000);
        break;
      case 'alarm':
        for (let i = 0; i < 4; i++) {
          this.tone(t + i * 0.3, 880, 0.14, 'square', 0.05);
          this.tone(t + i * 0.3 + 0.15, 660, 0.14, 'square', 0.05);
        }
        break;
      case 'error':
        this.tone(t, 220, 0.18, 'square', 0.08);
        this.tone(t + 0.2, 165, 0.3, 'square', 0.08);
        break;
      case 'warp':
        this.tone(t, 120, 2.2, 'sawtooth', 0.06, 1800);
        this.noise(t, 2.2, 0.06, 2000, 6000);
        break;
      case 'boom':
        this.noise(t, 1.6, 0.6, 1200, 60);
        this.tone(t, 70, 1.2, 'sine', 0.3, 30);
        break;
      case 'rumble':
        this.noise(t, 1.0, 0.25, 200, 80);
        break;
      case 'bark':
        this.tone(t, 420, 0.08, 'sawtooth', 0.09, 260);
        this.tone(t + 0.14, 440, 0.08, 'sawtooth', 0.09, 260);
        break;
      case 'crack':
        this.noise(t, 0.09, 0.2, 2500);
        this.tone(t, 300, 0.05, 'square', 0.05, 150);
        break;
      case 'throw':
        this.noise(t, 0.12, 0.05, 1500, 3000);
        break;
      case 'thud':
        this.noise(t, 0.12, 0.15, 600, 200);
        break;
      case 'spotted':
        this.tone(t, 523, 0.08, 'square', 0.08);
        this.tone(t + 0.08, 784, 0.25, 'square', 0.08);
        break;
      case 'suspect':
        this.tone(t, 440, 0.06, 'triangle', 0.04, 520);
        break;
      case 'chirp':
        this.tone(t, 1400, 0.06, 'sine', 0.05, 1900);
        this.tone(t + 0.08, 1500, 0.06, 'sine', 0.05, 2000);
        break;
      case 'hop':
        this.tone(t, 300, 0.12, 'square', 0.04, 700);
        break;
      case 'whistle':
        // A pifilka: one shrill, breathy note.
        this.tone(t, 2350, 0.35, 'sine', 0.06, 2300);
        this.noise(t, 0.3, 0.02, 5000);
        this.tone(t + 0.45, 2350, 0.25, 'sine', 0.05);
        break;
      case 'horn':
        // A trutruka: a long, low, brassy call.
        this.tone(t, 147, 1.1, 'sawtooth', 0.08, 165);
        this.tone(t, 294, 1.1, 'sawtooth', 0.03, 330);
        break;
      case 'shot':
        this.noise(t, 0.5, 0.45, 1800, 120);
        this.tone(t, 90, 0.3, 'square', 0.12, 40);
        break;
      case 'zap':
        this.tone(t, 1800, 0.18, 'sawtooth', 0.05, 200);
        break;
      case 'hack':
        [1200, 1600, 900, 2000, 1400].forEach((f, i) => this.tone(t + i * 0.05, f, 0.04, 'square', 0.03));
        break;
      case 'beep':
        this.tone(t, 1046, 0.08, 'sine', 0.05);
        this.tone(t + 0.12, 1046, 0.08, 'sine', 0.05);
        break;
      case 'door':
        this.noise(t, 0.4, 0.08, 700, 200);
        this.tone(t, 180, 0.35, 'triangle', 0.05, 120);
        break;
      case 'chime':
        // The two-note "pin-pon" that opens station announcements in Japan.
        this.tone(t, 1319, 0.7, 'sine', 0.06);
        this.tone(t + 0.35, 1047, 0.9, 'sine', 0.06);
        break;
      case 'jingle': {
        // A short, bright platform melody in the style of the ones Japanese stations play as a train
        // comes in (an original tune: the real ones are copyrighted compositions).
        const notes = [76, 79, 84, 83, 81, 79, 81, 0, 84, 83, 79, 84];
        notes.forEach((note, i) => {
          if (note) this.bell(t + i * 0.2, midiToHz(note), i === notes.length - 1 ? 1.2 : 0.5, 0.05);
        });
        break;
      }
      case 'trainhorn':
        // The electronic horn of a modern commuter train: a short two-tone "pwaan".
        this.tone(t, 523, 0.55, 'sawtooth', 0.025);
        this.tone(t, 659, 0.55, 'square', 0.015);
        this.tone(t + 0.5, 523, 0.7, 'sawtooth', 0.025, 494);
        this.tone(t + 0.5, 659, 0.7, 'square', 0.015, 622);
        break;
      case 'clack':
        // Wheels over a rail joint: "gatan-goton".
        this.noise(t, 0.08, 0.12, 1400, 400);
        this.tone(t, 90, 0.1, 'triangle', 0.08, 60);
        this.noise(t + 0.14, 0.08, 0.1, 1200, 400);
        this.tone(t + 0.14, 80, 0.1, 'triangle', 0.07, 55);
        break;
    }
  }

  /** A vibraphone-like note: a sine with a couple of fast-fading overtones. */
  private bell(t: number, freq: number, dur: number, vol: number): void {
    this.tone(t, freq, dur, 'sine', vol);
    this.tone(t, freq * 2, dur * 0.5, 'sine', vol * 0.3);
    this.tone(t, freq * 3, dur * 0.25, 'triangle', vol * 0.1);
  }

  private tone(t: number, freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, bus?: AudioNode): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(bus ?? this.out ?? this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(t: number, dur: number, vol: number, freq: number, freqTo?: number, bus?: AudioNode): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t);
    if (freqTo) filter.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(gain).connect(bus ?? this.out ?? this.master!);
    src.start(t, Math.random());
    src.stop(t + dur + 0.02);
  }

  /** A music note with an envelope shape and optional detuned layer and filter. */
  private note(t: number, voice: Voice, midi: number, stepDur: number): void {
    const ctx = this.ctx!;
    const dur = stepDur * (voice.length ?? 1.8);
    const shape = voice.shape ?? 'tone';
    const gain = ctx.createGain();
    const attack = shape === 'pad' ? dur * 0.35 : 0.01;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(voice.vol, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (shape === 'pluck' ? Math.min(dur, 0.35) : dur));
    let out: AudioNode = gain;
    if (voice.cutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = voice.cutoff;
      gain.connect(filter);
      out = filter;
    }
    out.connect(this.musicBus!);
    const freq = midiToHz(midi);
    for (const cents of voice.detune ? [-voice.detune, voice.detune] : [0]) {
      const osc = ctx.createOscillator();
      osc.type = voice.wave;
      osc.frequency.value = freq;
      osc.detune.value = cents;
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }

  private drum(t: number, kind: 'kick' | 'snare' | 'hat' | 'tom', soft: boolean): void {
    const v = soft ? 0.5 : 1;
    const bus = this.musicBus!;
    if (kind === 'kick') this.tone(t, 110, 0.18, 'sine', 0.16 * v, 40, bus);
    else if (kind === 'snare') this.noise(t, 0.12, 0.06 * v, 3000, 1200, bus);
    else if (kind === 'hat') this.noise(t, 0.03, 0.025 * v, 9000, undefined, bus);
    else this.tone(t, 82, 0.25, 'sine', 0.12 * v, 60, bus);
  }

  private sparkle(t: number, kind: Sparkle): void {
    const bus = this.musicBus!;
    if (kind === 'birds') {
      const f = 1800 + Math.random() * 1600;
      this.tone(t, f, 0.07, 'sine', 0.02, f * 1.3, bus);
      this.tone(t + 0.1, f * 1.1, 0.06, 'sine', 0.018, f * 1.4, bus);
    } else if (kind === 'drips') {
      const f = 1400 + Math.random() * 900;
      this.tone(t, f, 0.12, 'sine', 0.03, f * 0.6, bus);
    } else if (kind === 'insects') {
      for (let i = 0; i < 6; i++) this.tone(t + i * 0.04, 4200, 0.02, 'square', 0.006, undefined, bus);
    } else {
      this.tone(t, 900, 0.9, 'sine', 0.012, 700, bus);
    }
  }

  /** Look-ahead scheduler so music timing doesn't depend on frame rate. */
  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicBus) return;
    if (this.playing !== this.theme && ctx.currentTime >= this.switchAt) {
      this.playing = this.theme;
      this.step = 0;
      this.nextNoteTime = ctx.currentTime + 0.05;
      const pattern = this.playing === 'none' ? null : PATTERNS[this.playing];
      for (const [name, bed] of this.beds) {
        const target = pattern?.ambience?.includes(name) ? bed.volume : 0;
        bed.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.3);
      }
      this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
      this.musicBus.gain.setValueAtTime(0, ctx.currentTime);
      this.musicBus.gain.linearRampToValueAtTime(this.playing === 'none' ? 0 : 1, ctx.currentTime + FADE);
    }
    if (this.playing === 'none' || this.playing !== this.theme) return;
    const pattern = PATTERNS[this.playing];
    const stepDur = 60 / pattern.bpm / 2;
    if (this.nextNoteTime < ctx.currentTime) this.nextNoteTime = ctx.currentTime + 0.05;
    while (this.nextNoteTime < ctx.currentTime + 0.25) {
      const t = this.nextNoteTime;
      for (const voice of pattern.voices) {
        const midi = voice.notes[this.step % voice.notes.length];
        if (midi) this.note(t, voice, midi, stepDur);
      }
      for (const kind of ['kick', 'snare', 'hat', 'tom'] as const) {
        const line = pattern[kind];
        const hit = line?.[this.step % line.length];
        if (hit === 'x' || hit === 'o') this.drum(t, kind, hit === 'o');
      }
      if (pattern.sparkle && Math.random() < 0.07) this.sparkle(t, pattern.sparkle);
      this.step++;
      this.nextNoteTime += stepDur;
    }
  }

  dispose(): void {
    window.clearInterval(this.timer);
    void this.ctx?.close();
  }
}
