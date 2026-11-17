import { Vector3 } from 'three';

import type { Vec3 } from '../../ShowcaseProps';

/**
 * Looks from each knot of `path` toward its point in `picked`, pushed far ahead: a camera riding past the point it
 * looks at would flip around.
 */
export function lookAhead(path: Vec3[], picked: Vec3[]): { position: number; lookAt: Vec3 }[] {
  return picked.map((point, position) => {
    const from = new Vector3(...path[position]);
    const direction = new Vector3(...point).sub(from);
    // A point picked on the knot itself gives no direction, so it looks the way the path comes in.
    if (direction.lengthSq() < 1e-6) direction.copy(from).sub(new Vector3(...path[position - 1]));
    return { position, lookAt: direction.setLength(3).add(from).toArray() };
  });
}
