import * as THREE from 'three';
import { VIEW_H, VIEW_W, type Screen } from '../engine/screen.ts';
import { drawText } from '../engine/text.ts';
import { msg, t } from '../i18n/index.ts';
import { continueGame, newGame } from '../game/flow.ts';
import type { Game, Scene } from '../game/game.ts';
import { SettingsPanel } from '../game/settings.ts';
import { GameState } from '../game/state.ts';
import { buildTitleSet } from '../render/sets.ts';

export class TitleScene implements Scene {
  private readonly game: Game;
  private readonly set = buildTitleSet();
  private readonly camera = new THREE.PerspectiveCamera(40, VIEW_W / VIEW_H, 0.1, 100);
  private options: Array<'Continue' | 'New Game' | 'Settings'> = [];
  private index = 0;
  private confirmOverwrite = false;
  private time = 0;
  private readonly settings = new SettingsPanel();

  constructor(game: Game) {
    this.game = game;
  }

  enter(): void {
    this.options = GameState.hasSave() ? ['Continue', 'New Game', 'Settings'] : ['New Game', 'Settings'];
    this.index = 0;
    this.confirmOverwrite = false;
    this.game.audio.music('lab');
  }

  update(dt: number): void {
    this.time += dt;
    const input = this.game.input;
    if (this.settings.active) {
      this.settings.update({ input, audio: this.game.audio });
      return;
    }
    const step = input.consume('up') ? -1 : input.consume('down') ? 1 : 0;
    if (step !== 0) {
      this.index = (this.index + step + this.options.length) % this.options.length;
      this.confirmOverwrite = false;
      this.game.audio.sfx('blip');
    }
    if (!input.consume('interact')) return;
    this.game.audio.sfx('select');
    const choice = this.options[this.index];
    if (choice === 'Continue') {
      continueGame(this.game);
    } else if (choice === 'Settings') {
      this.confirmOverwrite = false;
      this.settings.show();
    } else if (GameState.hasSave() && !this.confirmOverwrite) {
      this.confirmOverwrite = true;
    } else {
      newGame(this.game);
    }
  }

  draw(screen: Screen): void {
    this.set.update(this.time);
    const a = this.time * 0.15;
    this.camera.position.set(Math.sin(a) * 1.5, 3.6, 9.5);
    this.camera.lookAt(0, 2.1, 0);
    screen.render(this.set.scene, this.camera);

    const ui = screen.ui;
    const cx = VIEW_W / 2;
    const glitch = Math.sin(this.time * 7) > 0.97 ? 2 : 0.6;
    drawText(ui, 'OUT OF TIME', cx - glitch, 18, { size: 24, bold: true, align: 'center', color: 'rgba(255,60,90,0.8)', shadow: null });
    drawText(ui, 'OUT OF TIME', cx + glitch, 18, { size: 24, bold: true, align: 'center', color: 'rgba(60,220,255,0.8)', shadow: null });
    drawText(ui, 'OUT OF TIME', cx, 18, { size: 24, bold: true, align: 'center', color: '#f4f1de' });
    drawText(ui, t('A stealth adventure across time'), cx, 46, { size: 7, align: 'center', color: '#f1c232' });

    this.options.forEach((option, i) => {
      const selected = i === this.index;
      const label = t(selected && option === 'New Game' && this.confirmOverwrite ? 'Overwrite your save? Press again' : option);
      drawText(ui, `${selected ? '>  ' : ''}${label}${selected ? '  <' : ''}`, cx, 150 - this.options.length * 5 + i * 11, {
        size: 8,
        align: 'center',
        bold: selected,
        color: selected ? '#ffffff' : '#8a90b0',
      });
    });
    // The control hints follow whatever was used last: keyboard, a controller or the touch screen.
    const input = this.game.input;
    const hints =
      input.device === 'keyboard'
        ? t('WASD/Arrows move · E/Space interact · Shift sneak · F use · Q switch · M mute')
        : msg().padHints({
            stick: t(input.device === 'touch' ? 'Joystick' : 'Left stick'),
            interact: input.glyph('interact'),
            sneak: input.glyph('sneak'),
            use: input.glyph('throw'),
            cycle: input.glyph('cycle'),
            pause: input.glyph('pause'),
          });
    drawText(ui, hints, cx, VIEW_H - 9, {
      size: 5.5,
      align: 'center',
      color: '#8a90b0',
    });
    this.settings.draw({ screen, time: this.time, audio: this.game.audio });
  }
}
