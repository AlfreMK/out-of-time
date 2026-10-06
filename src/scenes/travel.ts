import * as THREE from 'three';
import { VIEW_H, VIEW_W, type Screen } from '../engine/screen.ts';
import { eraInfo, msg, t } from '../i18n/index.ts';
import { drawText } from '../engine/text.ts';
import { glitchText } from '../eras/info.ts';
import type { Game, Scene } from '../game/game.ts';
import type { EraId } from '../game/state.ts';
import { buildTunnelSet } from '../render/sets.ts';

const DURATION = 3.6;

/** The time tunnel shown while jumping between eras. */
export class TravelScene implements Scene {
  private readonly game: Game;
  private readonly from: EraId;
  private readonly to: EraId;
  private readonly stability: number;
  /** Whether the destination was visited before; unknown eras stay garbled until arrival. */
  private readonly known: boolean;
  private readonly onDone: () => void;
  private readonly set = buildTunnelSet();
  private readonly camera = new THREE.PerspectiveCamera(70, VIEW_W / VIEW_H, 0.1, 100);
  private t = 0;
  private done = false;

  constructor(game: Game, from: EraId, to: EraId, stability: number, known: boolean, onDone: () => void) {
    this.game = game;
    this.from = from;
    this.to = to;
    this.stability = stability;
    this.known = known;
    this.onDone = onDone;
  }

  enter(): void {
    this.game.audio.music('none');
    this.game.audio.sfx('warp');
  }

  update(dt: number): void {
    this.t += dt;
    if (this.t > DURATION && !this.done) {
      this.done = true;
      this.game.audio.sfx('boom');
      this.onDone();
    }
  }

  draw(screen: Screen, time: number): void {
    this.set.update(time, 1 + this.t * 1.5);
    this.camera.position.set(Math.sin(time * 3) * 0.15, Math.cos(time * 2) * 0.1, 0);
    this.camera.rotation.z = Math.sin(time * 0.8) * 0.2;
    screen.render(this.set.scene, this.camera);

    const ui = screen.ui;
    const progress = Math.min(1, this.t / (DURATION - 0.6));
    const fromInfo = eraInfo(this.from);
    const toInfo = eraInfo(this.to);
    const settled = progress >= 1;
    let year: string;
    if (settled) year = toInfo.year;
    else if (progress < 0.3) year = scramble(fromInfo.year, progress);
    else year = this.known ? scramble(toInfo.year, progress) : glitchText(toInfo.year.length, time, 3);
    drawText(ui, t('TEMPORAL JUMP IN PROGRESS'), VIEW_W / 2, 24, { size: 7, align: 'center', color: '#7fd8ff', bold: true });
    drawText(ui, year, VIEW_W / 2, 118, { size: 16, align: 'center', bold: true, color: settled ? '#f1c232' : '#ffffff' });
    const name = settled ? `${toInfo.name.toUpperCase()}  ·  ${toInfo.place}` : this.known ? '· · ·' : glitchText(12, time, 9);
    drawText(ui, name, VIEW_W / 2, 140, { size: 8, align: 'center', color: '#f4f1de' });
    const warn = this.stability < 50 && Math.floor(time * 4) % 2 === 0;
    drawText(ui, msg().stability({ percent: this.stability, warning: this.stability < 50 }), VIEW_W / 2, VIEW_H - 16, {
      size: 6.5,
      align: 'center',
      color: warn ? '#ff5050' : '#9aa6bb',
    });
  }
}

/** Replaces digits with random ones, fewer as the jump settles. */
function scramble(text: string, progress: number): string {
  return text
    .split('')
    .map((ch) => (/[0-9]/.test(ch) && Math.random() > progress * 0.8 ? String(Math.floor(Math.random() * 10)) : ch))
    .join('');
}
