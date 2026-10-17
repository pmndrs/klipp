// Not exported from the package: what only cameras and the mixers they are in call on each other.

/** Connect a camera to a mixer, or disconnect it with `null`. Called again when the mixer's root changes. */
export const attachTo = Symbol('attachTo');
/** The mixer a camera is in. */
export const parent = Symbol('parent');
/** The `Klipp` at the top of a mixer's tree, or `null` while it is not in one. */
export const root = Symbol('root');
/** Re-attach every camera in a mixer, after its root changed. */
export const rootChanged = Symbol('rootChanged');
/** Register a raw state in a mixer's arbitration. Returns a function that unregisters it. */
export const register = Symbol('register');
export const setPriority = Symbol('setPriority');
export const setHints = Symbol('setHints');
/** Advance a mixer's arbitration and blend, without running any camera. */
export const advance = Symbol('advance');
/** Warn when another camera in a mixer already has this camera's name. */
export const checkName = Symbol('checkName');
/** Run a mixer's cameras for one frame: the active one, and the others as their `standbyUpdate` says. */
export const runCameras = Symbol('runCameras');
/** Pass the viewport size on to a camera's pieces. */
export const prepare = Symbol('prepare');
/** Run a camera's pieces for one frame. */
export const run = Symbol('run');
/** Skip a camera this frame, keeping the time for its next run. */
export const skip = Symbol('skip');
