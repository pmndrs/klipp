import { Damper } from '@pmndrs/klipp';
import { useKlipp } from '@pmndrs/klipp/react';
import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing';
import { useEffect, useRef, useState } from 'react';

import { SpeedLinesEffect } from './SpeedLinesEffect';

import { diveDamping } from './cameras/dive';

const focusBlur = 4;
const linesFadeOut = 0.2;

/**
 * Ambient occlusion and a light finish. While `focus`, depth of field keeps sharp whatever the shot looks at, and
 * blurs the rest. `speed` from `0` to `1` draws speed lines around the edges.
 */
export function Effects({ hd, focus, speed }: { hd: boolean; focus: boolean; speed: number }) {
  const klipp = useKlipp();
  const depthOfField = useRef<DepthOfFieldEffect>(null);
  const [speedLines] = useState(() => new SpeedLinesEffect());
  const blur = useRef({ damper: new Damper(), value: 0 });
  const lines = useRef({ damper: new Damper(), value: 0 });

  useEffect(() => () => speedLines.dispose(), [speedLines]);

  useFrame((_, dt) => {
    // Damped like the dive's dolly on the way in, so the lines come with the camera's drop, then gone quickly.
    const time = speed > lines.current.value ? diveDamping : linesFadeOut;
    lines.current.value = lines.current.damper.update(lines.current.value, speed, time, dt);
    speedLines.setAmount(lines.current.value);

    const effect = depthOfField.current;
    if (!effect) return;
    const { lookAtTarget, hasLookAtTarget } = klipp.shot;
    if (hasLookAtTarget) effect.target?.fromArray(lookAtTarget);
    blur.current.value = blur.current.damper.update(blur.current.value, focus ? focusBlur : 0, 0.5, dt);
    effect.bokehScale = blur.current.value;
  });

  return (
    <EffectComposer multisampling={hd ? 4 : 0}>
      <N8AO aoRadius={0.1} distanceFalloff={1} intensity={2.5} halfRes={!hd} />
      {hd && <DepthOfField ref={depthOfField} target={[0, 0, 0]} worldFocusRange={0.4} />}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Bloom intensity={0.2} mipmapBlur={true} />
      <Vignette offset={0.5} darkness={0.3} />
      <primitive object={speedLines} />
    </EffectComposer>
  );
}
