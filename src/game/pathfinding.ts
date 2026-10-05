import type { TilePoint } from './tilemap.ts';

/** Straight moves first, then diagonals: [dx, dy, cost]. */
const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const;

export interface PathOptions {
  /** Extra cost for stepping onto a tile (e.g. to keep a guard from walking right past the player). */
  cost?: (tx: number, ty: number) => number;
}

/**
 * A* on an 8-connected grid: diagonal steps are allowed only when both tiles beside the
 * corner are free, so nobody squeezes between two walls. Maps are small (64x60 at most),
 * so a simple binary heap is plenty. Returns the path excluding the start tile, or null
 * when unreachable. The goal tile itself may be impassable (e.g. a pebble on a crate).
 */
export function findPath(
  from: TilePoint,
  to: TilePoint,
  width: number,
  height: number,
  passable: (tx: number, ty: number) => boolean,
  options: PathOptions = {},
): TilePoint[] | null {
  if (from.tx === to.tx && from.ty === to.ty) return [];
  const size = width * height;
  const start = from.ty * width + from.tx;
  const goal = to.ty * width + to.tx;
  const prev = new Int32Array(size).fill(-1);
  const best = new Float64Array(size).fill(Infinity);
  const closed = new Uint8Array(size);
  const free = (tx: number, ty: number, index: number): boolean =>
    tx >= 0 && ty >= 0 && tx < width && ty < height && (index === goal || passable(tx, ty));
  const estimate = (tx: number, ty: number): number => {
    const dx = Math.abs(tx - to.tx);
    const dy = Math.abs(ty - to.ty);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };

  const heap = new MinHeap();
  best[start] = 0;
  prev[start] = start;
  heap.push(start, estimate(from.tx, from.ty));
  while (heap.size > 0) {
    const cur = heap.pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % width;
    const cy = (cur - cx) / width;
    for (const [dx, dy, step] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const next = ny * width + nx;
      if (!free(nx, ny, next) || closed[next]) continue;
      // No cutting corners: both tiles beside a diagonal step must be open.
      if (dx !== 0 && dy !== 0 && (!free(cx + dx, cy, cy * width + cx + dx) || !free(cx, cy + dy, (cy + dy) * width + cx))) continue;
      const g = best[cur] + step + (options.cost?.(nx, ny) ?? 0);
      if (g >= best[next]) continue;
      best[next] = g;
      prev[next] = cur;
      heap.push(next, g + estimate(nx, ny));
    }
  }
  if (prev[goal] === -1) return null;
  const path: TilePoint[] = [];
  for (let cur = goal; cur !== start; cur = prev[cur]) {
    const tx = cur % width;
    path.push({ tx, ty: (cur - tx) / width });
  }
  return path.reverse();
}

/**
 * Drops the waypoints a walker can skip by heading straight for a later one, so paths
 * become direct lines instead of tile-by-tile staircases. `clear` says whether the straight
 * segment between two tiles is walkable.
 */
export function smoothPath(from: TilePoint, path: TilePoint[], clear: (a: TilePoint, b: TilePoint) => boolean): TilePoint[] {
  const out: TilePoint[] = [];
  let anchor = from;
  let i = 0;
  while (i < path.length) {
    // The furthest waypoint still in a straight, open line from the anchor.
    let j = i;
    while (j + 1 < path.length && clear(anchor, path[j + 1])) j++;
    out.push(path[j]);
    anchor = path[j];
    i = j + 1;
  }
  return out;
}

class MinHeap {
  private readonly items: number[] = [];
  private readonly keys: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, key: number): void {
    const items = this.items;
    const keys = this.keys;
    let i = items.length;
    items.push(item);
    keys.push(key);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (keys[parent] <= key) break;
      items[i] = items[parent];
      keys[i] = keys[parent];
      i = parent;
    }
    items[i] = item;
    keys[i] = key;
  }

  pop(): number {
    const items = this.items;
    const keys = this.keys;
    const top = items[0];
    const lastItem = items.pop()!;
    const lastKey = keys.pop()!;
    const n = items.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        if (left >= n) break;
        const right = left + 1;
        const child = right < n && keys[right] < keys[left] ? right : left;
        if (keys[child] >= lastKey) break;
        items[i] = items[child];
        keys[i] = keys[child];
        i = child;
      }
      items[i] = lastItem;
      keys[i] = lastKey;
    }
    return top;
  }
}
