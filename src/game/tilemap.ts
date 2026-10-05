import type { Facing, Route } from '../eras/types.ts';
import type { TileDef, TileSet } from './tiledefs.ts';

export const TILE = 16;

export interface TilePoint {
  tx: number;
  ty: number;
}

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const SOLID_EDGE: TileDef = { look: 'cliff', solid: true };

/**
 * Grid of tile characters. Uppercase letters and digits in the source rows are
 * markers: they are replaced by their base tile and their positions are recorded.
 */
export class TileMap {
  readonly width: number;
  readonly height: number;
  readonly tileset: TileSet;
  private readonly cells: string[][];
  private readonly markers = new Map<string, TilePoint[]>();
  /** Bumped whenever a tile changes so renderers know to repaint. */
  version = 0;

  constructor(
    rows: readonly string[],
    tileset: TileSet,
    markerBase: Record<string, string>,
    defaultTile: string,
  ) {
    this.tileset = tileset;
    this.height = rows.length;
    this.width = Math.max(...rows.map((row) => row.length));
    this.cells = rows.map((row, ty) => {
      const cells = row.padEnd(this.width, defaultTile).split('');
      return cells.map((ch, tx) => {
        if (/[A-Z0-9]/.test(ch)) {
          const list = this.markers.get(ch) ?? [];
          list.push({ tx, ty });
          this.markers.set(ch, list);
          return markerBase[ch] ?? defaultTile;
        }
        return ch;
      });
    });
  }

  get(tx: number, ty: number): string {
    return this.cells[ty]?.[tx] ?? '';
  }

  set(tx: number, ty: number, ch: string): void {
    if (!this.inBounds(tx, ty) || this.cells[ty][tx] === ch) return;
    this.cells[ty][tx] = ch;
    this.version++;
  }

  def(tx: number, ty: number): TileDef {
    return this.tileset[this.get(tx, ty)] ?? SOLID_EDGE;
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  isSolid(tx: number, ty: number): boolean {
    return this.def(tx, ty).solid;
  }

  defAt(x: number, y: number): TileDef {
    return this.def(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  /** True when any corner of the box overlaps a solid tile. */
  boxBlocked(x: number, y: number, halfW: number, halfH: number): boolean {
    const x0 = Math.floor((x - halfW) / TILE);
    const x1 = Math.floor((x + halfW - 0.01) / TILE);
    const y0 = Math.floor((y - halfH) / TILE);
    const y1 = Math.floor((y + halfH - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) if (this.isSolid(tx, ty)) return true;
    }
    return false;
  }

  /**
   * One-way ledges: true when a box moving by (dx, dy) would overlap a ledge
   * tile while going against the ledge's direction.
   */
  ledgeBlocks(x: number, y: number, hw: number, hh: number, dx: number, dy: number): boolean {
    const x0 = Math.floor((x - hw) / TILE);
    const x1 = Math.floor((x + hw - 0.01) / TILE);
    const y0 = Math.floor((y - hh) / TILE);
    const y1 = Math.floor((y + hh - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const ledge = this.def(tx, ty).ledge;
        if (!ledge) continue;
        const d = FACING_VECTORS[ledge];
        if (d.x * dx + d.y * dy < 0) return true;
      }
    }
    return false;
  }

  /** Vision ray test: solid tiles block sight, except see-through ones like water. */
  lineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(dist / 4);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const def = this.defAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      if (def.solid && !def.seeThrough) return false;
    }
    return true;
  }

  /** Distance a ray travels before hitting something that blocks sight. */
  rayLength(x: number, y: number, angle: number, max: number): number {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (let d = 0; d < max; d += 3) {
      const def = this.defAt(x + dx * d, y + dy * d);
      if (def.solid && !def.seeThrough) return d;
    }
    return max;
  }

  marker(ch: string): TilePoint {
    const found = this.markers.get(ch)?.[0];
    if (!found) throw new Error(`Map marker "${ch}" not found.`);
    return found;
  }

  /** Every occurrence of a marker, in reading order (top to bottom, left to right). */
  markerAll(ch: string): TilePoint[] {
    const list = this.markers.get(ch);
    if (!list) throw new Error(`Map marker "${ch}" not found.`);
    return [...list];
  }

  hasMarker(ch: string): boolean {
    return this.markers.has(ch);
  }

  /**
   * Whether something about as wide as a person can walk straight from the middle of tile `a`
   * to the middle of tile `b` without brushing anything `passable` rejects.
   */
  straightWalk(a: TilePoint, b: TilePoint, passable: (tx: number, ty: number) => boolean): boolean {
    const ax = a.tx * TILE + TILE / 2;
    const ay = a.ty * TILE + TILE / 2;
    const dx = b.tx * TILE + TILE / 2 - ax;
    const dy = b.ty * TILE + TILE / 2 - ay;
    const len = Math.hypot(dx, dy);
    if (len === 0) return true;
    // Check the center line and both shoulders.
    const nx = (-dy / len) * 5;
    const ny = (dx / len) * 5;
    for (let d = 0; d <= len; d += 4) {
      const x = ax + (dx * d) / len;
      const y = ay + (dy * d) / len;
      for (const side of [0, 1, -1]) {
        if (!passable(Math.floor((x + nx * side) / TILE), Math.floor((y + ny * side) / TILE))) return false;
      }
    }
    return true;
  }

  /** The tiles a route visits, in order; null for a marker the map doesn't have. */
  routeTiles(route: Route): Array<TilePoint | null> {
    const stops = typeof route === 'string' ? route.split('') : route;
    return stops.map((stop) => {
      if (typeof stop !== 'string') return { tx: stop[0], ty: stop[1] };
      return this.hasMarker(stop) ? this.marker(stop) : null;
    });
  }

  /** Bounding box of every occurrence of a marker — used to define areas with two corners. */
  markerArea(ch: string): TileRect {
    const list = this.markers.get(ch);
    if (!list) throw new Error(`Map marker "${ch}" not found.`);
    const xs = list.map((p) => p.tx);
    const ys = list.map((p) => p.ty);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x + 1, h: Math.max(...ys) - y + 1 };
  }
}

export const FACING_VECTORS: Record<Facing, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const tileCenter = (p: TilePoint): { x: number; y: number } => ({
  x: p.tx * TILE + TILE / 2,
  y: p.ty * TILE + TILE / 2,
});
