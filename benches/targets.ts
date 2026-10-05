import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D } from 'three';

/** An `Object3D` that moves a little on every call, so damped pieces never settle. */
export function makeMovingTarget(): { object: Object3D; step: () => void } {
  const object = new Object3D();
  let t = 0;
  return {
    object,
    step: () => {
      t += 0.016;
      object.position.set(Math.sin(t) * 10, 2, Math.cos(t) * 10);
      object.rotation.set(0, t * 0.3, 0);
      object.updateMatrixWorld(true);
    },
  };
}

/** `makeMovingTarget` as a `Mesh`, so composers measure its size from the geometry. */
export function makeMovingMeshTarget(): { object: Mesh; step: () => void } {
  const object = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
  let t = 0;
  return {
    object,
    step: () => {
      t += 0.016;
      object.position.set(Math.sin(t) * 10, 2, Math.cos(t) * 10);
      object.rotation.set(0, t * 0.3, 0);
      object.updateMatrixWorld(true);
    },
  };
}

/** A target `depth` levels below a moving root. Matrices are left stale, as in a real frame before render. */
export function makeNestedTarget(depth: number): { object: Object3D; step: () => void } {
  const root = new Object3D();
  let leaf = root;
  for (let d = 0; d < depth; d++) {
    const child = new Object3D();
    child.position.set(0.1, 0.2, 0);
    child.rotation.set(0, 0.1, 0);
    leaf.add(child);
    leaf = child;
  }
  let t = 0;
  return {
    object: leaf,
    step: () => {
      t += 0.016;
      root.position.set(Math.sin(t) * 10, 2, Math.cos(t) * 10);
    },
  };
}
