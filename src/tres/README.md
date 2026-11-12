# Klipp for TresJS

This folder is the start of `@pmndrs/klipp/tres`, Klipp's integration for [TresJS](https://tresjs.org). It has a
working skeleton and one example of each kind of component. The rest is yours to build: this page explains how Klipp
is put together, what the starter does, the rules the integration has to keep, and the questions we haven't answered
yet.

## Klipp in five minutes

Klipp is a virtual camera library. You describe shots, and Klipp picks one and blends between them.

- **`KlippThree`** drives one three.js camera. Call `klipp.update(delta)` every frame and `klipp.setSize(width, height)`
  when the viewport changes. Its `camera` can be swapped at any time.
- **A virtual camera** is one shot, with a `name` and a `priority`. The active one with the highest priority is on
  screen, and switching between them blends.
- **Pieces** build a shot: a **Body** places the camera, an **Aim** turns it, **Extensions** adjust the result and
  **Noise** shakes it. A camera has at most one Body and one Aim.

The code is in layers, and each layer only imports from the ones below it:

| Layer        | What it holds                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `src/core/`  | All the camera logic, on [`math`](https://github.com/pmndrs/math) only. No three.js, framework or DOM. |
| `src/three/` | Classes ending in `Three` that read `Object3D` targets and write a three.js camera.                    |
| `src/dom/`   | Mouse, touch and wheel input.                                                                          |
| `src/react/` | React Three Fiber components.                                                                          |
| `src/tres/`  | This integration. It imports from `core`, `three` and `dom`, never from `react`.                       |

`pnpm run lint` enforces the layers (`.oxlintrc.json`).

Every piece follows the same pattern, for example `Follow`:

1. `src/core/body/follow.ts` holds the logic as data and functions: `createParams`, `createState`, `update`.
2. `src/core/body/FollowBody.ts` is a class over it, with every setting as a plain field.
3. `src/three/body/FollowBodyThree.ts` reads three.js targets and takes three.js vectors.
4. A component in each framework wraps that class: `src/react/body/Follow.tsx` and `src/tres/body/Follow.ts`.

The integration only writes step 4. The classes underneath already do the work, so a component stays small.

## What a component does

Compare `src/react/body/Follow.tsx` with `src/tres/body/Follow.ts`. A component:

1. Creates its class once, in `setup`, wrapped in `markRaw`.
2. Copies its props onto the instance in a `watchEffect`, with the defaults from the namespace's `createParams`, and
   calls `invalidate()`.
3. Adds the instance to the camera on mount (`camera.setBody`, `setAim`, `addExtension` or `addNoise`) and removes it
   on unmount with the function those return.
4. Exposes the instance, so users can call its methods and read its state.

`<Klipp>` provides the `KlippThree` and `<VirtualCamera>` the camera, through `provide` and `inject`
(`KlippContext.ts`, `VirtualCameraContext.ts`).

## What the starter has

- `package.json`: the `./tres` export, `vue` and `@tresjs/core` as optional peer dependencies, and the dev
  dependencies to build and test.
- `vite.config.ts`: `src/tres/index.ts` as an entry. The library builds file by file with Vite and `tsc`.
- `src/tres/`: `<Klipp>`, `<VirtualCamera>`, `Body.Follow`, `Aim.HardLookAt`, `useKlipp` and `useVirtualCamera`.
- `test/tres/Klipp.test.ts`: a wiring test that mounts a scene with `@vue/test-utils` and stands in for Tres's context
  and loop, since jsdom has no WebGL.

## Rules to keep

- **Keep Klipp's objects out of Vue's reactivity.** Wrap instances in `markRaw`, and pass targets and vectors from
  props through `toRaw`. Klipp reads them every frame, and a reactive proxy makes that slow and breaks identity
  checks.
- **No allocations in code that runs every frame**, like the `onBeforeRender` callback in `<Klipp>`.
- **Frames on demand.** `<Klipp>` hands Tres's `invalidate` to `klipp.subscribeFrameRequest`, so Klipp's methods,
  axes and camera changes ask for a frame on their own. Props that only set fields don't, so a component calls
  `invalidate()` after copying them. `ImpulseListener` subscribes to its field with `impulseField.subscribeImpulses`.
- **Same names as React.** Components, props and composables match `src/react/`, so users can switch between the two
  with the same docs.
- **Tests cover wiring.** Behavior is tested on the classes already. A component test checks that props reach the
  instance, that it's added and removed, and that frames are requested.

## Open questions

1. **Loop order.** `<Klipp>` updates in `useLoop().onBeforeRender`. Priorities only sort the callbacks of one
   `useLoop()` call, so across components they run in the order they were registered. Klipp can run before the
   scene moves its targets that frame, which leaves the camera one frame behind. How should it run after the scene's
   logic and before the render?
2. **The camera at setup.** `useTres().camera` can be `undefined` while `<Klipp>` sets up. The starter starts on a
   new `PerspectiveCamera` and swaps in Tres's camera once there is one. Virtual cameras start from the pose of the
   first camera, so is there a way to wait for Tres's?
3. **Refs.** The starter exposes `{ camera }`, `{ body }` and `{ aim }`. In React, a `ref` gives the instance itself.
   What fits Vue and Tres best?
4. **Camera groups.** `SequencerCamera` and `MixingCamera` hold cameras of their own. React passes the parent through
   a context (`src/react/CameraMixerContext.ts`); the starter adds every camera to `<Klipp>`.
5. **Tests.** Is there a TresJS test utility to use instead of standing in for `@tresjs/core`?
6. **`.vue` files.** The starter writes components with `defineComponent` in `.ts`, so the build stays Vite plus
   `tsc`. Single-file components would need the Vue plugin in the library build and `vue-tsc` for the declarations.
7. **`delta` after a hidden tab.** React caps `delta` in on-demand mode (`DEMAND_MODE_MAX_DELTA` in
   `src/react/Klipp.tsx`), so a long pause doesn't finish a blend in one frame. Tres's loop keeps running in every
   render mode: check what `delta` is when a tab comes back.

## To do

### Components

Everything `src/react/index.ts` exports, under the same names, each in `src/tres/` where its React counterpart is in
`src/react/`:

- [ ] `HardLookAt` in the starter: the `lookAt` prop (`'target'` or `'body'`), like the React one
- [ ] Body: `HardLockToTarget`, `OrbitFollow`, `PositionComposer`, `SplineDolly`
- [ ] Aim: `RotateWithFollowTarget`, `RotationComposer`, `PanTilt`, `SplineDollyLookAtTargets`
- [ ] Extension: `CameraOffset`, `Confiner`, `FollowZoom`, `GroupFraming`, `Lens`, `Recomposer`
- [ ] Noise: `BasicMultiChannelPerlin`, `ImpulseListener`
- [ ] `KlippControls`, with its input built in
- [ ] Camera groups: `SequencerCamera`, `MixingCamera`
- [ ] `InputController`, with `blendThreshold` and `pointerLock`. Set `pointerLock` in a watcher, not in `setup` itself:
      it locks the pointer once connected
- [ ] Events: `Klipp.Events`, `VirtualCamera.Events`
- [ ] `VirtualCamera.WhileOnScreen` (also `KlippControls.WhileOnScreen`): `blendThreshold`, `enter` and `leave` events, and
      its slot rendered only while the camera is on screen
- [ ] Composables: `useIsActiveVirtualCamera`, `useIsLiveVirtualCamera`, `useWhileOnScreen` (over `camera.whileOnScreen`)
- [ ] Helpers: `CameraFrustumHelper`, and the `debug` prop of every component that has one in React
- [ ] `src/tres/index.ts`: every component, namespace (`Body`, `Aim`, `Extension`, `Noise`) and props type, in the
      order of `src/react/index.ts`

### Tests

- [ ] A wiring test in `test/tres/` for every component, next to its React one in `test/react/`: props reach the
      instance on mount and on change, the instance is added and removed, and frames are requested.
- [ ] `pnpm run typecheck`, `lint`, `test` and `build` pass.

### Docs

Every page in `docs/` that shows code has tabs for the core, three.js and React Three Fiber, 41 pages in all. Each
gets a TresJS tab after the React Three Fiber one:

```mdx
<Tabs defaultValue="core" syncKey="integration">
  <TabsList>
    <TabsTrigger value="core">Core</TabsTrigger>
    <TabsTrigger value="three">three.js</TabsTrigger>
    <TabsTrigger value="r3f">React Three Fiber</TabsTrigger>
    <TabsTrigger value="tres">TresJS</TabsTrigger>
  </TabsList>
  <TabsContent value="core">...</TabsContent>
  <TabsContent value="three">...</TabsContent>
  <TabsContent value="r3f">...</TabsContent>
  <TabsContent value="tres">

The TresJS version of the React Three Fiber tab.

  </TabsContent>
</Tabs>
```

- [ ] A `tres` tab on every page with tabs. Tabs share `syncKey="integration"`, so a reader's choice holds on every
      page.
- [ ] Getting started: the entry point in Installation, the steps in Your first camera, the example in Introduction,
      and the integrations named in Core concepts.
- [ ] Pages about the React integration itself: Hooks (`api/hooks.mdx`, as composables), Events (`Klipp.Events`),
      On-demand rendering (Tres's `renderMode: 'on-demand'`) and AI agents.
- [ ] Settings marked "React only" (`debug`, `autoNormalize`, `enabled`, the `target` of `InputController`) and
      "three.js and React" (15 places): name TresJS too wherever it has them.
- [ ] `scripts/build-docs.mjs` already turns the new tab into a TresJS section. Update the sentence in the generated
      `index.md` that names the integrations, and add `@pmndrs/klipp/tres` to the entry points in the generated
      `AGENTS.md`.

### Package and repo

- [ ] `README.md`: a `@pmndrs/klipp/tres` row in Packages, a TresJS example next to the React one, and the sentence
      that names the integrations.
- [ ] `CONTRIBUTING.md`: `src/tres/` in Layers.
- [ ] `AGENTS.md`: TresJS in the first sentence.
- [ ] This file: delete it before the integration is merged into `main`, once the rules above live in
      `CONTRIBUTING.md`.

## Working on it

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

`CONTRIBUTING.md` and `AGENTS.md` have the rest: the core pattern, tests, conventions and commits
([Conventional Commits](https://www.conventionalcommits.org/)). The docs in `docs/` show every component with its
props, and each page has a React Three Fiber tab to follow.
