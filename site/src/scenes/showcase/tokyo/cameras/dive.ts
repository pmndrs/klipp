import type { Vec3 } from '../../ShowcaseProps';

// Straight at the birds, over them, straight down into the alley's bend and out of it next to the cat.
export const divePath: Vec3[] = [
  [-0.3, 2.8, -2],
  [0.6, 3.5, 0.33],
  [0.63, 1.2, 0.4],
  [0.65, -0.35, 0.4],
  [0.75, -0.5, 2],
  [1.2, -0.5, 2.2],
];
export const diveEnd = divePath.length - 1;
/** How quickly the camera and everything that goes with its drop catch up with the scroll. */
export const diveDamping = 0.75;

// Knots where the drop starts and lands.
const dropFrom = 1;
const dropTo = 3;

// Knots between which the path runs straight down: past the top's turn, before the bend at the bottom.
const fallFrom = 0.8;
const fallTo = 2.6;
const fallEdge = 0.3;

const smoothstep = (from: number, to: number, value: number) => {
  const t = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
};

/** How far into the drop the dive is at `progress`: `0` outside it, rising to `1` halfway down. */
export function dropAt(progress: number): number {
  const drop = Math.min(Math.max((progress * diveEnd - dropFrom) / (dropTo - dropFrom), 0), 1);
  return Math.sin(drop * Math.PI);
}

/** `1` while the dive falls straight down at `progress`, `0` before it and from the bend at the bottom on. */
export function fallAt(progress: number): number {
  const knot = progress * diveEnd;
  return smoothstep(fallFrom, fallFrom + fallEdge, knot) * (1 - smoothstep(fallTo - fallEdge, fallTo, knot));
}
