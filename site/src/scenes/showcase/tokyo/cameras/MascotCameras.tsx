import { BlendHints } from '@pmndrs/klipp';
import { Aim, Body, VirtualCamera } from '@pmndrs/klipp/react';
import { useGLTF } from '@react-three/drei';
import { Euler, Quaternion } from 'three';

import type { Vec3 } from '../../ShowcaseProps';
import { townUrl } from '../model';

// Square to the town's front, looking 60° down at the stall. The composer slides the camera and keeps this direction.
const tilt = Math.PI / 3;
const distance = 1;
const view = new Quaternion().setFromEuler(new Euler(-tilt, 0, 0));
// Where the sliding camera settles over the middle of the mascot's run, so the turning one starts in the same spot.
const position: Vec3 = [1.42, -0.98 + Math.sin(tilt) * distance, 2.2 + Math.cos(tilt) * distance];

/** Turns after the mascot from where the sliding camera starts. */
export function TurningCamera({ live }: { live: boolean }) {
  const { nodes } = useGLTF(townUrl);
  return (
    <VirtualCamera
      name="mascot-turn"
      priority={20}
      active={live}
      initialState={{ position, quaternion: view, fov: 40 }}
      hints={BlendHints.sphericalPosition}>
      <Aim.RotationComposer target={nodes.body} damping={0.2} />
    </VirtualCamera>
  );
}

/** Slides after the mascot without turning. */
export function SlidingCamera({ live }: { live: boolean }) {
  const { nodes } = useGLTF(townUrl);
  return (
    <VirtualCamera
      name="mascot-slide"
      priority={20}
      active={live}
      initialState={{ position, quaternion: view, fov: 40 }}
      hints={BlendHints.sphericalPosition}>
      <Body.PositionComposer target={nodes.body} cameraDistance={distance} damping={0.2} />
    </VirtualCamera>
  );
}
