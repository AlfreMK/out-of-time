import * as THREE from 'three';
import type { Line } from '../eras/types.ts';
import { VIEW_H, VIEW_W, type Screen } from '../engine/screen.ts';
import { msg, t, type Text } from '../i18n/index.ts';
import { drawText, wrapText } from '../engine/text.ts';
import { glitchText } from '../eras/info.ts';
import type { Game, Scene } from '../game/game.ts';
import { DialogueBox, Timers } from '../game/ui.ts';
import { buildHuman, type HumanRig } from '../render/humans.ts';
import { buildLabSet, buildStrandedSet, buildTunnelSet } from '../render/sets.ts';
import { Speaker } from '../game/speakers.ts';
import { Flag } from '../game/flags.ts';

/** Short notes on the real history and science behind each era, shown in the credits. */
const NOTES: readonly Text[] = [
  'HELL CREEK, 66.5 MILLION YEARS AGO. T. rex, Triceratops, Pachycephalosaurus and the feathered Dakotaraptor really shared this landscape. Grasses had barely evolved, so ferns and horsetails covered the ground. Pachycephalosaurus domes are real; whether they were used for head-butting is still debated. Anzu, Thescelosaurus, Ankylosaurus, Edmontosaurus and Champsosaurus lived there too; oviraptorosaurs have been found fossilized brooding their nests, and dromaeosaurs left two-toed tracks.',
  'COLOGNE, 1248. The old cathedral burned that April, and in August Archbishop Konrad von Hochstaden laid the foundation stone of the one that still stands (finished in 1880). Albertus Magnus came to Cologne that year with his student Thomas Aquinas. Mercury melts at about -39 °C.',
  'ARAUCANÍA, 1553. Lautaro (Leftraru) had served Pedro de Valdivia as a groom before escaping. On December 25, 1553 he led the Mapuche to victory at the Battle of Tucapel. The foye (Drimys winteri) is sacred to the Mapuche, and its bark prevents scurvy.',
  'TOKYO, 2087 AND MADRID, 2240. Imagined futures, built on real technology: optical lattice clocks, REBCO superconductors and solid-state batteries already exist. Hachikō\'s statue has stood in Shibuya since 1948, and climate models project growing drought risk for central Spain.',
];

type Stage = 'tunnel' | 'lab' | 'stranded' | 'card' | 'credits';

/**
 * The ending, and the cliffhanger: Pike throws Andrew out of the jump home and
 * arrives in 2026 alone, wipes Test Run #47's records (the gap Yuki finds in
 * 2087) and leaves Nora with questions. Andrew lands in an unknown year.
 */
export class EndingScene implements Scene {
  private readonly game: Game;
  private readonly onDone: () => void;
  private readonly tunnel = buildTunnelSet();
  private readonly lab = buildLabSet();
  private readonly stranded = buildStrandedSet();
  private readonly camera = new THREE.PerspectiveCamera(42, VIEW_W / VIEW_H, 0.1, 120);
  private readonly tunnelCamera = new THREE.PerspectiveCamera(70, VIEW_W / VIEW_H, 0.1, 100);
  private readonly dialogue = new DialogueBox();
  private readonly timers = new Timers();
  private readonly nora = buildHuman('nora', { hair: '#2a1a14', weapon: undefined, bun: false });
  private readonly pike = buildHuman('pike');
  private readonly walking = new Set<HumanRig>();
  private stage: Stage = 'tunnel';
  private stageTime = 0;
  private creditsTime = 0;
  private started = false;
  private finished = false;

  // State animated by the script
  private tunnelSpeed = 1;
  private decoupled = false;
  private shake = 0;
  private flash = 0;
  private flashColor = '255,255,255';
  private fade = 0;
  private cardReady = false;

  constructor(game: Game, onDone: () => void) {
    this.game = game;
    this.onDone = onDone;
    this.lab.scene.add(this.nora.root, this.pike.root);
    this.nora.root.position.set(-3.6, 0, -1.6);
    this.nora.root.rotation.y = Math.PI / 2;
    this.pike.root.visible = false;
    this.lab.andrew.root.visible = false;
  }

  enter(): void {
    if (this.started) return;
    this.started = true;
    this.game.audio.music('none');
    this.game.audio.sfx('warp');
    void this.run();
  }

  private say(...lines: Line[]): Promise<void> {
    return this.dialogue.open(lines);
  }

  private wait(seconds: number): Promise<void> {
    return this.timers.wait(seconds);
  }

  private setStage(stage: Stage): void {
    this.stage = stage;
    this.stageTime = 0;
  }

  private async fadeTo(target: number, seconds: number): Promise<void> {
    const from = this.fade;
    const steps = Math.max(1, Math.round(seconds * 30));
    for (let i = 1; i <= steps; i++) {
      await this.wait(seconds / steps);
      this.fade = from + (target - from) * (i / steps);
    }
  }

  /** Walks a character in a straight line to (x, z), facing where it goes. */
  private async walk(rig: HumanRig, x: number, z: number, speed = 1.6): Promise<void> {
    const p = rig.root.position;
    rig.root.rotation.y = Math.atan2(x - p.x, z - p.z);
    this.walking.add(rig);
    for (;;) {
      const dx = x - p.x;
      const dz = z - p.z;
      const d = Math.hypot(dx, dz);
      const step = speed / 60;
      if (d <= step) break;
      p.x += (dx / d) * step;
      p.z += (dz / d) * step;
      await this.wait(1 / 60);
    }
    p.x = x;
    p.z = z;
    this.walking.delete(rig);
  }

  private async run(): Promise<void> {
    const audio = this.game.audio;
    const state = this.game.state;

    // --- The jump home. Pike was never coming home with Andrew. ---
    await this.wait(2.6);
    await this.say(
      [Speaker.Pike, '2026. Sixty seconds after you left. You really are good at this, Ward.'],
      [Speaker.Andrew, 'We did it, Pike. Hold on, the field gets rough near the end.'],
      [Speaker.Pike, "I know. I've done this more times than you can imagine."],
      'Pike pulls a panel off the passenger coupling.',
      [Speaker.Andrew, "Pike? Don't touch that, the coupling holds both of us in the field!"],
      [Speaker.Pike, 'Yuki Tanaka asked you to tell everyone what Chronos did. And you would. You are that kind of man.'],
      [Speaker.Pike, "I've read that showcase every morning for years, Ward. Chronos rises. Chronos owns the century."],
    );
    audio.music('tension');
    await this.say(
      [Speaker.Pike, 'And this time, the man at the top will know exactly what is coming.'],
      [Speaker.Andrew, "You don't want to expose Chronos. You want to BE Chronos."],
      [Speaker.Pike, 'The machine carries two. I never said both of us would arrive.'],
      [Speaker.Pike, 'There is a year out there with your name on it. I hope it is a kind one.'],
    );
    audio.sfx('zap');
    audio.sfx('alarm');
    this.decoupled = true;
    this.shake = 1.5;
    this.tunnelSpeed = 3;
    this.flashColor = '255,60,90';
    this.flash = 1;
    await this.say('PASSENGER COUPLING OPEN  ·  FIELD BREACH  ·  ONE OCCUPANT LOST', [Speaker.Andrew, 'PIKE!']);
    audio.music('none');
    audio.sfx('boom');
    this.flashColor = '255,255,255';
    this.flash = 1.2;
    this.shake = 0;
    this.fade = 1;
    await this.wait(1.6);

    // --- Geneva, 2026: sixty seconds after Test Run #47 left. ---
    this.setStage('lab');
    this.lab.setMachine('active');
    audio.music('lab');
    await this.fadeTo(0, 1);
    await this.wait(0.8);
    this.lab.setMachine('idle');
    audio.sfx('door');
    this.pike.root.visible = true;
    // In front of the machine, clear of its base (radius ~1.1 at this scale).
    this.pike.root.position.set(2.1, 0, 0.3);
    this.pike.root.rotation.y = -Math.PI / 2;
    await this.wait(0.8);
    await this.say(
      [Speaker.Nora, 'Andrew? The readings spiked for a second and... You only left a minute ago. Is everything...'],
      [Speaker.Nora, "...You're not Andrew."],
      [Speaker.Pike, 'Hello, Nora. You were an intern the last time I saw you.'],
      [Speaker.Nora, 'Aaron Pike? Test Run #12? That run was unmanned! And you look decades older than you should.'],
      [Speaker.Nora, 'Where is Andrew? That is his machine. He climbed into it sixty seconds ago!'],
      [Speaker.Pike, 'Dr. Ward made a choice out there. A brave one.'],
      [Speaker.Nora, "That's not an answer. Is he hurt? Is he alive? WHEN is he?"],
      [Speaker.Pike, 'The field lost a passenger. At those energies, it happens.'],
      [Speaker.Nora, "It doesn't just \"happen\". And what were you doing in his machine in the first place?"],
    );
    await this.walk(this.pike, 0.6, 0.3);
    await this.walk(this.pike, -2.8, -1.6);
    this.pike.root.rotation.y = Math.PI;
    this.nora.root.rotation.y = Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      audio.sfx('beep');
      await this.wait(0.25);
    }
    audio.music('tension');
    await this.say(
      [Speaker.Nora, "What are you doing? That's his telemetry!"],
      'TEST RUN #47  ·  TELEMETRY: DELETED  ·  FIELD LOGS: DELETED  ·  REPORTS: DELETED',
    );
    this.pike.root.rotation.y = -Math.PI / 2;
    await this.say(
      [Speaker.Pike, 'Protecting the Institute. You will understand, someday.'],
      [Speaker.Pike, 'Tell the director that Aaron Pike is home. We have a great deal to build.'],
    );
    await this.walk(this.pike, 0.6, 0.6, 1.4);
    await this.walk(this.pike, 6, 0.8, 1.4);
    this.pike.root.visible = false;
    audio.sfx('door');
    audio.music('none');
    await this.wait(1.2);
    await this.say([Speaker.Nora, '...No. Not all of it.']);
    await this.walk(this.nora, -2.8, -1.6, 1.2);
    this.nora.root.rotation.y = Math.PI;
    for (let i = 0; i < 6; i++) {
      audio.sfx('beep');
      await this.wait(0.2);
    }
    await this.say(
      'Nora copies the launch log into an old backup partition, one nobody at the Institute remembers.',
      'TEST RUN #47  ·  LAUNCH LOG  ·  RESTORED TO ARCHIVE',
    );
    this.nora.root.rotation.y = 0;
    await this.say(
      [Speaker.Nora, 'Somebody has to remember you went, Andrew.'],
      [Speaker.Nora, 'Wherever you are, Andrew... whenever you are. Hold on.'],
    );
    await this.fadeTo(1, 1.2);

    // --- Somewhere, somewhen. ---
    const andrew = this.stranded.andrew.root;
    andrew.rotation.set(-Math.PI / 2, 0, 0.3);
    andrew.position.set(0, 0.22, 0.6);
    this.setStage('stranded');
    audio.music('mountain');
    await this.fadeTo(0, 1.6);
    await this.wait(0.8);
    await this.say([Speaker.Andrew, '...Ow.']);
    for (let i = 0; i <= 20; i++) {
      andrew.rotation.x = -Math.PI / 2 + (Math.PI / 2) * (i / 20);
      andrew.position.y = 0.22 * (1 - i / 20);
      await this.wait(1 / 40);
    }
    andrew.rotation.set(0, 0.3, 0);
    audio.sfx('step');
    await this.wait(0.5);
    await this.say(
      [Speaker.Andrew, 'Air. Gravity. Stars. All right, that is a start.'],
      [Speaker.Andrew, 'Multitool: date check.'],
    );
    audio.sfx('error');
    andrew.rotation.y = -0.3;
    await this.say(
      'YEAR: ????  ·  NO TEMPORAL REFERENCE FOUND',
      [Speaker.Andrew, 'No machine. No core. No Pip.'],
      [Speaker.Andrew, 'You had decades to plan this, Pike.'],
    );
    andrew.rotation.y = 0;
    await this.say([Speaker.Andrew, "Fine. I'll take as long as I need."]);
    await this.fadeTo(1, 1.4);

    state.setFlag(Flag.Completed);
    state.save();
    this.setStage('card');
    this.fade = 0;
    await this.wait(2.5);
    this.cardReady = true;
  }

  update(dt: number): void {
    this.stageTime += dt;
    this.timers.update(dt);
    this.dialogue.update(dt, this.game.input, this.game.audio);
    this.flash = Math.max(0, this.flash - dt * 0.8);
    this.shake = Math.max(0, this.shake - dt * 0.3);
    if (this.stage === 'card' && this.cardReady && this.game.input.consume('interact')) {
      this.game.audio.music('ending');
      this.setStage('credits');
    } else if (this.stage === 'credits') {
      this.creditsTime += dt;
      if (this.creditsTime > 3 && this.game.input.consume('interact') && !this.finished) {
        this.finished = true;
        this.onDone();
      }
    }
  }

  draw(screen: Screen, time: number): void {
    const ui = screen.ui;
    const jitter = (): number => (this.shake ? (Math.random() - 0.5) * this.shake * 0.1 : 0);
    if (this.stage === 'tunnel') this.drawTunnel(screen, time, jitter);
    else if (this.stage === 'lab') {
      this.lab.update(time, 0);
      this.nora.animate(time, this.walking.has(this.nora) ? 1 : 0);
      this.pike.animate(time, this.walking.has(this.pike) ? 1 : 0);
      this.camera.position.set(0.4, 2.3, 6.2);
      this.camera.lookAt(0.2, 1.1, -0.8);
      screen.render(this.lab.scene, this.camera);
    } else if (this.stage === 'stranded') {
      this.stranded.update(this.stageTime);
      this.stranded.andrew.animate(time, 0);
      const drift = this.stageTime * 0.03;
      this.camera.position.set(-0.8 + drift, 2.6, 6.8 - drift);
      this.camera.lookAt(0, 0.4, -0.8);
      screen.render(this.stranded.scene, this.camera);
    } else if (this.stage === 'card') {
      screen.clear('#000000');
      drawText(ui, t('TEST RUN #47'), VIEW_W / 2, 58, { size: 9, align: 'center', bold: true, color: '#7fd8ff' });
      drawText(ui, msg().statusReadout({ value: glitchText(8, time, 4) }), VIEW_W / 2, 74, { size: 7, align: 'center', color: '#ff5050' });
      drawText(ui, t('TO BE CONTINUED...'), VIEW_W / 2, 100, { size: 16, align: 'center', bold: true, color: '#f4f1de' });
      if (this.cardReady && Math.floor(time * 2) % 2 === 0) {
        drawText(ui, msg().pressKey({ key: this.game.input.glyph('interact') }), VIEW_W / 2, VIEW_H - 12, { size: 6.5, align: 'center', color: '#7fd8ff' });
      }
    } else {
      this.drawCredits(screen, time);
    }

    if (this.fade > 0) {
      ui.fillStyle = `rgba(0,0,0,${this.fade})`;
      ui.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    this.dialogue.draw(screen, time);
    if (this.flash > 0) {
      ui.fillStyle = `rgba(${this.flashColor},${Math.min(1, this.flash)})`;
      ui.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  private drawTunnel(screen: Screen, time: number, jitter: () => number): void {
    this.tunnel.update(time, this.tunnelSpeed);
    this.tunnelCamera.position.set(Math.sin(time * 3) * 0.15 + jitter(), Math.cos(time * 2) * 0.1 + jitter(), 0);
    this.tunnelCamera.rotation.z = Math.sin(time * 0.8) * 0.2 + (this.decoupled ? Math.sin(time * 7) * 0.15 : 0);
    screen.render(this.tunnel.scene, this.tunnelCamera);
    const ui = screen.ui;
    const settled = this.stageTime > 2.4;
    let year = '2026';
    if (this.decoupled) year = glitchText(4, time, 11);
    else if (!settled) year = year.replace(/[0-9]/g, (d) => (Math.random() > this.stageTime / 3 ? String(Math.floor(Math.random() * 10)) : d));
    drawText(ui, t(this.decoupled ? 'FIELD BREACH' : 'TEMPORAL JUMP IN PROGRESS'), VIEW_W / 2, 24, {
      size: 7,
      align: 'center',
      bold: true,
      color: this.decoupled && Math.floor(time * 4) % 2 === 0 ? '#ff5050' : '#7fd8ff',
    });
    drawText(ui, year, VIEW_W / 2, 60, { size: 16, align: 'center', bold: true, color: this.decoupled ? '#ff5050' : settled ? '#f1c232' : '#ffffff' });
  }

  private drawCredits(screen: Screen, time: number): void {
    const ui = screen.ui;
    screen.clear('#0b0b1f');
    const scroll = Math.max(0, this.creditsTime - 2) * 9;
    let y = 40 - scroll;
    /** Draws a credits line, already in the player's language. */
    const line = (text: string, size: number, color: string, gap: number): void => {
      if (y > -20 && y < VIEW_H + 10) drawText(ui, text, VIEW_W / 2, y, { size, align: 'center', color });
      y += gap;
    };
    line(t('OUT OF TIME'), 22, '#f4f1de', 34);
    line(t('Thanks for playing!'), 9, '#f1c232', 14);
    line(t('Andrew Ward will return.'), 7, '#9aa6bb', 26);
    line(t('HISTORICAL & SCIENTIFIC NOTES'), 7, '#7fd8ff', 14);
    for (const note of NOTES) {
      for (const text of wrapText(ui, t(note), 260, 6.5)) line(text, 6.5, '#d8dceb', 9);
      y += 8;
    }
    line(t('Made with TypeScript, Three.js and the Web Audio API.'), 6.5, '#9aa6bb', 12);
    if (this.creditsTime > 3 && Math.floor(time * 2) % 2 === 0) {
      drawText(ui, msg().pressKeyForTitle({ key: this.game.input.glyph('interact') }), VIEW_W / 2, VIEW_H - 12, { size: 6.5, align: 'center', color: '#7fd8ff' });
    }
  }
}
