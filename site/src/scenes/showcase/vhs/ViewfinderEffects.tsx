import { Damper } from '@pmndrs/klipp';
import { useFrame } from '@react-three/fiber';
import {
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  EffectGroup,
  Scanline,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { ToneMappingMode, type Effect, type EffectPass } from 'postprocessing';
import { useRef, useState } from 'react';

import type { Vec3 } from '../ShowcaseProps';

const strength = { depthOfField: 1, chromaticAberration: 1, scanline: 0.12 };

/** Without `hd` only tone mapping and the vignette run: no viewfinder effects and no multisampling. */
export function ViewfinderEffects({ focus, hd }: { focus: Vec3 | null; hd: boolean }) {
  const [lastFocus, setLastFocus] = useState<Vec3>([0, 0, 0]);
  if (focus && focus !== lastFocus) setLastFocus(focus);

  const fade = useRef({ damper: new Damper(), value: 0 });
  const groups = useRef<(EffectPass | null)[]>([]);
  const effects = useRef<Record<keyof typeof strength, Effect | null>>({
    depthOfField: null,
    chromaticAberration: null,
    scanline: null,
  });

  useFrame((_, dt) => {
    const state = fade.current;
    state.value = state.damper.update(state.value, focus ? 1 : 0, 0.4, dt);
    const on = state.value > 0.001;
    for (const group of groups.current) if (group) group.enabled = on;
    for (const name of Object.keys(strength) as (keyof typeof strength)[]) {
      const effect = effects.current[name];
      if (effect) effect.blendMode.opacity.value = strength[name] * state.value;
    }
  });

  return (
    <EffectComposer multisampling={hd ? 4 : 0}>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {hd && (
        <EffectGroup ref={(pass) => void (groups.current[0] = pass)} enabled={false}>
          <DepthOfField
            ref={(effect) => void (effects.current.depthOfField = effect)}
            target={lastFocus}
            worldFocusRange={0.4}
            bokehScale={4}
          />
        </EffectGroup>
      )}
      {/* A blur and a shift of where it samples can't share one shader pass. */}
      {hd && (
        <EffectGroup ref={(pass) => void (groups.current[1] = pass)} enabled={false}>
          <ChromaticAberration
            ref={(effect) => void (effects.current.chromaticAberration = effect)}
            offset={[0.006, 0.006]}
            radialModulation
            modulationOffset={0.3}
          />
          <Scanline ref={(effect) => void (effects.current.scanline = effect)} density={1.5} />
        </EffectGroup>
      )}
      <Vignette offset={0.25} darkness={0.5} />
    </EffectComposer>
  );
}
