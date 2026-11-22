import { BlendCurves, type CustomBlend } from '@pmndrs/klipp';
import { Klipp } from '@pmndrs/klipp/react';
import { Suspense, useRef, useState } from 'react';

import { Preload } from '../Preload';
import type { ShowcaseProps } from '../ShowcaseProps';

import { CanvasOverlay } from '../../../scene/CanvasOverlay';

import { Effects } from './Effects';
import { focusAt } from './focus';
import { Hero } from './Hero';
import { locate, progressThrough, tramCut, type SectionId } from './layout';
import { Outro } from './Outro';
import { PoseLogger } from './PoseLogger';
import { ScrollRail } from './ScrollRail';
import { Stage } from './Stage';
import { Chapter, Story } from './Story';
import { Town } from './Town';
import { autoplay } from './useAutoplay';

import { AlleyCamera } from './cameras/AlleyCamera';
import { BirdCamera } from './cameras/BirdCamera';
import { fallAt } from './cameras/dive';
import { DiveCamera } from './cameras/DiveCamera';
import { FreeLookCamera } from './cameras/FreeLookCamera';
import { SlidingCamera, TurningCamera } from './cameras/MascotCameras';
import { outroOrbit, overviewOrbit } from './cameras/overview';
import { OverviewCamera } from './cameras/OverviewCamera';
import { AlongsideCamera, GoProCamera } from './cameras/TramCameras';

// The free look starts from the shot on screen, so it cuts in.
const customBlends: CustomBlend[] = [{ to: 'free-look', blend: { curve: BlendCurves.cut, time: 0 } }];

const modelUrl = 'https://sketchfab.com/3d-models/littlest-tokyo-94b24a60dc1b48248de50bf087c0f042';

// Sections whose camera rides a path: leaving one, its camera stays on until it reaches the end of its way.
const rides = new Set<SectionId>(['dive', 'alley']);

export function TokyoShowcase({ ready, onReady, quality }: ShowcaseProps) {
  const [freeLook, setFreeLook] = useState(false);
  const [touring, setTouring] = useState(autoplay);
  const [scroll, setScroll] = useState(0);
  const story = useRef<HTMLDivElement>(null);
  const at = locate(scroll);
  const [section, setSection] = useState(at.id);
  const [finishing, setFinishing] = useState<SectionId | null>(null);
  if (at.id !== section) {
    setSection(at.id);
    setFinishing(rides.has(section) ? section : null);
  }
  // The section whose camera is on: the text follows the scroll at once, the shot once a ride has finished.
  const shot = finishing ?? at.id;
  const tramProgress = progressThrough(at, 'tram', finishing);
  const diveProgress = progressThrough(at, 'dive', finishing);
  const alleyProgress = progressThrough(at, 'alley', finishing);
  const tramSide = shot === 'tram' && tramProgress >= tramCut;
  const hd = quality === 'hd';

  return (
    <>
      <Stage hd={hd} />

      {ready && (
        <CanvasOverlay>
          <Story
            ref={story}
            atHero={at.id === 'hero'}
            onScroll={setScroll}
            freeLook={freeLook}
            touring={touring}
            setTouring={setTouring}>
            <Hero onPlay={() => setTouring(true)} />
            <Chapter
              id="dive"
              title="Make an entrance"
              pieces={[
                'Body.SplineDolly',
                'Aim.SplineDollyLookAtTargets',
                'Extension.SplineRoll',
                'Extension.Lens',
                'Noise.BasicMultiChannelPerlin',
              ]}>
              <p>If you can draw the path, the camera can fly it. Swoop in, weave through, land on the moment.</p>
            </Chapter>
            <Chapter
              id="mascot"
              title="Keep it in frame"
              pieces={[at.id === 'mascot' && at.step === 1 ? 'Body.PositionComposer' : 'Aim.RotationComposer']}>
              <p>Your subject stays in the shot, wherever it runs.</p>
              <p data-hidden={at.id === 'mascot' && at.step === 1 ? undefined : ''}>
                Turn the camera or move it along. You say where things land on screen, Klipp does the rest.
              </p>
            </Chapter>
            <Chapter
              id="alley"
              title="Take the scenic route"
              pieces={[
                'Body.SplineDolly',
                'Aim.SplineDollyLookAtTargets',
                'Extension.SplineRoll',
                'Noise.BasicMultiChannelPerlin',
              ]}>
              <p>Point out the sights. The camera glances at each one as it rides past.</p>
            </Chapter>
            <Chapter
              id="tram"
              title="Ride along"
              pieces={
                tramSide
                  ? ['Body.Follow', 'Aim.HardLookAt', 'Extension.GroupFraming']
                  : ['Body.Follow', 'Aim.RotateWithFollowTarget', 'Extension.Recomposer']
              }>
              <p>Mount a camera on anything that moves.</p>
              <p data-hidden={tramSide ? undefined : ''}>
                Steady like a dolly or rigid like an action cam, built from the same few pieces.
              </p>
            </Chapter>
            <Chapter
              id="bird"
              title="Look where it matters"
              pieces={['Aim.RotationComposer', 'Extension.Lens', 'klipp.shot']}>
              <p>Point a long lens and the focus follows. Your effects always know what the camera is looking at.</p>
            </Chapter>
            <Outro onTakeControl={() => setFreeLook(true)} />
          </Story>
          <ScrollRail story={story} scroll={scroll} />
          {freeLook && (
            <button type="button" className="tokyo-free-look" onClick={() => setFreeLook(false)}>
              Back to the tour
            </button>
          )}
          <a className="showcase-credit" href={modelUrl} target="_blank" rel="noreferrer">
            Littlest Tokyo by glenatron, CC BY 4.0
          </a>
        </CanvasOverlay>
      )}

      <Klipp defaultBlend={{ damping: 0.75 }} customBlends={customBlends}>
        <PoseLogger />
        <FreeLookCamera live={freeLook} />
        <OverviewCamera name="overview" orbit={overviewOrbit} live={shot === 'hero'} moving={ready} />
        <OverviewCamera name="outro" orbit={outroOrbit} live={shot === 'outro'} moving={ready} />
        <Suspense fallback={null}>
          <Effects hd={hd} focus={focusAt(at)} speed={freeLook ? 0 : fallAt(diveProgress)} />
          <Town playing={ready} tramProgress={tramProgress} />
          <Preload onReady={onReady} />
          <TurningCamera live={shot === 'mascot' && at.step === 0} />
          <SlidingCamera live={shot === 'mascot' && at.step === 1} />
          <AlleyCamera
            live={shot === 'alley'}
            progress={alleyProgress}
            finishing={finishing === 'alley'}
            onArrive={() => setFinishing(null)}
          />
          <GoProCamera live={shot === 'tram' && !tramSide} />
          <AlongsideCamera live={tramSide} />
          <BirdCamera live={shot === 'bird'} />
          <DiveCamera
            live={shot === 'dive'}
            progress={diveProgress}
            finishing={finishing === 'dive'}
            onArrive={() => setFinishing(null)}
          />
        </Suspense>
      </Klipp>
    </>
  );
}
