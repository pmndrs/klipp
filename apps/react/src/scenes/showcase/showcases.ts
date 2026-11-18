import { lazy } from 'react';

/** The showcase scenes, in menu order. Each loads only once it's picked. */
export const showcases = [
  {
    slug: 'vhs',
    label: 'VHS',
    Scene: lazy(() => import('./vhs/VhsShowcase').then((m) => ({ default: m.VhsShowcase }))),
  },
  {
    slug: 'porsche',
    label: '930 Turbo',
    Scene: lazy(() => import('./porsche/PorscheShowcase').then((m) => ({ default: m.PorscheShowcase }))),
  },
];
