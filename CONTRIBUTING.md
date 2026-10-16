# Contributing

This project uses semantic commits and semver.

This repo is the library itself (`src/`, built with Vite into `dist/`). [`examples/`](examples) is a
separate Vite app used as a live testbed while developing. It resolves `@pmndrs/klipp` straight to `src/`
via a Vite alias, so there's no build step in the loop while iterating.

## Setup

```bash
pnpm install
pnpm --filter examples dev
```

## Scripts (run at the repo root)

- `pnpm run build` - builds `src/` to `dist/` with Vite, one file per source file, and the declarations with `tsc`.
- `pnpm run test` - the unit suite (`vitest`), including the golden trajectory tests.
- `pnpm run lint` - `oxlint`, which also enforces the layer boundaries below.
- `pnpm run typecheck` - `tsc` over `src/`, the config files and, via `test/tsconfig.json`, the tests.
- `pnpm run format` - `prettier`.
- `pnpm run bench` - the performance benchmarks in [`benches/`](benches) (`@pmndrs/labs`).

## Releases

Both publishing workflows use the `NPM_TOKEN` GitHub Actions secret. Set it to a granular npm token
with **Read and write (publish and stage)** access to `@pmndrs/klipp` and **Bypass two-factor
authentication** enabled. The npm package must allow token-based publishing. Rotate the secret before
the token expires.

Every push to `main`, including a merged pull request, runs the checks and publishes a canary to npm.
Canary versions match [pmndrs/math](https://github.com/pmndrs/math/blob/main/.github/workflows/release.yml):
`0.0.0-canary-YYYYMMDD-<8-character commit SHA>`, using the UTC date, for example
`0.0.0-canary-20261016-abc12345`. The version changes only in the runner's checkout. A rerun skips a
version that is already published. Install it with `npm install @pmndrs/klipp@canary`.

For a stable release, update `package.json` to the new `major.minor.patch` version, commit it, and merge
it into `main`. Then tag that commit and push the tag:

```bash
git switch main
git pull --ff-only
git tag v0.15.0
git push origin v0.15.0
```

The tag must exactly match `v` followed by the version in `package.json`. The release workflow runs the
checks and publishes to npm with the `latest` tag. Rerunning a release skips an npm version that is
already published. Publishing runs queue so a newer push does not cancel a pending release.

## Layers

`src/` is split into layers. Each one may only import from the layers below it:

- `src/core/` - camera logic as plain data and functions, on [`math`](https://github.com/pmndrs/math)
  only. No three.js, React or DOM.
- `src/three/` - classes that read `Object3D` targets and write three.js cameras.
- `src/dom/` - pointer and wheel input, and debug overlays. Depends on `core` only.
- `src/react/` - React Three Fiber components.

Core modules follow one pattern: an `XParams` type for settings with `createXParams(settings)` for
defaults, an `XState` type with `createXState()` for memory, and `updateX(out, state, params, ...)`.
Core classes are thin wrappers that take `(target, options)`, fill their fields from `createXParams` and
pass themselves as params. A layer extends them under the same name with its own suffix (`KlippThree`,
`FollowBodyThree`), overriding only what it adapts, like `readTarget`, and taking three.js vectors in its
options. Classes a layer doesn't change are used from core as they are (`LensExtension`). React components
read their defaults from the same factory. Hot paths don't allocate: reuse module-level scratch values
instead.

## Tests

- `test/` mirrors `src/`. `test/core/` imports only `math`, like `src/core/`.
- One test per behavior. Keep tests that guard a real bug and say so in the name.
- React tests cover wiring only (registration, props, unmount). Behavior is tested on the class.
- `test/golden/` compares every piece frame by frame to recorded fixtures. If a change there is intended,
  re-record on Node 22 with `pnpm vitest run test/golden --mode golden-record` and commit the fixtures
  separately.

## Project layout

- `src/` - the library, see [Layers](#layers).
- `examples/` - a Vite app covering every feature; useful both as a live testbed and as a reference for
  how each piece is meant to be used.
- `docs/` - the documentation site content (MDX).
