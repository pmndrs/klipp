import { InputController as InputReplay, type ConsumedInput, type InputControllerConfig } from '@kvvasuu/klipp';
import type { InputControllerDom } from '@kvvasuu/klipp/dom';
import { Aim, Body, InputController, Klipp, VirtualCamera, useKlipp } from '@kvvasuu/klipp/react';
import type { OrbitFollowBodyThree } from '@kvvasuu/klipp/three';
import { useFrame } from '@react-three/fiber';
import { button, folder, useControls } from 'leva';
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Mesh } from 'three';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

const orbitSource = { axes: { x: 'horizontal', y: 'vertical' }, gain: 0.3 };

type Source = 'mouse' | 'scripted' | 'replay';

const sourceOptions: Record<string, Source> = {
  'mouse (can record)': 'mouse',
  'scripted by code': 'scripted',
  'replay the recording': 'replay',
};
const shownFor = (source: Source) => (get: (path: string) => unknown) => get('Input from data.source') === source;

type Recording = { frames: ConsumedInput[]; config: InputControllerConfig | null };

/** Feeds the axes from code, a scripted look-around or a replay of recorded mouse input, and shows how far it got. */
function DataDriver({
  source,
  recording,
  horizontalSpeed,
  verticalSpeed,
  loop,
  body,
  controller,
}: {
  source: Source;
  recording: boolean;
  horizontalSpeed: number;
  verticalSpeed: number;
  loop: boolean;
  body: RefObject<OrbitFollowBodyThree | null>;
  controller: RefObject<InputControllerDom | null>;
}) {
  const klipp = useKlipp();
  const tape = useRef<Recording>({ frames: [], config: null });
  const replayed = useRef(0);
  const liveRef = useRef<HTMLDivElement>(null);
  const [recordedFrames, setRecordedFrames] = useState(0);

  useEffect(() => {
    const recorded = tape.current;

    if (source === 'mouse') {
      if (!recording) return;
      recorded.frames = [];
      const stop = klipp.registerUpdate(() => {
        const live = controller.current;
        if (!live) return;
        recorded.config = live.config;
        recorded.frames.push({ ...live.input });
      });
      return () => {
        stop();
        setRecordedFrames(recorded.frames.length);
      };
    }

    if (source === 'scripted') {
      let time = 0;
      return klipp.registerUpdate((dt) => {
        time += dt;
        body.current?.horizontal.applyDelta(Math.cos(time * 0.6) * horizontalSpeed * dt);
        body.current?.vertical.applyDelta(Math.cos(time * 1.3) * verticalSpeed * dt);
        return true;
      });
    }

    if (!recorded.config || recorded.frames.length === 0) return;
    const replay = new InputReplay(recorded.config);
    // A disabled update lets go of axes the recording left held.
    const release = () => {
      replay.enabled = false;
      replay.update();
    };
    replayed.current = 0;
    const stop = klipp.registerUpdate(() => {
      if (replayed.current === recorded.frames.length) {
        if (!loop) return false;
        replayed.current = 0;
      }
      Object.assign(replay.input, recorded.frames[replayed.current++]);
      replay.update();
      if (!loop && replayed.current === recorded.frames.length) release();
      return true;
    });
    return () => {
      stop();
      release();
    };
  }, [klipp, source, recording, horizontalSpeed, verticalSpeed, loop, body, controller]);

  useFrame(() => {
    if (!liveRef.current || !body.current) return;
    const { horizontal, vertical, radial } = body.current;
    const angles =
      `horizontal ${horizontal.value.toFixed(1)}°  vertical ${vertical.value.toFixed(1)}°  ` +
      `zoom ${Math.exp(radial.value).toFixed(2)}`;
    const frames = tape.current.frames.length;
    const progress =
      source === 'replay'
        ? frames > 0
          ? `frame ${replayed.current} / ${frames}`
          : ''
        : source === 'mouse'
          ? recording
            ? `● recording · ${frames} frames`
            : `${frames} frames recorded`
          : '';
    liveRef.current.textContent = progress ? `${angles}  ·  ${progress}` : angles;
  });

  const hint =
    source === 'mouse'
      ? recording
        ? 'drag to orbit and scroll to zoom, every frame is being recorded'
        : 'drag to orbit and scroll to zoom, turn on recording to capture it'
      : source === 'scripted'
        ? 'code orbits on its own'
        : recordedFrames > 0
          ? 'replaying the recording, no mouse involved'
          : 'record something with the mouse first';

  return (
    <CanvasOverlay>
      <div className="pan-tilt-hud">
        {hint}
        <div ref={liveRef} />
      </div>
    </CanvasOverlay>
  );
}

export function InputFromData() {
  const subjectRef = useRef<Mesh>(null);
  const bodyRef = useRef<OrbitFollowBodyThree>(null);
  const controllerRef = useRef<InputControllerDom>(null);
  const [resets, setResets] = useState(0);

  const controls = useControls('Input from data', {
    source: { value: 'mouse', options: sourceOptions },
    Mouse: folder({ recording: false }, { render: shownFor('mouse') }),
    Scripted: folder(
      {
        horizontalSpeed: { value: 40, min: 0, max: 120, step: 5, label: 'horizontal °/s' },
        verticalSpeed: { value: 20, min: 0, max: 60, step: 5, label: 'vertical °/s' },
      },
      { render: shownFor('scripted') },
    ),
    Replay: folder({ loop: true }, { render: shownFor('replay') }),
  });
  useControls('Camera', { 'reset view': button(() => setResets((count) => count + 1)) });
  const source = controls.source as Source;

  useEffect(() => {
    if (resets === 0) return;
    bodyRef.current?.horizontal.setValue(0);
    bodyRef.current?.vertical.setValue(20);
    bodyRef.current?.radial.setValue(0);
  }, [resets]);

  return (
    <>
      <GroundClutter layout="standard" />
      <SpinningSubject ref={subjectRef} position={[0, 1.5, 0]} />

      <Klipp>
        <VirtualCamera name="input-from-data" priority={10}>
          <Body.OrbitFollow
            ref={bodyRef}
            target={subjectRef}
            radius={6}
            horizontal={{ damping: 0.05 }}
            vertical={{ center: 20, damping: 0.05 }}
            radial={{ damping: 0.15 }}>
            {source === 'mouse' && (
              <InputController
                ref={controllerRef}
                mouseButtons={{ left: orbitSource }}
                touches={{ one: orbitSource }}
                wheel={{ axis: 'radial', gain: 0.001, invert: true }}
                pinch={{ axis: 'radial', invert: true }}
              />
            )}
          </Body.OrbitFollow>
          <Aim.HardLookAt target={subjectRef} />
          <SpectatorFrustum />
        </VirtualCamera>
        <DataDriver
          source={source}
          recording={controls.recording}
          horizontalSpeed={controls.horizontalSpeed}
          verticalSpeed={controls.verticalSpeed}
          loop={controls.loop}
          body={bodyRef}
          controller={controllerRef}
        />
      </Klipp>
    </>
  );
}
