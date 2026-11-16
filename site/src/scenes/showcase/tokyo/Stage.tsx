import { Environment } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

/** Dawn light with a warm sun and soft shadows, plus ambient occlusion and a light finish. */
export function Stage({ hd }: { hd: boolean }) {
  return (
    <>
      <Environment preset="dawn" background environmentIntensity={2} backgroundBlurriness={0.5} />
      <directionalLight
        position={[5, 8, 4]}
        color={0xfff0ad}
        intensity={3}
        castShadow
        shadow-mapSize={hd ? 2048 : 1024}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}>
        <orthographicCamera attach="shadow-camera" args={[-5, 5, 5, -5, 0.5, 30]} />
      </directionalLight>
      <EffectComposer multisampling={hd ? 4 : 0}>
        <N8AO aoRadius={0.1} distanceFalloff={1} intensity={2.5} halfRes={!hd} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Bloom intensity={0.2} mipmapBlur={true} />
        <Vignette offset={0.5} darkness={0.3} />
      </EffectComposer>
    </>
  );
}
