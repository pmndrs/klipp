export * as cameraOffset from './cameraOffset';
export type { CameraOffsetParams } from './cameraOffset';
export { CameraOffsetExtension, type CameraOffsetOptions } from './CameraOffsetExtension';

export * as followZoom from './followZoom';
export type { FollowZoomParams, FollowZoomState } from './followZoom';
export { FollowZoomExtension, type FollowZoomOptions } from './FollowZoomExtension';

export * as groupFraming from './groupFraming';
export type {
  GroupFramingFitMode,
  GroupFramingMode,
  GroupFramingParams,
  GroupFramingState,
  GroupMember,
  GroupPositionMode,
} from './groupFraming';
export { GroupFramingExtension, type GroupFramingOptions } from './GroupFramingExtension';

export * as lens from './lens';
export type { LensParams, LensState } from './lens';
export { LensExtension, type LensOptions } from './LensExtension';

export * as recomposer from './recomposer';
export type { RecomposerParams } from './recomposer';
export { RecomposerExtension, type RecomposerOptions } from './RecomposerExtension';
