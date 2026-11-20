import { lazy } from 'react';

/** The showcase scenes, in menu order, the first one on the landing page. Each loads only once it's picked. */
export const showcases = [
  {
    slug: 'tokyo',
    label: 'Littlest Tokyo',
    Scene: lazy(() => import('./tokyo/TokyoShowcase').then((m) => ({ default: m.TokyoShowcase }))),
  },
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
