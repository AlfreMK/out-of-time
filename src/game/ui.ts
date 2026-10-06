import type { AudioEngine } from '../engine/audio.ts';
import type { Input } from '../engine/input.ts';
import { VIEW_H, VIEW_W, type Screen } from '../engine/screen.ts';
import { drawText, FONT_FAMILY, wrapText } from '../engine/text.ts';
import type { Line } from '../eras/types.ts';
import { speakerName, t, tr, type ScreenText } from '../i18n/index.ts';
import { Speaker, type SpeakerName } from './speakers.ts';

/** Rounded dark panel with a thin gold border, in logical UI units. */
export function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha = 0.86): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fillStyle = `rgba(14, 16, 32, ${alpha})`;
  ctx.fill();
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = 'rgba(232, 200, 120, 0.85)';
  ctx.stroke();
  ctx.restore();
}

interface ParsedLine {
  /** The speaker as written in the script (it picks the name's color). */
  speaker: string | null;
  /** The speaker's name and the line, translated and with button glyphs filled in. */
  name: string;
  text: string;
}

/** Rows of text that fit in the dialogue box; a longer line continues on another page. */
const DIALOGUE_ROWS = 3;

const SPEAKER_COLORS: Partial<Record<SpeakerName, string>> = {
  [Speaker.Andrew]: '#7fd8ff',
  [Speaker.Nora]: '#ffb37a',
  [Speaker.NoraRadio]: '#ffb37a',
  [Speaker.Pip]: '#f0c060',
  [Speaker.Pike]: '#c9a0ff',
  [Speaker.Lautaro]: '#ff8a6a',
  [Speaker.BrotherAlbert]: '#e8e0cc',
  [Speaker.BrotherThomas]: '#e8e0cc',
};

export function speakerColor(speaker: string): string {
  return SPEAKER_COLORS[speaker as SpeakerName] ?? '#f1c232';
}

/** Bottom-of-screen dialogue box with a typewriter effect. */
export class DialogueBox {
  private lines: ParsedLine[] = [];
  private index = 0;
  private shown = 0;
  private resolve: (() => void) | null = null;
  private wrapped: string[] | null = null;
  private blipTimer = 0;
  /** Called for every line shown (the journal), with the untranslated text. */
  onLine: ((speaker: string | null, text: ScreenText) => void) | null = null;
  /** Rewrites text before showing it (button glyphs). */
  format: (text: string) => string = (text) => text;

  get active(): boolean {
    return this.resolve !== null;
  }

  open(lines: Line[]): Promise<void> {
    for (const line of lines) {
      if (typeof line === 'string') this.onLine?.(null, line);
      else this.onLine?.(line[0], line[1]);
    }
    this.lines = lines.map((line) => {
      const [speaker, text] = typeof line === 'string' ? [null, line] : line;
      return { speaker, name: speaker ? speakerName(speaker) : '', text: this.format(tr(text)) };
    });
    this.index = 0;
    this.shown = 0;
    this.wrapped = null;
    if (this.lines.length === 0) return Promise.resolve();
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  update(dt: number, input: Input, audio: AudioEngine): void {
    if (!this.resolve) return;
    const line = this.lines[this.index];
    if (this.shown < line.text.length) {
      this.shown = Math.min(line.text.length, this.shown + dt * 55);
      this.blipTimer -= dt;
      if (this.blipTimer <= 0 && line.speaker) {
        audio.sfx('blip');
        this.blipTimer = 0.07;
      }
    }
    if (input.consume('interact')) {
      if (this.shown < line.text.length) {
        this.shown = line.text.length;
      } else if (this.index < this.lines.length - 1) {
        this.index++;
        this.shown = 0;
        this.wrapped = null;
      } else {
        const resolve = this.resolve;
        this.resolve = null;
        resolve();
      }
    }
  }

  draw(screen: Screen, time: number): void {
    if (!this.resolve) return;
    const line = this.lines[this.index];
    const x = 8;
    const y = VIEW_H - 50;
    const w = VIEW_W - 16;
    drawPanel(screen.ui, x, y, w, 44);
    if (line.speaker) {
      const color = speakerColor(line.speaker);
      drawPanel(screen.ui, x + 6, y - 8, Math.min(120, line.name.length * 5 + 10), 12, 1);
      drawText(screen.ui, line.name, x + 11, y - 6, { color, bold: true });
    }
    if (!this.wrapped) {
      this.wrapped = wrapText(screen.ui, line.text, w - 16);
      // Too long for the box (translations run longer): the rest becomes the next page, same speaker.
      if (this.wrapped.length > DIALOGUE_ROWS) {
        const rest = this.wrapped.slice(DIALOGUE_ROWS).join(' ');
        this.wrapped = this.wrapped.slice(0, DIALOGUE_ROWS);
        line.text = this.wrapped.join(' ');
        this.lines.splice(this.index + 1, 0, { ...line, text: rest });
      }
    }
    let remaining = Math.floor(this.shown);
    this.wrapped.forEach((text, i) => {
      const visible = text.slice(0, Math.max(0, remaining));
      remaining -= text.length + 1;
      drawText(screen.ui, visible, x + 8, y + 8 + i * 10, { color: line.speaker ? '#f4f1de' : '#b8c4d8' });
    });
    if (this.shown >= line.text.length && Math.floor(time * 3) % 2 === 0) {
      screen.ui.fillStyle = '#e8c878';
      screen.ui.beginPath();
      screen.ui.moveTo(x + w - 11, y + 35);
      screen.ui.lineTo(x + w - 5, y + 35);
      screen.ui.lineTo(x + w - 8, y + 39);
      screen.ui.fill();
    }
  }
}

/** Vertical list of options, e.g. the time machine's destination picker. */
export class ChoiceMenu {
  private prompt = '';
  private options: string[] = [];
  private index = 0;
  private resolve: ((index: number) => void) | null = null;

  get active(): boolean {
    return this.resolve !== null;
  }

  open(prompt: ScreenText, options: ScreenText[]): Promise<number> {
    this.prompt = tr(prompt);
    this.options = options.map(tr);
    this.index = 0;
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  update(input: Input, audio: AudioEngine): void {
    if (!this.resolve) return;
    if (input.consume('up')) {
      this.index = (this.index + this.options.length - 1) % this.options.length;
      audio.sfx('blip');
    }
    if (input.consume('down')) {
      this.index = (this.index + 1) % this.options.length;
      audio.sfx('blip');
    }
    if (input.consume('interact')) {
      audio.sfx('select');
      const resolve = this.resolve;
      this.resolve = null;
      resolve(this.index);
    }
  }

  draw(screen: Screen, time: number): void {
    if (!this.resolve) return;
    const ui = screen.ui;
    // Size the panel to its content and wrap options that would not fit on one line.
    const maxText = VIEW_W - 60;
    const lines = this.options.map((option) => wrapText(ui, option, maxText));
    ui.font = `8px ${FONT_FAMILY}`;
    const widest = Math.max(ui.measureText(this.prompt).width, ...lines.flat().map((l) => ui.measureText(l).width));
    const w = Math.min(VIEW_W - 20, Math.max(160, widest + 34));
    const h = 22 + lines.reduce((sum, l) => sum + l.length * 10 + 2, 0);
    const x = (VIEW_W - w) / 2;
    const y = Math.max(6, (VIEW_H - h) / 2 - 10);
    drawPanel(ui, x, y, w, h, 0.94);
    drawText(ui, this.prompt, x + 10, y + 6, { color: '#f1c232', bold: true });
    let oy = y + 19;
    lines.forEach((optionLines, i) => {
      const selected = i === this.index;
      const height = optionLines.length * 10;
      if (selected) {
        ui.fillStyle = 'rgba(127, 216, 255, 0.18)';
        ui.fillRect(x + 4, oy - 2, w - 8, height + 1);
      }
      const marker = selected ? (Math.floor(time * 4) % 2 ? '>' : '»') : ' ';
      optionLines.forEach((line, j) => {
        drawText(ui, `${j === 0 ? marker : ' '} ${line}`, x + 10, oy + j * 10, { color: selected ? '#ffffff' : '#9aa6bb' });
      });
      oy += height + 2;
    });
  }
}

/** Waits that resolve on the game clock instead of wall time, so pausing freezes them. */
export class Timers {
  private timers: Array<{ left: number; resolve: () => void }> = [];

  wait(seconds: number): Promise<void> {
    return new Promise((resolve) => this.timers.push({ left: seconds, resolve }));
  }

  update(dt: number): void {
    if (this.timers.length === 0) return;
    const done: Array<() => void> = [];
    this.timers = this.timers.filter((timer) => {
      timer.left -= dt;
      if (timer.left <= 0) {
        done.push(timer.resolve);
        return false;
      }
      return true;
    });
    done.forEach((resolve) => resolve());
  }

  /** Resolves everything immediately (used when skipping a cinematic). */
  flush(): void {
    const all = this.timers;
    this.timers = [];
    all.forEach((timer) => timer.resolve());
  }
}

/** Four-digit year entry: up/down change a digit, left/right move between digits. */
export class YearPicker {
  private digits = [2, 0, 0, 0];
  private index = 0;
  private prompt = '';
  private resolve: ((year: number) => void) | null = null;

  get active(): boolean {
    return this.resolve !== null;
  }

  open(prompt: ScreenText, start: number): Promise<number> {
    this.prompt = tr(prompt);
    this.digits = String(Math.max(0, Math.min(9999, start))).padStart(4, '0').split('').map(Number);
    this.index = 0;
    return new Promise((resolve) => {
      this.resolve = resolve;
    });
  }

  update(input: Input, audio: AudioEngine): void {
    if (!this.resolve) return;
    if (input.consume('left')) this.index = (this.index + 3) % 4;
    if (input.consume('right')) this.index = (this.index + 1) % 4;
    if (input.consume('up')) this.digits[this.index] = (this.digits[this.index] + 1) % 10;
    if (input.consume('down')) this.digits[this.index] = (this.digits[this.index] + 9) % 10;
    if (input.consume('interact')) {
      audio.sfx('select');
      const resolve = this.resolve;
      this.resolve = null;
      resolve(Number(this.digits.join('')));
    }
  }

  draw(screen: Screen, time: number): void {
    if (!this.resolve) return;
    const ui = screen.ui;
    const w = 200;
    const h = 70;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2 - 10;
    drawPanel(ui, x, y, w, h, 0.95);
    drawText(ui, this.prompt, VIEW_W / 2, y + 7, { size: 7, align: 'center', bold: true, color: '#f1c232' });
    this.digits.forEach((digit, i) => {
      const dx = VIEW_W / 2 - 42 + i * 22;
      const selected = i === this.index;
      ui.fillStyle = selected ? 'rgba(127,216,255,0.2)' : 'rgba(255,255,255,0.05)';
      ui.fillRect(dx - 2, y + 22, 18, 24);
      drawText(ui, String(digit), dx + 7, y + 25, { size: 16, bold: true, align: 'center', color: selected ? '#ffffff' : '#9aa6bb' });
      if (selected && Math.floor(time * 3) % 2 === 0) {
        drawText(ui, '▲', dx + 7, y + 15, { size: 6, align: 'center', color: '#7fd8ff', shadow: null });
        drawText(ui, '▼', dx + 7, y + 47, { size: 6, align: 'center', color: '#7fd8ff', shadow: null });
      }
    });
    drawText(ui, t('Up/Down change · Left/Right move · Confirm'), VIEW_W / 2, y + h - 10, { size: 5.5, align: 'center', color: '#9aa6bb' });
  }
}
