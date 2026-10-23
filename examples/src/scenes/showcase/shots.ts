import type { BlendDefinition } from '@pmndrs/klipp';

export type Vec3 = [number, number, number];

export type CarShot = {
  name: string;
  /** Where the camera stands. The car stands around the origin, on the floor at `y = -1.16`. */
  position: Vec3;
  /** The point it looks at. */
  lookAt: Vec3;
  fov: number;
  /** Seconds on screen once the blend into it has finished. */
  hold: number;
  /** Blend into this shot, the sequence's `defaultBlend` if left out. */
  blend?: BlendDefinition;
};

export const shots: CarShot[] = [
  { name: 'Three-quarter', position: [0, 0, 12.5], lookAt: [0, 0, 0], fov: 30, hold: 2 },
  { name: 'Emblem', position: [3.11, 0.08, 3.27], lookAt: [0.38, -0.36, 2.21], fov: 30, hold: 0.1 },
  { name: 'Lamp', position: [0.46, -0.18, 3.71], lookAt: [-0.27, 0.07, 0.41], fov: 75, hold: 0 },
  {
    name: 'Wheel',
    position: [-2.61, -0.8, 2.6],
    lookAt: [0.25, -0.49, 2.22],
    fov: 30,
    hold: 0,
    blend: { damping: 0.35, maxSpeed: 0.7 },
  },
  { name: 'Side', position: [-11.38, 4.65, 7.64], lookAt: [-0.45, 0.1, 0.02], fov: 30, hold: 0 },
  { name: 'Back lamp', position: [2.18, 10.71, -21.15], lookAt: [-1.94, -0.9, -1.64], fov: 5, hold: 0 },
  { name: 'Front', position: [9.23, -0.36, 13.33], lookAt: [-0.28, 0.02, 0.4], fov: 17, hold: 0 },
];
