import { BlendHints, type SequencerCamera as SequencerCameraCore, type SequencerInstruction } from '@pmndrs/klipp';
import { Aim, Body, Extension, Klipp, Noise, SequencerCamera, VirtualCamera } from '@pmndrs/klipp/react';
import {
  AccumulativeShadows,
  Environment,
  Float,
  Lightformer,
  PerformanceMonitor,
  RandomizedLight,
  useGLTF,
} from '@react-three/drei';
import { applyProps, useFrame } from '@react-three/fiber';
import { memo, Suspense, useLayoutEffect, useRef, useState } from 'react';
import {
  BackSide,
  Color,
  ShaderMaterial,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type Texture,
} from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';

import { Preload } from './Preload';
import { shots } from './shots';
import { ShowcaseBar } from './ShowcaseBar';

import carUrl from './porsche-930/porsche-930.glb?url';

/** `scene.environment` once `Environment` has rendered it, so the paint can reflect it at its own intensity. */
function useSceneEnvironment() {
  const [environment, setEnvironment] = useState<Texture | null>(null);
  useFrame(({ scene }) => {
    if (scene.environment !== environment) setEnvironment(scene.environment);
  });
  return environment;
}

function Car() {
  const { scene, materials } = useGLTF(carUrl);
  const environment = useSceneEnvironment();

  useLayoutEffect(() => {
    scene.traverse((object) => {
      if ((object as Mesh).isMesh) object.castShadow = object.receiveShadow = true;
    });
    applyProps(materials.paint as MeshStandardMaterial, { envMap: environment, envMapIntensity: 2 });
  }, [scene, materials, environment]);

  return <primitive object={scene} scale={1.43} position={[-0.62, -1.29, -0.12]} rotation={[0, Math.PI / 5, 0]} />;
}

/** Cool grey with a cyan glow from one corner, seen blurred behind the car and in its reflections. */
const backgroundMaterial = new ShaderMaterial({
  side: BackSide,
  uniforms: {
    base: { value: new Color('#556ac7') },
    glow: { value: new Color('#e4a572') },
    glowOrigin: { value: new Vector3(100, 100, 100) },
    glowFar: { value: 300 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vWorldPosition;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorldPosition = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 base;
    uniform vec3 glow;
    uniform vec3 glowOrigin;
    uniform float glowFar;
    varying vec3 vWorldPosition;
    void main() {
      float fade = clamp(distance(vWorldPosition, glowOrigin) / glowFar, 0.0, 1.0);
      gl_FragColor = vec4(mix(base, mix(glow, vec3(0.0), fade), 0.5), 1.0);
      #include <colorspace_fragment>
    }
  `,
});

const stripeOffsets = [2, 0, 2, 0, 2, 0, 2, 0];

/** Panels the paint reflects. The stripes overhead keep sliding along the car. */
function Lightformers() {
  const stripes = useRef<Group>(null);
  useFrame((_, delta) => {
    const group = stripes.current;
    if (!group) return;
    group.position.z += delta * 10;
    if (group.position.z > 20) group.position.z = -60;
  });

  return (
    <>
      <Lightformer intensity={1.5} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
      <group rotation={[0, 0.5, 0]}>
        <group ref={stripes}>
          {stripeOffsets.map((x, i) => (
            <Lightformer
              key={i}
              form="circle"
              intensity={2}
              rotation={[Math.PI / 2, 0, 0]}
              position={[x, 4, i * 4]}
              scale={[3, 1, 1]}
            />
          ))}
        </group>
      </group>
      <Lightformer intensity={4} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[20, 0.1, 1]} />
      <Lightformer rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[20, 0.5, 1]} />
      <Lightformer rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 1, 1]} />
      <Float speed={5} floatIntensity={2} rotationIntensity={2}>
        <Lightformer form="ring" color="red" intensity={1} scale={10} position={[-15, 4, -18]} target={[0, 0, 0]} />
      </Float>
      <mesh scale={100} material={backgroundMaterial}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
    </>
  );
}

/** The car, light and shadows. Memoized, since every render recomputes `AccumulativeShadows` from scratch. */
const Stage = memo(function Stage({ onReady }: { onReady: () => void }) {
  const [degraded, setDegraded] = useState(false);

  return (
    <>
      <spotLight
        position={[0, 15, 0]}
        angle={0.3}
        penumbra={1}
        castShadow
        intensity={2 * Math.PI}
        decay={0}
        shadow-bias={-0.0001}
      />
      <ambientLight intensity={0.8 * Math.PI} />
      <Suspense fallback={null}>
        <Car />
        <AccumulativeShadows position={[0, -1.16, 0]} frames={100} alphaTest={0.75} scale={10}>
          <RandomizedLight amount={8} radius={10} ambient={0.5} position={[1, 5, -1]} />
        </AccumulativeShadows>
        <Preload onReady={onReady} />
      </Suspense>
      <PerformanceMonitor onDecline={() => setDegraded(true)} />
      <Environment frames={degraded ? 1 : Infinity} resolution={256} background blur={1} environmentIntensity={1.6}>
        <Lightformers />
      </Environment>
    </>
  );
});

const modelUrl = 'https://sketchfab.com/3d-models/free-1975-porsche-911-930-turbo-8568d9d14a994b9cae59499f0dbed21e';

const instructions: SequencerInstruction[] = shots.map(({ name, hold, blend }) => ({ camera: name, hold, blend }));
const shotNames = shots.map(({ name }) => name);

/** `ready` turns `true` through `onReady` once the scene is loaded and compiled; the sequence starts with it. */
export function CarShowcase({ ready, onReady }: { ready: boolean; onReady: () => void }) {
  const sequence = useRef<SequencerCameraCore>(null);
  const [paused, setPaused] = useState(false);

  return (
    <>
      <Stage onReady={onReady} />

      {ready && (
        <>
          <ShowcaseBar sequence={sequence} shotNames={shotNames} paused={paused} onPausedChange={setPaused} />
          <CanvasOverlay>
            <a className="showcase-credit" href={modelUrl} target="_blank" rel="noreferrer">
              1975 Porsche 911 (930) Turbo by Lionsharp Studios, CC BY 4.0
            </a>
          </CanvasOverlay>
        </>
      )}
      <Klipp>
        <SequencerCamera
          ref={sequence}
          name="showcase"
          loop
          paused={paused || !ready}
          instructions={instructions}
          defaultBlend={{ damping: 0.35, maxSpeed: 1 }}>
          {shots.map((shot) => (
            <VirtualCamera key={shot.name} name={shot.name} hints={BlendHints.sphericalPosition}>
              <Body.HardLockToTarget target={shot.position} />
              <Aim.HardLookAt target={shot.lookAt} />
              <Extension.Lens fov={shot.fov} />
              <Noise.BasicMultiChannelPerlin
                positionAmplitude={[0.2, 0.1, 0.2]}
                positionFrequency={[0.15, 0.2, 0.12]}
                rotationAmplitude={[0.15, 0.15, 0]}
                rotationFrequency={[0.1, 0.12, 0.1]}
              />
            </VirtualCamera>
          ))}
        </SequencerCamera>
      </Klipp>
    </>
  );
}

useGLTF.preload(carUrl);
