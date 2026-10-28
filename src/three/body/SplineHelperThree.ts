import type { Vec3 } from 'math';
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  type ColorRepresentation,
} from 'three';

import * as spline from '../../core/spline';
import type { SplineDollyBody } from '../../core/body/SplineDollyBody';
import type { Spline } from '../../core/spline';

const samplesPerSegment = 24;

const point: Vec3 = [0, 0, 0];

const pointsMaterial = (color: ColorRepresentation, size: number) =>
  new PointsMaterial({ color, size, sizeAttenuation: false, toneMapped: false });

/** Draws a `SplineDollyBody`'s path, its knots, and the point of the path the camera stands at. */
export class SplineHelperThree extends Group {
  readonly curve = new Line(new BufferGeometry(), new LineBasicMaterial({ color: '#ff9f1c', toneMapped: false }));
  readonly knots = new Points(new BufferGeometry(), pointsMaterial('#2ec4f1', 8));
  readonly marker = new Points(new BufferGeometry(), pointsMaterial('#ffffff', 12));
  private readonly markerPosition = new Float32Array(3);
  private drawn: Spline | null = null;

  constructor() {
    super();
    this.marker.geometry.setAttribute('position', new BufferAttribute(this.markerPosition, 3));
    this.marker.frustumCulled = false;
    this.add(this.curve, this.knots, this.marker);
  }

  /** Redraws the path when `body` rides a new one, and moves the marker to where the camera stands. */
  sync(body: SplineDollyBody<unknown>): void {
    const path = body.spline;
    this.visible = path !== null;
    if (!path) return;
    if (path !== this.drawn) this.draw(path);
    this.markerPosition.set(spline.pointAt(point, path, body.state.distance));
    this.marker.geometry.getAttribute('position').needsUpdate = true;
  }

  dispose(): void {
    for (const object of [this.curve, this.knots, this.marker]) {
      object.geometry.dispose();
      object.material.dispose();
    }
  }

  private draw(path: Spline): void {
    this.drawn = path;
    const samples = Math.max(1, path.segmentCount * samplesPerSegment);
    const curve = new Float32Array((samples + 1) * 3);
    for (let i = 0; i <= samples; i++) curve.set(spline.pointAt(point, path, (path.length * i) / samples), i * 3);
    this.curve.geometry.setAttribute('position', new BufferAttribute(curve, 3));
    this.curve.geometry.computeBoundingSphere();

    const knots = new Float32Array(path.knots.length * 3);
    path.knots.forEach((knot, i) => knots.set(knot, i * 3));
    this.knots.geometry.setAttribute('position', new BufferAttribute(knots, 3));
    this.knots.geometry.computeBoundingSphere();
  }
}
