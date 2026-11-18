import type { Quality } from '../../layout/useQuality';

export type Vec3 = [number, number, number];

/** What the landing page gives every showcase scene. */
export type ShowcaseProps = {
  /** Turns `true` through `onReady` once the scene is loaded and compiled; the scene starts moving with it. */
  ready: boolean;
  onReady: () => void;
  quality: Quality;
};
