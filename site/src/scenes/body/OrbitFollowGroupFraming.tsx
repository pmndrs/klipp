import type { GroupFramingFitMode } from '@pmndrs/klipp';
import { Aim, Body, Extension, Klipp, VirtualCamera } from '@pmndrs/klipp/react';
import { useControls } from 'leva';
import { useRef, useState } from 'react';
import type { Group } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { createGroupMembers } from '../../scene/groupMembers';
import { OrbitingGroup } from '../../scene/OrbitingGroup';
import { framingSize, useOrthographicSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

import { OrbitInput, orbitHint } from './OrbitInput';

export function OrbitFollowGroupFraming() {
  const [members] = useState(createGroupMembers);
  const anchorRef = useRef<Group>(null);

  const { fitMode, padding, framingDamping, debug } = useControls('OrbitFollow: Group Framing', {
    fitMode: { value: 'rigid' as GroupFramingFitMode, options: ['ceiling', 'rigid'] as GroupFramingFitMode[] },
    padding: { value: 1.5, min: 0, max: 10, step: 0.1 },
    framingDamping: { value: 0.1, min: 0, max: 3, step: 0.05 },
    debug: true,
  });
  const orthographicSize = useOrthographicSize('OrbitFollow: Group Framing', framingSize(20));

  return (
    <>
      <GroundClutter layout="groupFraming" />
      <group position={[0, 1.5, 0]}>
        <OrbitingGroup members={members} anchorRef={anchorRef} />
      </group>

      <Klipp>
        <VirtualCamera name="orbit-follow-group-framing-demo" priority={10}>
          <Body.OrbitFollow
            target={anchorRef}
            radius={20}
            debug={debug}
            horizontal={{ damping: 0.1 }}
            vertical={{ center: 30, damping: 0.1 }}
            radial={{ damping: 0.15 }}>
            <OrbitInput />
          </Body.OrbitFollow>
          <Aim.HardLookAt target={anchorRef} />
          <Extension.Lens orthographicSize={orthographicSize} />
          <Extension.GroupFraming
            members={members}
            positionMode="groupAverage"
            fitMode={fitMode}
            padding={padding}
            damping={framingDamping}
            debug={debug}
          />
          <SpectatorFrustum maxDistance={40} />
        </VirtualCamera>
      </Klipp>

      <CanvasOverlay>
        <div className="pan-tilt-hud">{orbitHint}</div>
      </CanvasOverlay>
    </>
  );
}
