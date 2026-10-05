import * as THREE from 'three';
import type { Line } from '../eras/types.ts';
import { VIEW_H, VIEW_W, type Screen } from '../engine/screen.ts';
import { drawText, wrapText } from '../engine/text.ts';
import type { Game, Scene } from '../game/game.ts';
import { DialogueBox, Timers } from '../game/ui.ts';
import { buildHuman } from '../render/humans.ts';
import { buildLabSet } from '../render/sets.ts';
import { Speaker } from '../game/speakers.ts';
import { Flag } from '../game/flags.ts';

/** Short notes on the real history and science behind each era, shown in the credits. */
const NOTES = [
  'HELL CREEK, 66.5 MILLION YEARS AGO. T. rex, Triceratops, Pachycephalosaurus and the feathered Dakotaraptor really shared this landscape. Grasses had barely evolved, so ferns and horsetails covered the ground. Pachycephalosaurus domes are real; whether they were used for head-butting is still debated. Anzu, Thescelosaurus, Ankylosaurus, Edmontosaurus and Champsosaurus lived there too (but no sauropods: Alamosaurus lived far to the south); oviraptorosaurs have been found fossilized brooding their nests, and dromaeosaurs left two-toed tracks.',
  'COLOGNE, 1248. The old cathedral burned that April, and in August Archbishop Konrad von Hochstaden laid the foundation stone of the one that still stands (finished in 1880). Albertus Magnus came to Cologne that year with his student Thomas Aquinas. Mercury melts at about -39 °C.',
  'ARAUCANÍA, 1553. Lautaro (Leftraru) had served Pedro de Valdivia as a groom before escaping. On December 25, 1553 he led the Mapuche to victory at the Battle of Tucapel. The foye (Drimys winteri) is sacred to the Mapuche, and its bark prevents scurvy.',
  'TOKYO, 2087 AND MADRID, 2240. Imagined futures, built on real technology: optical lattice clocks, REBCO superconductors and solid-state batteries already exist. Hachikō\'s statue has stood in Shibuya since 1948, and climate models project growing drought risk for central Spain.',
];

type Stage = 'lab' | 'credits';

export class EndingScene implements Scene {
  private readonly game: Game;
  private readonly onDone: () => void;
  private readonly lab = buildLabSet();
  private readonly camera = new THREE.PerspectiveCamera(42, VIEW_W / VIEW_H, 0.1, 120);
  private readonly dialogue = new DialogueBox();
  private readonly timers = new Timers();
  private readonly nora = buildHuman('nora', { hair: '#2a1a14', weapon: undefined, bun: false });
  private readonly pike = buildHuman('pike');
  private stage: Stage = 'lab';
  private time = 0;
  private creditsTime = 0;
  private started = false;
  private finished = false;

  constructor(game: Game, onDone: () => void) {
    this.game = game;
    this.onDone = onDone;
    this.lab.scene.add(this.nora.root, this.pike.root);
    this.nora.root.position.set(-3.6, 0, -1.6);
    this.nora.root.rotation.y = Math.PI / 2;
    this.pike.root.visible = false;
    this.lab.andrew.root.visible = false;
    this.lab.setMachine('active');
  }

  enter(): void {
    if (this.started) return;
    this.started = true;
    this.game.audio.music('lab');
    void this.run();
  }

  private say(...lines: Line[]): Promise<void> {
    return this.dialogue.open(lines);
  }

  private async run(): Promise<void> {
    const state = this.game.state;
    await this.timers.wait(1.2);
    this.lab.setMachine('idle');
    this.game.audio.sfx('door');
    const andrew = this.lab.andrew.root;
    andrew.visible = true;
    andrew.position.set(2.2, 0, -0.2);
    andrew.rotation.y = -Math.PI / 2;
    await this.timers.wait(0.6);
    this.pike.root.visible = true;
    this.pike.root.position.set(2.8, 0, 0.3);
    this.pike.root.rotation.y = -Math.PI / 2;
    await this.timers.wait(0.6);
    await this.say(
      [Speaker.Nora, 'Andrew? The readings spiked for a second and... You only left a minute ago. Is everything okay?'],
      [Speaker.Andrew, 'Nora. What year is it?'],
      [Speaker.Nora, "It's 2026, obviously. Why are you looking at me like that? And... who is that?"],
      [Speaker.Pike, 'Hello, Nora. You were an intern the last time I saw you.'],
      [Speaker.Nora, '...Aaron Pike? Test Run #12? That run was unmanned!'],
      [Speaker.Andrew, "That's what they told us. We need to talk. About the Institute, about Pike..."],
      [Speaker.Andrew, 'And about a dinosaur named Pip.'],
      [Speaker.Nora, '...Your coffee is still warm, by the way.'],
      [Speaker.Andrew, 'Best news I have heard in sixty-six million years.'],
    );
    this.game.audio.music('ending');
    state.setFlag(Flag.Completed);
    state.save();
    this.stage = 'credits';
  }

  update(dt: number): void {
    this.time += dt;
    this.timers.update(dt);
    this.dialogue.update(dt, this.game.input, this.game.audio);
    if (this.stage === 'credits') {
      this.creditsTime += dt;
      if (this.creditsTime > 3 && this.game.input.consume('interact') && !this.finished) {
        this.finished = true;
        this.onDone();
      }
    }
  }

  draw(screen: Screen, time: number): void {
    const ui = screen.ui;
    if (this.stage === 'lab') {
      this.lab.update(time, 0);
      this.lab.andrew.animate(time, 0);
      this.nora.animate(time, 0);
      this.pike.animate(time, 0);
      this.camera.position.set(0.4, 2.3, 6.2);
      this.camera.lookAt(0.6, 1.1, -0.8);
      screen.render(this.lab.scene, this.camera);
      this.dialogue.draw(screen, time);
      return;
    }
    screen.clear('#0b0b1f');
    const scroll = Math.max(0, this.creditsTime - 2) * 9;
    let y = 40 - scroll;
    const line = (text: string, size: number, color: string, gap: number): void => {
      if (y > -20 && y < VIEW_H + 10) drawText(ui, text, VIEW_W / 2, y, { size, align: 'center', color });
      y += gap;
    };
    line('OUT OF TIME', 22, '#f4f1de', 34);
    line('Thanks for playing!', 9, '#f1c232', 26);
    line('HISTORICAL & SCIENTIFIC NOTES', 7, '#7fd8ff', 14);
    for (const note of NOTES) {
      for (const text of wrapText(ui, note, 260, 6.5)) line(text, 6.5, '#d8dceb', 9);
      y += 8;
    }
    line('Made with TypeScript, Three.js and the Web Audio API.', 6.5, '#9aa6bb', 12);
    if (this.creditsTime > 3 && Math.floor(time * 2) % 2 === 0) {
      drawText(ui, `Press ${this.game.input.glyph('interact')} to return to the title`, VIEW_W / 2, VIEW_H - 12, { size: 6.5, align: 'center', color: '#7fd8ff' });
    }
  }
}
