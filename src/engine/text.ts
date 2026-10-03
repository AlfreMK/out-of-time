export const FONT_FAMILY = 'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace';

export interface TextStyle {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  bold?: boolean;
  shadow?: string | null;
  alpha?: number;
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, style: TextStyle = {}): void {
  const { size = 8, color = '#f4f1de', align = 'left', bold = false, shadow = 'rgba(0,0,0,0.85)', alpha = 1 } = style;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT_FAMILY}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(text, x + size / 10, y + size / 10);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Greedy word wrap using the given font size. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size = 8, bold = false): string[] {
  ctx.save();
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT_FAMILY}`;
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  ctx.restore();
  return lines;
}
