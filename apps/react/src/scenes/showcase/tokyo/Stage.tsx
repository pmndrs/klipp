import { Environment } from '@react-three/drei';

/** Dawn light with a warm sun and soft shadows. */
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
    </>
  );
}
