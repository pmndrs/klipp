import { BlendCurves, type CustomBlend } from '@pmndrs/klipp';
import { Klipp } from '@pmndrs/klipp/react';
import { Suspense, useRef, useState } from 'react';

import './tokyo.css';

import { Preload } from '../Preload';
import type { ShowcaseProps } from '../ShowcaseProps';

import { CanvasOverlay } from '../../../scene/CanvasOverlay';

import { useTour } from './useTour';

import { AlleyCamera } from './cameras/AlleyCamera';
import { BirdCamera } from './cameras/BirdCamera';
import { fallAt } from './cameras/dive';
import { DiveCamera } from './cameras/DiveCamera';
import { FreeLookCamera } from './cameras/FreeLookCamera';
import { SlidingCamera, TurningCamera } from './cameras/MascotCameras';
import { outroOrbit, overviewOrbit } from './cameras/overview';
import { OverviewCamera } from './cameras/OverviewCamera';
import { AlongsideCamera, GoProCamera } from './cameras/TramCameras';
import { Chapters } from './page/Chapters';
import { Hero } from './page/Hero';
import { Outro } from './page/Outro';
import { ScrollRail } from './page/ScrollRail';
import { Story } from './page/Story';
import { autoplay } from './page/useAutoplay';
import { Effects } from './scene/Effects';
import { focusAt } from './scene/focus';
import { Stage } from './scene/Stage';
import { Town } from './scene/Town';

// The free look starts from the shot on screen, so it cuts in.
const customBlends: CustomBlend[] = [{ to: 'free-look', blend: { curve: BlendCurves.cut, time: 0 } }];

const modelUrl = 'https://sketchfab.com/3d-models/littlest-tokyo-94b24a60dc1b48248de50bf087c0f042';

/**
 * A tour of Littlest Tokyo told by scrolling: each section of the page puts its shot on, and the last one hands the
 * camera over to the viewer.
 */
export function TokyoShowcase({ ready, onReady, quality }: ShowcaseProps) {
  const [freeLook, setFreeLook] = useState(false);
  const [touring, setTouring] = useState(autoplay);
  const [scroll, setScroll] = useState(0);
  const story = useRef<HTMLDivElement>(null);
  const tour = useTour(scroll);
  const { at, shot, finishing, arrive, progress, tramSide, mascotSlide } = tour;
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
            <Chapters tour={tour} />
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
        <FreeLookCamera live={freeLook} />
        <OverviewCamera name="overview" orbit={overviewOrbit} live={shot === 'hero'} moving={ready} />
        <OverviewCamera name="outro" orbit={outroOrbit} live={shot === 'outro'} moving={ready} />
        <Suspense fallback={null}>
          <Town playing={ready} tramProgress={progress.tram} />
          <Effects hd={hd} focus={focusAt(at)} speed={freeLook ? 0 : fallAt(progress.dive)} />
          <Preload onReady={onReady} />
          <DiveCamera
            live={shot === 'dive'}
            progress={progress.dive}
            finishing={finishing === 'dive'}
            onArrive={arrive}
          />
          <TurningCamera live={shot === 'mascot' && !mascotSlide} />
          <SlidingCamera live={shot === 'mascot' && mascotSlide} />
          <AlleyCamera
            live={shot === 'alley'}
            progress={progress.alley}
            finishing={finishing === 'alley'}
            onArrive={arrive}
          />
          <GoProCamera live={shot === 'tram' && !tramSide} />
          <AlongsideCamera live={tramSide} />
          <BirdCamera live={shot === 'bird'} />
        </Suspense>
      </Klipp>
    </>
  );
}
