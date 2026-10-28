import { clamp, vec3, type Vec3 } from 'math';

/** How a position along a spline is measured: distance from the start, `0`-`1` of its length, or knot index. */
export type SplinePositionUnits = 'distance' | 'normalized' | 'knot';

/** A centripetal Catmull-Rom curve through `knots`, the same curve as three's default `CatmullRomCurve3`. */
export type Spline = {
  knots: Vec3[];
  closed: boolean;
  segmentCount: number;
  length: number;
  /** Cubic coefficients per segment: c0-c3 for x, then y, then z. */
  coefficients: number[];
  /** Distance from the start at evenly spaced steps through each segment, plus the end. */
  arcLengths: number[];
};

const samplesPerSegment = 32;

const before: Vec3 = [0, 0, 0];
const after: Vec3 = [0, 0, 0];
const previous: Vec3 = [0, 0, 0];
const current: Vec3 = [0, 0, 0];
const chord: Vec3 = [0, 0, 0];
const toPoint: Vec3 = [0, 0, 0];

/** Builds the curve and its length table once; knots changed later need a new `create`. */
export function create(knots: readonly Vec3[], closed = false): Spline {
  const count = knots.length;
  const segmentCount = count < 2 ? 0 : closed ? count : count - 1;
  const spline: Spline = {
    knots: knots.map((knot) => vec3.clone(knot)),
    closed,
    segmentCount,
    length: 0,
    coefficients: new Array<number>(segmentCount * 12).fill(0),
    arcLengths: new Array<number>(segmentCount * samplesPerSegment + 1).fill(0),
  };
  for (let segment = 0; segment < segmentCount; segment++) buildSegment(spline, segment);
  measure(spline);
  return spline;
}

function buildSegment(spline: Spline, segment: number): void {
  const { knots, closed } = spline;
  const count = knots.length;
  const p1 = knots[segment % count];
  const p2 = knots[(segment + 1) % count];
  // An open spline's ends get a mirrored neighbour, so the curve leaves them heading straight at the next knot.
  const p0 = closed || segment > 0 ? knots[(segment - 1 + count) % count] : mirror(before, knots[0], knots[1]);
  const p3 =
    closed || segment + 2 < count ? knots[(segment + 2) % count] : mirror(after, knots[count - 1], knots[count - 2]);

  let dt0 = Math.pow(vec3.squaredDistance(p0, p1), 0.25);
  let dt1 = Math.pow(vec3.squaredDistance(p1, p2), 0.25);
  let dt2 = Math.pow(vec3.squaredDistance(p2, p3), 0.25);
  if (dt1 < 1e-4) dt1 = 1;
  if (dt0 < 1e-4) dt0 = dt1;
  if (dt2 < 1e-4) dt2 = dt1;

  for (let axis = 0; axis < 3; axis++) {
    const x0 = p0[axis];
    const x1 = p1[axis];
    const x2 = p2[axis];
    const x3 = p3[axis];
    const t1 = ((x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1) * dt1;
    const t2 = ((x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2) * dt1;
    const offset = segment * 12 + axis * 4;
    spline.coefficients[offset] = x1;
    spline.coefficients[offset + 1] = t1;
    spline.coefficients[offset + 2] = -3 * x1 + 3 * x2 - 2 * t1 - t2;
    spline.coefficients[offset + 3] = 2 * x1 - 2 * x2 + t1 + t2;
  }
}

const mirror = (out: Vec3, end: Vec3, next: Vec3): Vec3 => vec3.subtract(out, vec3.scale(out, end, 2), next);

function measure(spline: Spline): void {
  const { arcLengths, segmentCount } = spline;
  if (segmentCount === 0) return;
  evaluate(previous, spline, 0);
  for (let i = 1; i < arcLengths.length; i++) {
    evaluate(current, spline, i / samplesPerSegment);
    arcLengths[i] = arcLengths[i - 1] + vec3.distance(previous, current);
    vec3.copy(previous, current);
  }
  spline.length = arcLengths[arcLengths.length - 1];
}

/** Point at `knot` in knot units, which must be within `[0, segmentCount]`. */
function evaluate(out: Vec3, spline: Spline, knot: number): Vec3 {
  const segment = Math.min(Math.floor(knot), spline.segmentCount - 1);
  const t = knot - segment;
  const c = spline.coefficients;
  for (let axis = 0; axis < 3; axis++) {
    const o = segment * 12 + axis * 4;
    out[axis] = c[o] + t * (c[o + 1] + t * (c[o + 2] + t * c[o + 3]));
  }
  return out;
}

function derivative(out: Vec3, spline: Spline, knot: number): Vec3 {
  const segment = Math.min(Math.floor(knot), spline.segmentCount - 1);
  const t = knot - segment;
  const c = spline.coefficients;
  for (let axis = 0; axis < 3; axis++) {
    const o = segment * 12 + axis * 4;
    out[axis] = c[o + 1] + t * (2 * c[o + 2] + 3 * t * c[o + 3]);
  }
  return out;
}

/** Knot position at `distance`, which must be within `[0, length]`. */
function distanceToKnot(spline: Spline, distance: number): number {
  const lengths = spline.arcLengths;
  let low = 0;
  let high = lengths.length - 2;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (lengths[middle] <= distance) low = middle;
    else high = middle - 1;
  }
  const span = lengths[low + 1] - lengths[low];
  return (low + (span > 0 ? (distance - lengths[low]) / span : 0)) / samplesPerSegment;
}

/** Distance at `knot`, which must be within `[0, segmentCount]`. */
function knotToDistance(spline: Spline, knot: number): number {
  const lengths = spline.arcLengths;
  const step = knot * samplesPerSegment;
  const index = Math.min(Math.floor(step), lengths.length - 2);
  return lengths[index] + (step - index) * (lengths[index + 1] - lengths[index]);
}

/** The end of the spline in `units`: its length, `1`, or its segment count. */
export function maxPosition(spline: Spline, units: SplinePositionUnits): number {
  if (units === 'distance') return spline.length;
  if (units === 'normalized') return 1;
  return spline.segmentCount;
}

/** `position` on the spline: wrapped around a closed one, clamped to the ends of an open one. */
export function standardize(spline: Spline, position: number, units: SplinePositionUnits): number {
  const max = maxPosition(spline, units);
  if (!(max > 0)) return 0;
  if (!spline.closed) return clamp(position, 0, max);
  const wrapped = position % max;
  return wrapped < 0 ? wrapped + max : wrapped;
}

/** Distance from the start at `position` in `units`. */
export function toDistance(spline: Spline, position: number, units: SplinePositionUnits): number {
  if (spline.segmentCount === 0) return 0;
  const standard = standardize(spline, position, units);
  if (units === 'distance') return standard;
  if (units === 'normalized') return standard * spline.length;
  return knotToDistance(spline, standard);
}

/** Position in `units` at `distance` from the start. */
export function fromDistance(spline: Spline, distance: number, units: SplinePositionUnits): number {
  if (spline.segmentCount === 0) return 0;
  const standard = standardize(spline, distance, 'distance');
  if (units === 'distance') return standard;
  if (units === 'normalized') return spline.length > 0 ? standard / spline.length : 0;
  return distanceToKnot(spline, standard);
}

/** Point at `distance` from the start. */
export function pointAt(out: Vec3, spline: Spline, distance: number): Vec3 {
  if (spline.segmentCount === 0) return spline.knots.length > 0 ? vec3.copy(out, spline.knots[0]) : vec3.zero(out);
  return evaluate(out, spline, distanceToKnot(spline, standardize(spline, distance, 'distance')));
}

/** Unit direction of travel at `distance` from the start, or zero where the curve stands still. */
export function tangentAt(out: Vec3, spline: Spline, distance: number): Vec3 {
  if (spline.segmentCount === 0) return vec3.zero(out);
  derivative(out, spline, distanceToKnot(spline, standardize(spline, distance, 'distance')));
  return vec3.normalize(out, out);
}

let bestKnot = 0;
let bestDistance = Infinity;

function sample(spline: Spline, point: Vec3, knot: number): void {
  const distance = vec3.squaredDistance(evaluate(current, spline, knot), point);
  if (distance < bestDistance) {
    bestDistance = distance;
    bestKnot = knot;
  }
}

/** Tries the foot of `point` on the chord from `knot` to `side` knots away, exact where the curve runs straight. */
function sampleChord(spline: Spline, point: Vec3, knot: number, side: number): void {
  evaluate(previous, spline, knot);
  evaluate(current, spline, standardize(spline, knot + side, 'knot'));
  vec3.subtract(chord, current, previous);
  const lengthSquared = vec3.squaredLength(chord);
  if (lengthSquared === 0) return;
  const t = clamp(vec3.dot(vec3.subtract(toPoint, point, previous), chord) / lengthSquared, 0, 1);
  sample(spline, point, standardize(spline, knot + side * t, 'knot'));
}

/**
 * Distance from the start to the point of the spline nearest to `point`. Samples every segment `resolution` times,
 * then `iterations` times samples more finely around the best sample.
 */
export function nearest(spline: Spline, point: Vec3, resolution = 4, iterations = 2): number {
  const { segmentCount } = spline;
  if (segmentCount === 0) return 0;
  const samples = Math.max(1, Math.round(resolution));
  let step = 1 / samples;
  bestKnot = 0;
  bestDistance = Infinity;
  for (let i = 0; i <= segmentCount * samples; i++) sample(spline, point, i * step);
  for (let iteration = 0; iteration < iterations; iteration++) {
    const around = bestKnot;
    step /= samples;
    for (let i = -samples; i <= samples; i++) sample(spline, point, standardize(spline, around + i * step, 'knot'));
  }
  const around = bestKnot;
  sampleChord(spline, point, around, -step);
  sampleChord(spline, point, around, step);
  return knotToDistance(spline, bestKnot);
}
