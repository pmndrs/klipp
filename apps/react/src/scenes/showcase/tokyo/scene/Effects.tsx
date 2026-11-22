import { Damper } from '@pmndrs/klipp';
import { useKlipp } from '@pmndrs/klipp/react';
import { Vector3Damper } from '@pmndrs/klipp/three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing';
import { useEffect, useRef, useState } from 'react';
import { Vector3 } from 'three';

import { townUrl } from '../model';

import { diveDamping } from '../cameras/dive';

import type { Focus } from './focus';
import { SpeedLinesEffect } from './SpeedLinesEffect';

const linesFadeOut = 0.2;
const focusDamping = 0.5;

/** A light finish, depth of field as `focus` says, and speed lines around the edges as `speed` goes from `0` to `1`. */
export function Effects({ hd, focus, speed }: { hd: boolean; focus: Focus; speed: number }) {
  const klipp = useKlipp();
  const { nodes } = useGLTF(townUrl);
  const depthOfField = useRef<DepthOfFieldEffect>(null);
  const [speedLines] = useState(() => new SpeedLinesEffect());
  const lines = useRef({ damper: new Damper(), value: 0 });
  // Eased, so moving from one section's focus to the next blurs and refocuses gradually.
  const sharp = useRef({
    blur: new Damper(),
    blurValue: 0,
    range: new Damper(),
    rangeValue: focus.range,
    point: new Vector3Damper(),
    pointValue: new Vector3(),
    target: new Vector3(),
  });

  useEffect(() => () => speedLines.dispose(), [speedLines]);

  useFrame((_, dt) => {
    // Damped like the dive's dolly on the way in, so the lines come with the camera's drop, then gone quickly.
    const time = speed > lines.current.value ? diveDamping : linesFadeOut;
    lines.current.value = lines.current.damper.update(lines.current.value, speed, time, dt);
    speedLines.setAmount(lines.current.value);

    const effect = depthOfField.current;
    if (!effect) return;
    const s = sharp.current;
    if (focus.on === 'tram') nodes.Object675.getWorldPosition(s.target);
    else if (klipp.shot.hasLookAtTarget) s.target.fromArray(klipp.shot.lookAtTarget);
    s.point.update(s.pointValue, s.target, focusDamping, dt);
    effect.target?.copy(s.pointValue);
    s.blurValue = s.blur.update(s.blurValue, focus.blur, focusDamping, dt);
    effect.bokehScale = s.blurValue;
    s.rangeValue = s.range.update(s.rangeValue, focus.range, focusDamping, dt);
    effect.cocMaterial.focusRange = s.rangeValue;
  });

  return (
    <EffectComposer multisampling={hd ? 4 : 0}>
      {hd && <DepthOfField ref={depthOfField} target={[0, 0, 0]} />}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Bloom intensity={0.2} mipmapBlur={true} />
      <Vignette offset={0.5} darkness={0.3} />
      <primitive object={speedLines} />
    </EffectComposer>
  );
}
