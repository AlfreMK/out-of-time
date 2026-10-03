import type { TilePoint } from './tilemap.ts';

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/**
 * Breadth-first search on a 4-connected grid. Maps are small (48x44), so BFS is
 * plenty fast and always finds the shortest path. Returns the path excluding the
 * start tile, or null when unreachable.
 */
export function findPath(
  from: TilePoint,
  to: TilePoint,
  width: number,
  height: number,
  passable: (tx: number, ty: number) => boolean,
): TilePoint[] | null {
  if (from.tx === to.tx && from.ty === to.ty) return [];
  const size = width * height;
  const prev = new Int32Array(size).fill(-1);
  const start = from.ty * width + from.tx;
  const goal = to.ty * width + to.tx;
  prev[start] = start;
  const queue: number[] = [start];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    if (cur === goal) break;
    const cx = cur % width;
    const cy = (cur - cx) / width;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (prev[next] !== -1) continue;
      if (next !== goal && !passable(nx, ny)) continue;
      prev[next] = cur;
      queue.push(next);
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
