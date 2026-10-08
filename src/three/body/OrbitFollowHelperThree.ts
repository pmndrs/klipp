import type { Vec3 } from 'math';
import { BufferAttribute, BufferGeometry, Color, LineBasicMaterial, LineSegments } from 'three';

import * as orbitFollow from '../../core/body/orbitFollow';
import type { OrbitFollowBody } from '../../core/body/OrbitFollowBody';

const circleSegments = 64;
const arcSegments = 32;
const maxVertices = (circleSegments * 4 + arcSegments) * 2;
const defaultRange: [number, number] = [-90, 90];

const previous: Vec3 = [0, 0, 0];
const next: Vec3 = [0, 0, 0];

/**
 * Draws an `OrbitFollowBody`'s orbit around its tracked point: the circle the camera moves along with `horizontal`,
 * the arc it moves along with `vertical`, and for `threeRing` also the three rings.
 */
export class OrbitFollowHelperThree extends LineSegments<BufferGeometry, LineBasicMaterial> {
  readonly colors = { horizontal: new Color('#ff9f1c'), vertical: new Color('#2ec4f1'), rings: new Color('#9a9aa8') };
  private readonly positions = new Float32Array(maxVertices * 3);
  private readonly vertexColors = new Float32Array(maxVertices * 3);
  private vertexCount = 0;

  constructor() {
    super(new BufferGeometry(), new LineBasicMaterial({ vertexColors: true, toneMapped: false }));
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new BufferAttribute(this.vertexColors, 3));
    this.frustumCulled = false;
  }

  /** Redraws the orbit from `body`'s last update. */
  sync(body: OrbitFollowBody<unknown>): void {
    const { horizontal, vertical } = body.state;
    const [min, max] = vertical.range ?? defaultRange;
    this.vertexCount = 0;

    if (body.orbitStyle === 'threeRing') {
      this.circle(body, min, this.colors.rings);
      this.circle(body, (min + max) / 2, this.colors.rings);
      this.circle(body, max, this.colors.rings);
    }
    this.circle(body, vertical.value, this.colors.horizontal);
    orbitFollow.point(previous, body.state, body, horizontal.value, min);
    for (let i = 1; i <= arcSegments; i++) {
      orbitFollow.point(next, body.state, body, horizontal.value, min + ((max - min) * i) / arcSegments);
      this.segment(this.colors.vertical);
    }

    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('color').needsUpdate = true;
    this.geometry.setDrawRange(0, this.vertexCount);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private circle(body: OrbitFollowBody<unknown>, vertical: number, color: Color): void {
    orbitFollow.point(previous, body.state, body, 0, vertical);
    for (let i = 1; i <= circleSegments; i++) {
      orbitFollow.point(next, body.state, body, (360 * i) / circleSegments, vertical);
      this.segment(color);
    }
  }

  /** Adds the segment from `previous` to `next`, then moves `previous` to `next`. */
  private segment(color: Color): void {
    const offset = this.vertexCount * 3;
    this.positions.set(previous, offset);
    this.positions.set(next, offset + 3);
    color.toArray(this.vertexColors, offset);
    color.toArray(this.vertexColors, offset + 3);
    this.vertexCount += 2;
    previous[0] = next[0];
    previous[1] = next[1];
    previous[2] = next[2];
  }
}
