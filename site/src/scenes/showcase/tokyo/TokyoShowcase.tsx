import { BlendCurves } from '@pmndrs/klipp';
import { Klipp, KlippControls } from '@pmndrs/klipp/react';
import { Suspense, useRef, useState } from 'react';

import { Preload } from '../Preload';
import type { ShowcaseProps } from '../ShowcaseProps';

import { CanvasOverlay } from '../../../scene/CanvasOverlay';

import { Hero } from './Hero';
import { locate } from './layout';
import { center } from './model';
import { PoseLogger } from './PoseLogger';
import { ScrollRail } from './ScrollRail';
import { Stage } from './Stage';
import { Chapter, Story } from './Story';
import { Town } from './Town';
import { useFreeLookKey } from './useFreeLookKey';

import { AlleyCamera } from './cameras/AlleyCamera';
import { SlidingCamera, TurningCamera } from './cameras/MascotCameras';
import { OverviewCamera } from './cameras/OverviewCamera';
import { AlongsideCamera, GoProCamera } from './cameras/TramCameras';

const modelUrl = 'https://sketchfab.com/3d-models/littlest-tokyo-94b24a60dc1b48248de50bf087c0f042';

export function TokyoShowcase({ ready, onReady, quality }: ShowcaseProps) {
  const freeLook = useFreeLookKey();
  const [scroll, setScroll] = useState(0);
  const story = useRef<HTMLDivElement>(null);
  const at = locate(scroll);
  const alleyProgress = at.id === 'alley' ? at.progress : at.id === 'tram' ? 1 : 0;
  const tramProgress = at.id === 'tram' ? at.progress : 0;
  const tramSide = at.id === 'tram' && at.progress >= 0.5;

  return (
    <>
      <Stage hd={quality === 'hd'} />

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
          </Story>
          <ScrollRail story={story} scroll={scroll} />
          <a className="showcase-credit" href={modelUrl} target="_blank" rel="noreferrer">
            Littlest Tokyo by glenatron, CC BY 4.0
          </a>
        </CanvasOverlay>
      )}

      <Klipp
        defaultBlend={{ damping: 0.75 }}
        customBlends={[{ from: 'alley', to: 'tram-gopro', blend: { curve: BlendCurves.easeInOut, time: 1 } }]}>
        <PoseLogger />
        <KlippControls
          name="free-look"
          priority={100}
          active={freeLook}
          target={center}
          distance={6}
          initialState={{ fov: 75 }}
          blendThreshold={0.6}
        />
        <OverviewCamera live={at.id === 'hero'} moving={ready} />
        <Suspense fallback={null}>
          <Town playing={ready} tramProgress={tramProgress} />
          <Preload onReady={onReady} />
          <TurningCamera live={at.id === 'mascot' && at.step === 0} />
          <SlidingCamera live={at.id === 'mascot' && at.step === 1} />
          <AlleyCamera live={at.id === 'alley'} progress={alleyProgress} />
          <GoProCamera live={at.id === 'tram' && !tramSide} />
          <AlongsideCamera live={tramSide} />
        </Suspense>
      </Klipp>
    </>
  );
}
