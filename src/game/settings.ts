import type { AudioEngine } from '../engine/audio.ts';
import type { Input } from '../engine/input.ts';
import { VIEW_H, VIEW_W, type Screen } from '../engine/screen.ts';
import { drawText, FONT_FAMILY } from '../engine/text.ts';
import { getLang, LANGS, setLang, t, type Lang } from '../i18n/index.ts';
import { drawPanel } from './ui.ts';

type Row = 'language' | 'sound' | 'back';
const ROWS: readonly Row[] = ['language', 'sound', 'back'];

const FLAG_W = 15;
const FLAG_H = 10;

/**
 * The settings panel, opened from the title screen and the pause menu: the language (with its flag)
 * and the sound. Left/Right or the interact button change the selected setting.
 */
export class SettingsPanel {
  private index = 0;
  private open = false;

  get active(): boolean {
    return this.open;
  }

  show(): void {
    this.open = true;
    this.index = 0;
  }

  update({ input, audio }: { input: Input; audio: AudioEngine }): void {
    if (!this.open) return;
    if (input.consume('up')) {
      this.index = (this.index + ROWS.length - 1) % ROWS.length;
      audio.sfx('blip');
    }
    if (input.consume('down')) {
      this.index = (this.index + 1) % ROWS.length;
      audio.sfx('blip');
    }
    if (input.consume('back') || input.consume('pause')) {
      this.open = false;
      return;
    }
    const row = ROWS[this.index];
    const step = input.consume('left') ? -1 : input.consume('right') || input.consume('interact') ? 1 : 0;
    if (step === 0) return;
    audio.sfx('select');
    if (row === 'language') {
      const i = LANGS.findIndex((l) => l.id === getLang());
      setLang(LANGS[(i + step + LANGS.length) % LANGS.length].id);
    } else if (row === 'sound') {
      audio.toggleMute();
    } else if (step > 0) {
      this.open = false;
    }
  }

  draw({ screen, time, audio }: { screen: Screen; time: number; audio: AudioEngine }): void {
    if (!this.open) return;
    const ui = screen.ui;
    ui.fillStyle = 'rgba(0,0,0,0.6)';
    ui.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = 200;
    const h = 82;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2 - 6;
    drawPanel(ui, x, y, w, h, 0.96);
    drawText(ui, t('SETTINGS'), VIEW_W / 2, y + 7, { size: 9, bold: true, align: 'center', color: '#f1c232' });

    const lang = LANGS.find((l) => l.id === getLang()) ?? LANGS[0];
    ROWS.forEach((row, i) => {
      const ry = y + 26 + i * 15;
      const selected = i === this.index;
      if (selected) {
        ui.fillStyle = 'rgba(127, 216, 255, 0.18)';
        ui.fillRect(x + 6, ry - 3, w - 12, 13);
      }
      const color = selected ? '#ffffff' : '#9aa6bb';
      const marker = selected ? (Math.floor(time * 4) % 2 ? '>' : '»') : ' ';
      if (row === 'back') {
        drawText(ui, `${marker} ${t('Back')}`, x + 12, ry, { color });
        return;
      }
      drawText(ui, `${marker} ${t(row === 'language' ? 'Language' : 'Sound')}`, x + 12, ry, { color });
      const right = x + w - 14;
      const arrows = selected ? '#7fd8ff' : '#55607a';
      if (row === 'language') {
        // ◄ [flag] Name ►, right-aligned.
        drawText(ui, '►', right, ry, { align: 'right', color: arrows, shadow: null });
        drawText(ui, lang.name, right - 9, ry, { align: 'right', color });
        ui.font = `8px ${FONT_FAMILY}`;
        const nameW = ui.measureText(lang.name).width;
        const flagX = right - 13 - nameW - FLAG_W;
        drawFlag({ ctx: ui, lang: lang.id, x: flagX, y: ry - 1 });
        drawText(ui, '◄', flagX - 4, ry, { align: 'right', color: arrows, shadow: null });
      } else {
        drawText(ui, `◄ ${t(audio.muted ? 'Off' : 'On')} ►`, right, ry, { align: 'right', color });
      }
    });
    drawText(ui, t('Left/Right change · Up/Down move'), VIEW_W / 2, y + h - 10, { size: 5.5, align: 'center', color: '#9aa6bb' });
  }
}

/** A tiny flag for each language: the United States for English, Chile for Spanish. */
export function drawFlag({ ctx, lang, x, y }: { ctx: CanvasRenderingContext2D; lang: Lang; x: number; y: number }): void {
  ctx.save();
  if (lang === 'en') {
    // Thirteen stripes, red and white, with the blue canton over the top seven.
    const stripe = FLAG_H / 13;
    for (let i = 0; i < 13; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#ffffff';
      ctx.fillRect(x, y + i * stripe, FLAG_W, stripe + 0.05);
    }
    ctx.fillStyle = '#3c3b6e';
    ctx.fillRect(x, y, FLAG_W * 0.4, stripe * 7);
    ctx.fillStyle = '#ffffff';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) ctx.fillRect(x + 0.9 + col * 1.9, y + 0.8 + row * 1.7, 0.6, 0.6);
    }
  } else {
    // White over red, with a blue square holding a white star at the top left.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, FLAG_W, FLAG_H / 2);
    ctx.fillStyle = '#d52b1e';
    ctx.fillRect(x, y + FLAG_H / 2, FLAG_W, FLAG_H / 2);
    ctx.fillStyle = '#0039a6';
    ctx.fillRect(x, y, FLAG_H / 2, FLAG_H / 2);
    drawStar({ ctx, cx: x + FLAG_H / 4, cy: y + FLAG_H / 4, r: 1.6 });
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 0.4;
  ctx.strokeRect(x, y, FLAG_W, FLAG_H);
  ctx.restore();
}

function drawStar({ ctx, cx, cy, r }: { ctx: CanvasRenderingContext2D; cx: number; cy: number; r: number }): void {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}
