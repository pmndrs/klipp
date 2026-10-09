import { clamp, type Vec3 } from 'math';

/** A horizontal ring around the target. */
export type Orbit = {
  /** Horizontal distance from the target. */
  radius: number;
  /** Height above the target. */
  height: number;
};

export type Orbits = { top: Orbit; center: Orbit; bottom: Orbit };

/** A smooth curve through the rings, as `[height, radius]` knots with Bezier control points between them. */
export type ThreeRingState = {
  /** An extrapolated end, bottom, center, top and another extrapolated end. */
  knots: number[];
  ctrl1: number[];
  ctrl2: number[];
  /** Settings the curve was built for. */
  builtFor: number[];
};

const knotCount = 5;

export const createState = (): ThreeRingState => ({
  knots: new Array<number>(knotCount * 2).fill(0),
  ctrl1: new Array<number>(knotCount * 2).fill(0),
  ctrl2: new Array<number>(knotCount * 2).fill(0),
  builtFor: new Array<number>(7).fill(Number.NaN),
});

function isBuiltFor(state: ThreeRingState, orbits: Orbits, splineCurvature: number): boolean {
  const built = state.builtFor;
  return (
    built[0] === orbits.bottom.height &&
    built[1] === orbits.bottom.radius &&
    built[2] === orbits.center.height &&
    built[3] === orbits.center.radius &&
    built[4] === orbits.top.height &&
    built[5] === orbits.top.radius &&
    built[6] === splineCurvature
  );
}

function setKnot(knots: number[], index: number, height: number, radius: number): void {
  knots[index * 2] = height;
  knots[index * 2 + 1] = radius;
}

const a = new Array<number>(knotCount).fill(0);
const b = new Array<number>(knotCount).fill(0);
const c = new Array<number>(knotCount).fill(0);
const r = new Array<number>(knotCount).fill(0);

// Solves for control points that keep the curve's first and second derivatives continuous across knots.
function computeControlPoints({ knots, ctrl1, ctrl2 }: ThreeRingState): void {
  const n = knotCount - 1;
  for (let axis = 0; axis < 2; axis++) {
    const k = (i: number): number => knots[i * 2 + axis];
    a[0] = 0;
    b[0] = 2;
    c[0] = 1;
    r[0] = k(0) + 2 * k(1);
    for (let i = 1; i < n - 1; i++) {
      a[i] = 1;
      b[i] = 4;
      c[i] = 1;
      r[i] = 4 * k(i) + 2 * k(i + 1);
    }
    a[n - 1] = 2;
    b[n - 1] = 7;
    c[n - 1] = 0;
    r[n - 1] = 8 * k(n - 1) + k(n);

    for (let i = 1; i < n; i++) {
      const m = a[i] / b[i - 1];
      b[i] -= m * c[i - 1];
      r[i] -= m * r[i - 1];
    }
    ctrl1[(n - 1) * 2 + axis] = r[n - 1] / b[n - 1];
    for (let i = n - 2; i >= 0; i--) ctrl1[i * 2 + axis] = (r[i] - c[i] * ctrl1[(i + 1) * 2 + axis]) / b[i];
    for (let i = 0; i < n - 1; i++) ctrl2[i * 2 + axis] = 2 * k(i + 1) - ctrl1[(i + 1) * 2 + axis];
    ctrl2[(n - 1) * 2 + axis] = 0.5 * (k(n) + ctrl1[(n - 1) * 2 + axis]);
  }
}

function build(state: ThreeRingState, orbits: Orbits, splineCurvature: number): void {
  const { bottom, center, top } = orbits;
  const { knots, builtFor } = state;
  setKnot(knots, 1, bottom.height, bottom.radius);
  setKnot(knots, 2, center.height, center.radius);
  setKnot(knots, 3, top.height, top.radius);
  // The ends continue past the outer rings and pull toward the target as the curvature grows.
  const keep = 1 - clamp(splineCurvature, 0, 1);
  setKnot(
    knots,
    0,
    keep * (1.5 * bottom.height - 0.5 * center.height),
    keep * (1.5 * bottom.radius - 0.5 * center.radius),
  );
  setKnot(knots, 4, keep * (1.5 * top.height - 0.5 * center.height), keep * (1.5 * top.radius - 0.5 * center.radius));
  computeControlPoints(state);

  builtFor[0] = bottom.height;
  builtFor[1] = bottom.radius;
  builtFor[2] = center.height;
  builtFor[3] = center.radius;
  builtFor[4] = top.height;
  builtFor[5] = top.radius;
  builtFor[6] = splineCurvature;
}

/**
 * Writes the point of the curve at `t` to `out` as `[0, height, radius]`: `0` is the bottom ring, `0.5` the center
 * ring and `1` the top ring. Rebuilds the curve only when the rings or the curvature changed.
 */
export function point(out: Vec3, state: ThreeRingState, orbits: Orbits, splineCurvature: number, t: number): Vec3 {
  if (!isBuiltFor(state, orbits, splineCurvature)) build(state, orbits, splineCurvature);
  const { knots, ctrl1, ctrl2 } = state;

  let s = clamp(t, 0, 1) * 2;
  let segment = 1;
  if (s > 1) {
    s -= 1;
    segment = 2;
  }
  const d = 1 - s;
  const w0 = d * d * d;
  const w1 = 3 * d * d * s;
  const w2 = 3 * d * s * s;
  const w3 = s * s * s;
  const i = segment * 2;
  const j = (segment + 1) * 2;
  out[0] = 0;
  out[1] = w0 * knots[i] + w1 * ctrl1[i] + w2 * ctrl2[i] + w3 * knots[j];
  out[2] = w0 * knots[i + 1] + w1 * ctrl1[i + 1] + w2 * ctrl2[i + 1] + w3 * knots[j + 1];
  return out;
}
