import { createRef, type RefObject } from 'react';
import type { Mesh } from 'three';

export const memberRadius = 1;

export const memberOrbits = [
  { radius: 4, speed: 0.3, phase: 0, height: 0, color: '#21a9e0' },
  { radius: 9, speed: 0.45, phase: 1.3, height: 1.2, color: '#ff6b4a' },
  { radius: 6.5, speed: -0.35, phase: 2.6, height: -0.8, color: '#7ed957' },
  { radius: 18, speed: 0.22, phase: 4.2, height: 0.6, color: '#ffd23f' },
] as const;

export type GroupMember = { target: RefObject<Mesh | null>; radius: number };

/** One member per orbit of `OrbitingGroup`. */
export const createGroupMembers = (): GroupMember[] =>
  memberOrbits.map(() => ({ target: createRef<Mesh>(), radius: memberRadius }));
