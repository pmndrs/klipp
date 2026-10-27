export { CameraMixer } from './CameraMixer';

export * as cameraState from './cameraState';
export type { CameraState } from './cameraState';

export { EventDispatcher, type DispatchedEvent, type EventListener } from './EventDispatcher';

export * as klippState from './klippState';
export type {
  CameraSelection,
  CameraTransitionEventMap,
  KlippCamera,
  KlippEvent,
  KlippParams,
  KlippState,
  VirtualCameraConfig,
} from './klippState';
export { Klipp, type FrameUpdate, type KlippMode, type KlippOptions } from './Klipp';

export * as spline from './spline';
export type { Spline, SplinePositionUnits } from './spline';

export * as targetExtent from './targetExtent';
export type { TargetExtent } from './targetExtent';

export * as targetPose from './targetPose';
export type { TargetPose } from './targetPose';

export {
  VirtualCamera,
  type AimPiece,
  type BodyPiece,
  type CameraPiece,
  type CameraStateWriter,
  type ExtensionPiece,
  type ExtensionSlot,
} from './VirtualCamera';
export { VirtualCameraBase, type StandbyUpdate, type VirtualCameraOptions } from './VirtualCameraBase';

export * from './aim/index';
export * from './blend/index';
export * from './body/index';
export * from './damping/index';
export * from './debug/index';
export * from './extension/index';
export * from './groups/index';
export * from './impulse/index';
export * from './input/index';
export * from './noise/index';
