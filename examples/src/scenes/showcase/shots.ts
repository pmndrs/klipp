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
  { name: 'Emblem', position: [3.1, 1, 3.25], lookAt: [0.4, -1, 2.2], fov: 20, hold: 0.1 },
  { name: 'Lamp', position: [0.6, -0.2, 3.8], lookAt: [-0.25, 0.05, 0.4], fov: 75, hold: 0 },
  {
    name: 'Wheel',
    position: [-3.2, -0.7, 2.6],
    lookAt: [0.25, -0.49, 2.22],
    fov: 30,
    hold: 0,
    blend: { damping: 0.35, maxSpeed: 0.7 },
  },
  {
    name: 'Side',
    position: [-20, 6, 13.5],
    lookAt: [-0.45, 0.1, 0],
    fov: 18,
    hold: 0,
    blend: { damping: 0.35, maxSpeed: 0.7 },
  },
  {
    name: 'Back lamp',
    position: [2, 10.7, -21],
    lookAt: [-1.8, -0.9, -1.6],
    fov: 5,
    hold: 0,
    blend: { damping: 0.35, maxSpeed: 0.7 },
  },
  { name: 'Front', position: [9.25, -0.35, 13.6], lookAt: [-0.3, 0, 0.4], fov: 17, hold: 0 },
];
