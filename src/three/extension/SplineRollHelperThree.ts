import { vec3, type Vec3 } from 'math';
import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments } from 'three';

import * as splineRoll from '../../core/extension/splineRoll';
import * as spline from '../../core/spline';
import type { SplineDollyLike } from '../../core/aim/SplineDollyLookAtTargetsAim';
import type { SplineRollExtension } from '../../core/extension/SplineRollExtension';
import type { Spline } from '../../core/spline';

const linesPerSegment = 8;
const worldUp: Vec3 = [0, 1, 0];
const point: Vec3 = [0, 0, 0];
const up: Vec3 = [0, 0, 0];

const isDolly = (body: unknown): body is SplineDollyLike =>
  body !== null && typeof body === 'object' && 'spline' in body && 'positionUnits' in body;

/** Draws the up direction along the path of a `SplineRollExtension`'s camera, banked by its roll. */
export class SplineRollHelperThree extends LineSegments<BufferGeometry, LineBasicMaterial> {
  private drawn: Spline | null = null;
  private positions = new Float32Array(0);

  constructor() {
    super(new BufferGeometry(), new LineBasicMaterial({ color: '#7ed957', toneMapped: false }));
    this.frustumCulled = false;
  }

  /** Moves the lines to the roll of this frame, along the path of the camera's Body. */
  sync(roll: SplineRollExtension): void {
    const body = roll.cameraBody;
    const path = isDolly(body) ? body.spline : null;
    this.visible = path !== null && path.segmentCount > 0;
    if (!path || !this.visible || !isDolly(body)) return;
    if (path !== this.drawn) this.allocate(path);
    const count = this.positions.length / 6;
    const size = (path.length / path.segmentCount) * 0.2;
    for (let i = 0; i < count; i++) {
      const distance = (path.length * i) / (count - 1);
      spline.pointAt(point, path, distance);
      this.positions.set(point, i * 6);
      splineRoll.upAt(up, worldUp, roll, path, body.positionUnits, distance);
      this.positions.set(vec3.scaleAndAdd(point, point, up, size), i * 6 + 3);
    }
    this.geometry.getAttribute('position').needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private allocate(path: Spline): void {
    this.drawn = path;
    this.positions = new Float32Array((path.segmentCount * linesPerSegment + 1) * 6);
    this.geometry.dispose();
    this.geometry = new BufferGeometry().setAttribute('position', new BufferAttribute(this.positions, 3));
  }
}
