# AGENTS.md

Klipp (`@pmndrs/klipp`) is a virtual camera library for the web: a core with no renderer or framework, plus thin
integrations for three.js, React Three Fiber and DOM input. Read [CONTRIBUTING.md](CONTRIBUTING.md) first for setup,
scripts, layers, the core pattern and tests. This file adds what an agent needs on top.

The project is before 1.0: a correct architecture matters more than keeping the current API. Build one small piece
at a time and verify it before the next.

## Before you hand in a change

Run all of these at the repo root:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run format:check
pnpm run build
```

`pnpm run build` also turns `docs/` into Markdown in `dist/docs/` and fails on a broken docs link. For changes to
`site/`, typecheck it too: `pnpm --filter site exec tsc --noEmit -p .`.

## Writing code

- **One piece, three parts.** Logic lives in a core namespace (`follow.ts`: `createParams`, `createState`,
  `update(out, state, params, ...)`). The core class (`FollowBody`) implements the params as plain mutable fields,
  passes itself as `params`, and has `update` as an arrow field. The three.js class (`FollowBodyThree`) overrides
  only `readTarget` and takes three.js types. The React component only builds params, keeps one instance with
  `useState`, assigns props to it in render, exposes it through `ref`, calls `useInvalidateOnRender()` and adds it
  in one `useEffect`. Behavior is tested on the class, React tests cover wiring only.
- **No allocations in per-frame code.** Functions that run every frame write into an `out` parameter, passed
  first, and reuse module-level scratch values. Watch aliasing when `out` can be one of the inputs. One-off methods,
  like ones a button calls, favor readable code.
- **File name is its main export**, in the same case: `Klipp.ts` exports `Klipp`, `follow.ts` exports the `follow`
  namespace with its types. `test/` mirrors `src/` one to one.
- **API conventions:** one place per symbol (integrations don't re-export core), options types named `XOptions`,
  `XThreeOptions` or `XProps`, `create()` for a namespace's main type and `createX()` for others, angles in degrees
  and speeds in degrees per second, enumerations as string unions, `index.ts` entries in alphabetical order, and a
  class method named like the namespace function it calls.
- **Comments** are in English, short and to the point, and only for a non-obvious "why". Describe the current code
  only, never what it used to do.
- **Body and Aim stay independent:** a Body never computes rotation, an Aim never computes position.

## Writing docs

- `docs/` is MDX. Pages that show code have tabs for the core, three.js and React Three Fiber.
- Write only what a reader needs to use the feature, as plain facts about how Klipp behaves. Leave out internals,
  edge cases and what readers already know from three.js or React.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
`chore:`) with a one-line message.
