# Klipp 📹

[![Version](https://badgen.net/npm/v/@pmndrs/klipp)](https://www.npmjs.com/package/@pmndrs/klipp)
[![Examples](https://img.shields.io/static/v1?message=Examples&style=flat&colorA=000000&colorB=000000&label=&logo=threedotjs&logoColor=ffffff)](https://pmndrs.github.io/klipp/examples/)
[![Docs](https://img.shields.io/static/v1?message=Docs&style=flat&colorA=000000&colorB=000000&label=&logo=googledocs&logoColor=ffffff)](https://pmndrs.github.io/klipp/docs/)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A camera toolkit for the web, inspired by Unity Cinemachine. Describe the shots you want, and klipp picks the right one and blends between them.

The core runs anywhere, with no renderer or framework attached. Integrations are thin layers on top: three.js and React Three Fiber today, with more to come, like TresJS.

```bash
npm install @pmndrs/klipp
```

⚠️ Early-stage, experimental - the API may change.

## Core

```ts
import { Klipp, FollowBody, HardLookAtAim, targetPose } from '@pmndrs/klipp';

const klipp = new Klipp();
const player = targetPose.create(); // keep player.position up to date

const follow = new VirtualCamera('follow', { priority: 10 });
klipp.add(follow);
follow.body = new FollowBody(player, { offset: [0, 3, 8], damping: 0.5 });
follow.aim = new HardLookAtAim(player);

// every frame
klipp.update(dt);
engineCamera.setPosition(klipp.shot.position);
engineCamera.setRotation(klipp.shot.quaternion);
```

## React Three Fiber

```tsx
import { Klipp, VirtualCamera, Body, Aim } from '@pmndrs/klipp/react';

<Klipp>
  <VirtualCamera name="follow" priority={10}>
    <Body.Follow target={playerRef} offset={[0, 3, 8]} damping={0.5} />
    <Aim.HardLookAt target={playerRef} />
  </VirtualCamera>

  <VirtualCamera name="cutscene" priority={20} active={isCutscene}>
    <Body.HardLockToTarget target={[10, 2, 0]} />
    <Aim.HardLookAt target={playerRef} />
  </VirtualCamera>
</Klipp>;
```

## What's inside

- **Virtual cameras** with priorities, and **blending** between them.
- **Body** and **Aim**: follow, frame or look at targets, or let the user orbit and look around.
- **Extension**, **Noise** and **Impulse**: group framing, lens, and camera shake.
- **Debugging**: framing zones and camera frustums.

## Packages

| Entry point           | For                                                          |
| --------------------- | ------------------------------------------------------------ |
| `@pmndrs/klipp`       | The core, built on [`math`](https://github.com/pmndrs/math). |
| `@pmndrs/klipp/three` | three.js classes, ending in `Three`.                         |
| `@pmndrs/klipp/react` | React Three Fiber components.                                |
| `@pmndrs/klipp/dom`   | Mouse, touch and wheel input, and debug overlays.            |

## Links

- [Documentation](https://pmndrs.github.io/klipp/docs/)
- [Examples](https://pmndrs.github.io/klipp/examples/)
