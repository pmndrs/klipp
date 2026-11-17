import { BlendCurves } from '@pmndrs/klipp';
import { Klipp } from '@pmndrs/klipp/react';
import { Suspense, useRef, useState } from 'react';

import { Preload } from '../Preload';
import type { ShowcaseProps } from '../ShowcaseProps';

import { CanvasOverlay } from '../../../scene/CanvasOverlay';

import { Effects } from './Effects';
import { Hero } from './Hero';
import { locate, progressThrough } from './layout';
import { PoseLogger } from './PoseLogger';
import { ScrollRail } from './ScrollRail';
import { Stage } from './Stage';
import { Chapter, Story } from './Story';
import { Town } from './Town';

import { AlleyCamera } from './cameras/AlleyCamera';
import { BirdCamera } from './cameras/BirdCamera';
import { DiveCamera } from './cameras/DiveCamera';
import { FreeLookCamera } from './cameras/FreeLookCamera';
import { SlidingCamera, TurningCamera } from './cameras/MascotCameras';
import { OverviewCamera } from './cameras/OverviewCamera';
import { AlongsideCamera, GoProCamera } from './cameras/TramCameras';

const modelUrl = 'https://sketchfab.com/3d-models/littlest-tokyo-94b24a60dc1b48248de50bf087c0f042';

export function TokyoShowcase({ ready, onReady, quality }: ShowcaseProps) {
  const [freeLook, setFreeLook] = useState(false);
  const [scroll, setScroll] = useState(0);
  const story = useRef<HTMLDivElement>(null);
  const at = locate(scroll);
  const tramProgress = progressThrough(at, 'tram');
  const tramSide = at.id === 'tram' && at.progress >= 0.5;
  const hd = quality === 'hd';

  return (
    <>
      <Stage hd={hd} />

      {ready && (
        <CanvasOverlay>
          <Story ref={story} atHero={at.id === 'hero'} onScroll={setScroll} freeLook={freeLook}>
            <Hero />
            <Chapter title="Keep it in frame" screens={2}>
              <p>Your subject stays in the shot, wherever it runs.</p>
              <p data-hidden={at.id === 'mascot' && at.step === 1 ? undefined : ''}>
                Turn the camera or move it along. You say where things land on screen, Klipp does the rest.
              </p>
            </Chapter>
            <Chapter title="Take the scenic route" screens={2} follows>
              <p>Lay down a path and let the camera ride it, looking wherever you point it along the way.</p>
            </Chapter>
            <Chapter title="Ride along" screens={3} follows>
              <p>Mount a camera on anything that moves.</p>
              <p data-hidden={tramSide ? undefined : ''}>
                Steady like a dolly or rigid like an action cam, built from the same few pieces.
              </p>
            </Chapter>
            <Chapter title="Look where it matters">
              <p>Point a long lens and the focus follows. Your effects always know what the camera is looking at.</p>
            </Chapter>
            <Chapter title="Make an entrance" screens={3} follows>
              <p>If you can draw the path, the camera can fly it. Swoop in, weave through, land on the moment.</p>
            </Chapter>
          </Story>
          <ScrollRail story={story} scroll={scroll} />
          <button type="button" className="tokyo-free-look" onClick={() => setFreeLook((on) => !on)}>
            {freeLook ? 'Back to the tour' : 'Free look'}
          </button>
          <a className="showcase-credit" href={modelUrl} target="_blank" rel="noreferrer">
            Littlest Tokyo by glenatron, CC BY 4.0
          </a>
        </CanvasOverlay>
      )}

      <Klipp
        defaultBlend={{ damping: 0.75 }}
        customBlends={[
          { from: 'alley', to: 'tram-gopro', blend: { curve: BlendCurves.easeInOut, time: 1 } },
          { from: 'tram-gopro', to: 'tram-alongside', blend: { curve: BlendCurves.easeInOut, time: 1 } },
          { from: 'tram-alongside', to: 'tram-gopro', blend: { curve: BlendCurves.easeInOut, time: 1 } },
          { from: 'bird', to: 'dive', blend: { curve: BlendCurves.easeInOut, time: 2 } },
        ]}>
        <PoseLogger />
        <Effects hd={hd} focus={at.id === 'bird'} />
        <FreeLookCamera live={freeLook} />
        <OverviewCamera live={at.id === 'hero'} moving={ready} />
        <Suspense fallback={null}>
          <Town playing={ready} tramProgress={tramProgress} />
          <Preload onReady={onReady} />
          <TurningCamera live={at.id === 'mascot' && at.step === 0} />
          <SlidingCamera live={at.id === 'mascot' && at.step === 1} />
          <AlleyCamera live={at.id === 'alley'} progress={progressThrough(at, 'alley')} />
          <GoProCamera live={at.id === 'tram' && !tramSide} />
          <AlongsideCamera live={tramSide} />
          <BirdCamera live={at.id === 'bird'} />
          <DiveCamera live={at.id === 'dive'} progress={progressThrough(at, 'dive')} />
        </Suspense>
      </Klipp>
    </>
  );
}
