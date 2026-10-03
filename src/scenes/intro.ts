import * as THREE from 'three';
import type { Line } from '../eras/types.ts';
import { VIEW_H, VIEW_W, type Screen } from '../engine/screen.ts';
import { drawText } from '../engine/text.ts';
import type { Game, Scene } from '../game/game.ts';
import { DialogueBox, drawPanel, Timers } from '../game/ui.ts';
import { buildJungleSet, buildLabSet } from '../render/sets.ts';

type Stage = 'black' | 'lab' | 'jungle' | 'title';

/**
 * Opening cinematic: a routine test at the Chronos Institute goes wrong and
 * Elias wakes up somewhere very, very old. Skippable with Escape.
 */
export class IntroScene implements Scene {
  private readonly game: Game;
  private readonly onDone: () => void;
  private readonly lab = buildLabSet();
  private readonly jungle = buildJungleSet();
  private readonly camera = new THREE.PerspectiveCamera(42, VIEW_W / VIEW_H, 0.1, 120);
  private readonly dialogue = new DialogueBox();
  private readonly timers = new Timers();
  private stage: Stage = 'black';
  private time = 0;
  private stageTime = 0;
  private done = false;
  private started = false;

  // State animated by the script
  private walking = false;
  private shake = 0;
  private flash = 0;
  private fade = 1;
  private fadeTarget = 1;
  private fadeSpeed = 1;
  private showError = false;
  private caption: { title: string; subtitle: string } | null = null;
  private bigText = '';

  constructor(game: Game, onDone: () => void) {
    this.game = game;
    this.onDone = onDone;
  }

  enter(): void {
    if (this.started) return;
    this.started = true;
    this.game.audio.music('none');
    void this.run();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.onDone();
  }

  private wait(seconds: number): Promise<void> {
    return this.timers.wait(seconds);
  }

  private say(...lines: Line[]): Promise<void> {
    return this.dialogue.open(lines);
  }

  private async fadeTo(target: number, seconds: number): Promise<void> {
    this.fadeTarget = target;
    this.fadeSpeed = 1 / seconds;
    await this.wait(seconds);
    this.fade = target;
  }

  private setStage(stage: Stage): void {
    this.stage = stage;
    this.stageTime = 0;
  }

  private async run(): Promise<void> {
    const audio = this.game.audio;
    const elias = this.lab.elias.root;

    this.caption = { title: 'CHRONOS INSTITUTE', subtitle: 'Geneva, Switzerland  ·  Temporal Research Division  ·  Test Run #47' };
    this.fade = 0;
    this.fadeTarget = 0;
    await this.wait(3.4);
    this.caption = null;
    this.setStage('lab');
    this.fade = 1;
    audio.music('lab');
    await this.fadeTo(0, 1);

    await this.say(
      ['Nora (radio)', "Morning, Elias. All systems green. Coffee's on me if you come back in one piece."],
      ['Elias', "It's a one-hour hop, Nora. I'll be back before it gets cold."],
      ['Nora (radio)', 'Target: this lab, sixty minutes ago. Observe, take readings, come home. Nothing fancy.'],
      ['Nora (radio)', 'Translator earpiece on? Protocol says you wear it, even for a one-hour hop.'],
      ['Elias', "On and calibrated. Forty languages, living and dead. As if I'll need any of them."],
    );

    // Elias walks into the pod.
    this.walking = true;
    elias.rotation.y = Math.PI / 2;
    while (elias.position.x < 1.4) {
      await this.wait(1 / 60);
      elias.position.x += 0.035;
      elias.position.z += (-0.9 - elias.position.z) * 0.05;
    }
    this.walking = false;
    elias.visible = false;
    this.lab.setMachine('active');
    audio.sfx('select');
    await this.wait(0.6);

    await this.say(['Nora (radio)', 'Stability at 98%. Starting the countdown.'], ['Elias', 'Okay... temporal displacement in 3...']);
    for (const n of ['2', '1']) {
      this.bigText = n;
      audio.sfx('blip');
      await this.wait(0.8);
    }
    this.bigText = '';

    audio.music('none');
    audio.sfx('warp');
    for (let i = 0; i < 20; i++) {
      this.shake = 0.3 + i * 0.08;
      await this.wait(0.07);
    }
    this.lab.alarm(true);
    this.showError = true;
    audio.sfx('error');
    audio.sfx('alarm');
    await this.wait(1.6);
    await this.say(['Nora (radio)', 'Elias? These readings are all wrong... Abort! ABORT!']);

    audio.sfx('boom');
    this.flash = 1;
    this.showError = false;
    this.shake = 0;
    this.setStage('black');
    await this.wait(2.2);

    this.bigText = '...';
    await this.wait(1.4);
    this.bigText = '';

    // The jungle. Elias lies on his back next to the smoking machine.
    const lying = this.jungle.elias.root;
    lying.rotation.set(-Math.PI / 2, 0, 0.3);
    lying.position.set(-0.8, 0.22, 0.6);
    this.setStage('jungle');
    this.fade = 1;
    await this.fadeTo(0, 1.6);
    await this.wait(0.6);

    await this.say(['Elias', 'Ugh... my head...']);
    for (let i = 0; i <= 20; i++) {
      lying.rotation.x = -Math.PI / 2 + (Math.PI / 2) * (i / 20);
      lying.position.y = 0.22 * (1 - i / 20);
      await this.wait(1 / 40);
    }
    lying.rotation.set(0, 0.4, 0);
    audio.sfx('step');
    await this.wait(0.5);
    await this.say(['Elias', 'Nora? Nora, do you copy?'], 'Only static answers.', ['Elias', "And these plants... they're enormous."]);

    audio.sfx('roar');
    this.shake = 1.2;
    lying.rotation.y = -0.3;
    await this.wait(1.4);
    this.shake = 0;
    await this.wait(0.8);
    lying.rotation.y = 0.2;
    await this.say(
      ['Elias', '...'],
      ['Elias', 'That is definitely not one hour ago.'],
      ['Elias', "Okay. Don't panic. You built this thing. You can fix it."],
    );

    this.setStage('title');
    audio.music('jungle');
    await this.wait(3.2);
    this.finish();
  }

  update(dt: number): void {
    if (this.done) return;
    const input = this.game.input;
    if (input.consume('pause')) {
      this.finish();
      return;
    }
    this.time += dt;
    this.stageTime += dt;
    this.timers.update(dt);
    this.dialogue.update(dt, input, this.game.audio);
    this.flash = Math.max(0, this.flash - dt * 0.8);
    if (this.fade !== this.fadeTarget) {
      this.fade += Math.sign(this.fadeTarget - this.fade) * Math.min(Math.abs(this.fadeTarget - this.fade), dt * this.fadeSpeed);
    }
    if (this.stage === 'jungle' || this.stage === 'title') {
      for (const [i, flyer] of this.jungle.flyers.entries()) {
        flyer.root.position.x = -30 - i * 4 + this.stageTime * 4;
      }
    }
  }

  draw(screen: Screen, time: number): void {
    const jitter = (): number => (this.shake ? (Math.random() - 0.5) * this.shake * 0.1 : 0);
    if (this.stage === 'lab') {
      this.lab.update(time, 0);
      this.lab.elias.animate(time, this.walking ? 1 : 0);
      const push = Math.min(1, this.stageTime / 30);
      this.camera.position.set(0.2 + jitter(), 2.4 + jitter(), 7.2 - push * 1.5);
      this.camera.lookAt(0.2, 1.1, -1);
      screen.render(this.lab.scene, this.camera);
    } else if (this.stage === 'jungle' || this.stage === 'title') {
      this.jungle.update(time, 0);
      this.jungle.elias.animate(time, 0);
      const drift = this.stageTime * 0.05;
      this.camera.position.set(-0.4 + drift + jitter(), 1.9 + jitter(), 5.4 - drift);
      this.camera.lookAt(0, 0.9, -0.6);
      screen.render(this.jungle.scene, this.camera);
    } else {
      screen.clear('#000000');
    }

    const ui = screen.ui;
    if (this.caption) {
      drawText(ui, this.caption.title, VIEW_W / 2, 74, { size: 12, bold: true, align: 'center', color: '#f4f1de' });
      drawText(ui, this.caption.subtitle, VIEW_W / 2, 92, { size: 7, align: 'center', color: '#7fd8ff' });
    }
    if (this.bigText) drawText(ui, this.bigText, VIEW_W / 2, 70, { size: 22, bold: true, align: 'center', color: '#ffffff' });
    if (this.showError) this.drawError(screen, time);
    if (this.stage === 'title') {
      ui.fillStyle = 'rgba(0,0,0,0.35)';
      ui.fillRect(0, 0, VIEW_W, VIEW_H);
      drawText(ui, 'OUT OF TIME', VIEW_W / 2, 64, { size: 24, bold: true, align: 'center', color: '#f4f1de' });
      drawText(ui, 'A stealth adventure across time', VIEW_W / 2, 92, { size: 8, align: 'center', color: '#f1c232' });
    }

    if (this.fade > 0) {
      ui.fillStyle = `rgba(0,0,0,${this.fade})`;
      ui.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    this.dialogue.draw(screen, time);
    if (this.flash > 0) {
      ui.fillStyle = `rgba(255,255,255,${Math.min(1, this.flash)})`;
      ui.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (this.stage !== 'title') drawText(ui, `${this.game.input.glyph('pause')}: skip`, VIEW_W - 4, 4, { size: 5.5, align: 'right', color: 'rgba(255,255,255,0.5)' });
  }

  private drawError(screen: Screen, time: number): void {
    const ui = screen.ui;
    const x = 70;
    const y = 26;
    const w = 180;
    drawPanel(ui, x, y, w, 62, 0.92);
    ui.fillStyle = '#ff3b3b';
    ui.fillRect(x + 3, y + 3, w - 6, 0.8);
    const blink = Math.floor(time * 4) % 2 === 0;
    drawText(ui, blink ? '!! TEMPORAL ERROR !!' : '   TEMPORAL ERROR   ', x + w / 2, y + 6, { size: 8, bold: true, align: 'center', color: '#ff5050' });
    const scramble = (n: number): string => Array.from({ length: n }, () => (Math.random() < 0.7 ? '█' : '▓')).join('');
    drawText(ui, `YEAR: ${scramble(10)}`, x + 12, y + 22, { size: 7, color: '#f4f1de' });
    drawText(ui, `COORDINATES: ${scramble(6)}`, x + 12, y + 33, { size: 7, color: '#f4f1de' });
    drawText(ui, 'STABILITY: 12%', x + 12, y + 44, { size: 7, color: '#ffd23f' });
  }
}
