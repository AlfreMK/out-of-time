export type Palette = Record<string, string>;
export type Sprite = HTMLCanvasElement;

/**
 * Builds a small pixel-art image from ASCII art (used for UI icons). Each character maps to a palette color;
 * '.' (or any character missing from the palette) is transparent.
 */
export function makeSprite(rows: readonly string[], palette: Palette): Sprite {
  const width = Math.max(...rows.map((row) => row.length));
  const canvas = createCanvas(width, rows.length);
  const ctx = canvas.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return canvas;
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
