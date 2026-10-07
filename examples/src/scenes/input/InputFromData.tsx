import { InputController as InputReplay, type ConsumedInput, type InputControllerConfig } from '@kvvasuu/klipp';
import type { InputControllerDom } from '@kvvasuu/klipp/dom';
import { Aim, InputController, Klipp, VirtualCamera, useKlipp } from '@kvvasuu/klipp/react';
import type { PanTiltAimThree } from '@kvvasuu/klipp/three';
import { useFrame } from '@react-three/fiber';
import { button, folder, useControls } from 'leva';
import { useEffect, useRef, useState, type RefObject } from 'react';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';

const lookSource = { axes: { x: 'pan', y: 'tilt' }, gain: 0.15 };

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
  panSpeed,
  tiltSpeed,
  loop,
  aim,
  controller,
}: {
  source: Source;
  recording: boolean;
  panSpeed: number;
  tiltSpeed: number;
  loop: boolean;
  aim: RefObject<PanTiltAimThree | null>;
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
        aim.current?.pan.applyDelta(Math.cos(time * 0.6) * panSpeed * dt);
        aim.current?.tilt.applyDelta(Math.cos(time * 1.3) * tiltSpeed * dt);
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
  }, [klipp, source, recording, panSpeed, tiltSpeed, loop, aim, controller]);

  useFrame(() => {
    if (!liveRef.current || !aim.current) return;
    const { pan, tilt } = aim.current;
    const angles = `pan ${pan.value.toFixed(1)}°  tilt ${tilt.value.toFixed(1)}°`;
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
        ? 'drag to look around, every frame is being recorded'
        : 'drag to look around, turn on recording to capture it'
      : source === 'scripted'
        ? 'code looks around on its own'
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
  const aimRef = useRef<PanTiltAimThree>(null);
  const controllerRef = useRef<InputControllerDom>(null);
  const [faceForward, setFaceForward] = useState(0);

  const controls = useControls('Input from data', {
    source: { value: 'mouse', options: sourceOptions },
    Mouse: folder({ recording: false }, { render: shownFor('mouse') }),
    Scripted: folder(
      {
        panSpeed: { value: 40, min: 0, max: 120, step: 5, label: 'pan °/s' },
        tiltSpeed: { value: 10, min: 0, max: 60, step: 5, label: 'tilt °/s' },
      },
      { render: shownFor('scripted') },
    ),
    Replay: folder({ loop: true }, { render: shownFor('replay') }),
  });
  useControls('Camera', { 'face forward': button(() => setFaceForward((count) => count + 1)) });
  const source = controls.source as Source;

  useEffect(() => {
    if (faceForward === 0) return;
    aimRef.current?.pan.setValue(0);
    aimRef.current?.tilt.setValue(0);
  }, [faceForward]);

  return (
    <>
      <GroundClutter layout="lookAround" />

      <Klipp>
        <VirtualCamera name="input-from-data" priority={10} initialState={{ position: [0, 2, 0] }}>
          <Aim.PanTilt ref={aimRef} damping={0.05}>
            {source === 'mouse' && (
              <InputController ref={controllerRef} mouseButtons={{ left: lookSource }} touches={{ one: lookSource }} />
            )}
          </Aim.PanTilt>
          <SpectatorFrustum />
        </VirtualCamera>
        <DataDriver
          source={source}
          recording={controls.recording}
          panSpeed={controls.panSpeed}
          tiltSpeed={controls.tiltSpeed}
          loop={controls.loop}
          aim={aimRef}
          controller={controllerRef}
        />
      </Klipp>
    </>
  );
}
