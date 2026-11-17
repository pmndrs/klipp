import { Damper } from '@pmndrs/klipp';
import { useKlipp } from '@pmndrs/klipp/react';
import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing';
import { useRef } from 'react';

const focusBlur = 4;

/**
 * Ambient occlusion and a light finish. While `focus`, depth of field keeps sharp whatever the shot looks at, and
 * blurs the rest.
 */
export function Effects({ hd, focus }: { hd: boolean; focus: boolean }) {
  const klipp = useKlipp();
  const depthOfField = useRef<DepthOfFieldEffect>(null);
  const blur = useRef({ damper: new Damper(), value: 0 });

  useFrame((_, dt) => {
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
    </EffectComposer>
  );
}
