# klipp benches

Performance benchmarks powered by [`@pmndrs/labs`](https://github.com/pmndrs/labs). Benches import directly from `../src`, so no build step is needed.

## Usage

Run from the repo root:

```sh
pnpm bench                 # run all benches, save results with an automatic name
pnpm bench "@aim"          # filter by tag (@body, @aim, @noise, @impulse, @controller, @core, @blend, @targets, @input, @scene)
pnpm bench -n "v1.0.0" -b  # save with a name and set it as the baseline
pnpm bench compare         # compare the latest run against the baseline
pnpm bench --no-save       # run without saving
```

## Layout

The folders follow `src`:

- `core/`: one piece or core step at a time (`@body`, `@aim`, `@noise`, `@impulse`, `@controller`, `@core`, `@blend`)
- `three/`: target reads through the registry (`@targets`)
- `dom/`: input event handlers (`@input`)
- `scenes/`: whole frames of `KlippThree` with 1 to 50 cameras and a blend (`@scene`)

The scene benches take long enough per iteration to stay above the noise of a busy machine. Use them to spot a regression, then the smaller benches to find where it comes from.

Results are saved to `.labs/` (gitignored). A comparison only reports a change when it is statistically significant.

## Reading the output

`avg (min … max) p75 / p99` is the time per call. Compare it with a frame's budget, 16.67 ms at 60 fps or 8.33 ms at 120 fps, to see how many fit in one frame. Don't read allocations off the `heap` row for sub-microsecond calls: it overstates the bytes per call by orders of magnitude.

## Writing a bench

Code before `yield` is setup, and the yielded function is measured. Return a value from the measured function that depends on the work, so it isn't optimized away. Shared moving targets live in `targets.ts`.
