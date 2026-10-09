import { Aim, Body, Extension, Klipp, VirtualCamera } from '@kvvasuu/klipp/react';
import type { GroupFramingFitMode, GroupFramingMode } from '@kvvasuu/klipp/three';
import { useControls } from 'leva';
import { useRef, useState } from 'react';
import type { Group } from 'three';

import { createGroupMembers } from '../../scene/groupMembers';
import { OrbitingGroup } from '../../scene/OrbitingGroup';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

export function GroupFraming() {
  const [members] = useState(createGroupMembers);
  const anchorRef = useRef<Group>(null);

  const { padding, damping, screenPositionX, screenPositionY, fitMode, minDistance, maxDistance, framingMode, debug } =
    useControls('GroupFraming', {
      padding: { value: 1, min: 0, max: 10, step: 0.1 },
      damping: { value: 0, min: 0, max: 3, step: 0.05 },
      screenPositionX: { value: 0, min: -1, max: 1, step: 0.05 },
      screenPositionY: { value: 0, min: -1, max: 1, step: 0.05 },
      fitMode: { value: 'rigid' as GroupFramingFitMode, options: ['ceiling', 'rigid'] as GroupFramingFitMode[] },
      minDistance: { value: 0, min: 0, max: 50, step: 0.5 },
      maxDistance: { value: 200, min: 10, max: 200, step: 0.5 },
      framingMode: {
        value: 'horizontalAndVertical' as GroupFramingMode,
        options: ['horizontal', 'vertical', 'horizontalAndVertical'] as GroupFramingMode[],
      },
      debug: true,
    });

  return (
    <>
      <OrbitingGroup members={members} anchorRef={anchorRef} />

      <Klipp>
        <VirtualCamera name="group-framing-demo" priority={10}>
          <Body.HardLockToTarget target={[0, 8, 16]} />
          <Aim.HardLookAt target={anchorRef} />
          <Extension.GroupFraming
            members={members}
            positionMode="groupAverage"
            padding={padding}
            damping={damping}
            screenPosition={[screenPositionX, screenPositionY]}
            fitMode={fitMode}
            minDistance={minDistance}
            maxDistance={maxDistance}
            framingMode={framingMode}
            debug={debug}
          />
          <SpectatorFrustum maxDistance={40} />
        </VirtualCamera>
      </Klipp>
    </>
  );
}
