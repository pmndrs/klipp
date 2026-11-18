import {
  BlendCurves,
  type BlendDefinition,
  type SequencerCamera as SequencerCameraCore,
  type SequencerInstruction,
} from '@pmndrs/klipp';
import { Aim, Body, Klipp, SequencerCamera as Sequencer, VirtualCamera } from '@pmndrs/klipp/react';
import { useFrame } from '@react-three/fiber';
import { button, buttonGroup, useControls } from 'leva';
import { useRef, type RefObject } from 'react';

import { CanvasOverlay } from '../../scene/CanvasOverlay';
import { GroundClutter } from '../../scene/GroundClutter';
import { addOffset, lookAtQuaternion } from '../../scene/lookAtQuaternion';
import { framingSize } from '../../scene/projection';
import { SpectatorFrustum } from '../../scene/SpectatorFrustum';
import { SpinningSubject } from '../../scene/SpinningSubject';

const subjectPosition: [number, number, number] = [0, 1.5, 0];

const shots = ['wide', 'side', 'close', 'top'] as const;
type Shot = (typeof shots)[number];

const offsets: Record<Shot, [number, number, number]> = {
  wide: [-7, 5, 9],
  side: [7, 1.5, 2],
  close: [1.2, 0.6, 2.2],
  top: [0.5, 10, 0.5],
};

const colors: Record<Shot, string> = {
  wide: '#21a9e0',
  side: '#7ed957',
  close: '#ff6b4a',
  top: '#c77dff',
};

const holds: Record<Shot, number> = { wide: 2, side: 1.5, close: 1, top: 2 };

const blends = {
  'ease 1.5s': { curve: BlendCurves.easeInOut, time: 1.5 },
  'linear 1s': { curve: BlendCurves.linear, time: 1 },
  cut: { curve: BlendCurves.cut, time: 0 },
  'damping 0.6': { damping: 0.6 },
} satisfies Record<string, BlendDefinition>;
type BlendName = keyof typeof blends;
const blendNames = Object.keys(blends) as BlendName[];

const defaultBlends: Record<Shot, BlendName> = {
  wide: 'ease 1.5s',
  side: 'ease 1.5s',
  close: 'cut',
  top: 'damping 0.6',
};

function initialStateOf(shot: Shot) {
  const position = addOffset(subjectPosition, offsets[shot]);
  return {
    position,
    quaternion: lookAtQuaternion(position, subjectPosition),
    orthographicSize: framingSize(Math.hypot(...offsets[shot])),
  };
}

/** Steps in a row; the current one fills as it is held, and shows stripes while it is still blending in. */
function Timeline({
  sequence,
  intoBlends,
  loop,
  paused,
}: {
  sequence: RefObject<SequencerCameraCore | null>;
  intoBlends: Record<Shot, BlendName>;
  loop: boolean;
  paused: boolean;
}) {
  const steps = useRef<(HTMLDivElement | null)[]>([]);
  const fills = useRef<(HTMLDivElement | null)[]>([]);
  const status = useRef<HTMLDivElement>(null);

  useFrame(() => {
    const camera = sequence.current;
    if (!camera) return;
    const { index, held } = camera.sequence;
    const blending = camera.children.isBlending;
    shots.forEach((shot, i) => {
      const current = i === index;
      steps.current[i]?.classList.toggle('is-current', current);
      steps.current[i]?.classList.toggle('is-blending', current && blending);
      const progress = current ? Math.min(1, held / holds[shot]) : 0;
      if (fills.current[i]) fills.current[i]!.style.width = `${progress * 100}%`;
    });
    if (!status.current) return;
    const shot = shots[index];
    const last = index === shots.length - 1;
    status.current.textContent =
      index < 0
        ? 'waiting'
        : blending
          ? `blending into ${shot}, hold paused`
          : paused
            ? `paused on ${shot}`
            : last && !loop && held >= holds[shot]
              ? `holding ${shot}: the last step stays without loop`
              : `holding ${shot}: ${Math.min(held, holds[shot]).toFixed(1)} / ${holds[shot]}s`;
  });

  return (
    <CanvasOverlay>
      <div className="sequence-timeline">
        <div className="sequence-steps">
          {shots.map((shot, i) => (
            <div key={shot} ref={(el) => void (steps.current[i] = el)} className="sequence-step">
              <div className="sequence-step-name" style={{ color: colors[shot] }}>
                {shot}
              </div>
              <div className="sequence-step-meta">
                {i === 0 && !loop ? 'start' : intoBlends[shot]} · {holds[shot]}s
              </div>
              <div className="blend-progress-track">
                <div ref={(el) => void (fills.current[i] = el)} className="blend-progress-fill" />
              </div>
            </div>
          ))}
        </div>
        <div ref={status} className="sequence-status" />
      </div>
    </CanvasOverlay>
  );
}

export function SequencerCamera() {
  const sequence = useRef<SequencerCameraCore>(null);

  const [controls] = useControls('SequencerCamera', () => ({
    loop: true,
    paused: false,
    step: buttonGroup({
      previous: () => sequence.current?.previous(),
      next: () => sequence.current?.next(),
    }),
    ...Object.fromEntries(shots.map((shot) => [`into ${shot}`, { value: defaultBlends[shot], options: blendNames }])),
    restart: button(() => sequence.current?.restart()),
  })) as [Record<string, unknown>, unknown, unknown];

  const loop = controls.loop as boolean;
  const paused = controls.paused as boolean;
  const intoBlends = Object.fromEntries(shots.map((shot) => [shot, controls[`into ${shot}`]])) as Record<
    Shot,
    BlendName
  >;
  const instructions: SequencerInstruction[] = shots.map((shot) => ({
    camera: shot,
    hold: holds[shot],
    blend: blends[intoBlends[shot]],
  }));

  return (
    <>
      <SpinningSubject position={subjectPosition} />
      <GroundClutter layout="singleSubject" />

      <Klipp defaultBlend={{ curve: BlendCurves.easeInOut, time: 1 }}>
        <Timeline sequence={sequence} intoBlends={intoBlends} loop={loop} paused={paused} />

        <Sequencer ref={sequence} name="sequence" loop={loop} paused={paused} instructions={instructions}>
          {shots.map((shot) => (
            <VirtualCamera key={shot} name={shot} initialState={initialStateOf(shot)}>
              <Body.Follow target={subjectPosition} offset={offsets[shot]} bindingMode="worldSpace" />
              <Aim.HardLookAt target={subjectPosition} />
              <SpectatorFrustum color={colors[shot]} />
            </VirtualCamera>
          ))}
        </Sequencer>
      </Klipp>
    </>
  );
}
