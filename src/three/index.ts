export { KlippThree, type KlippMode, type KlippThreeOptions, type FrameUpdate } from './KlippThree';
export {
  VirtualCameraThree,
  type VirtualCameraThreeOptions,
  type InitialCameraState,
  type CameraPiece,
} from './VirtualCameraThree';
export { copyCameraStateFromCamera, applyCameraState, writeCameraTransform, writeCameraLens } from './camera';
export { CameraFrustumHelperThree } from './CameraFrustumHelperThree';
export { readTargetPose, readTargetRotation } from './readTargetPose';
export { readTargetExtent } from './readTargetExtent';
export {
  resolveTargetPosition,
  resolveTargetRotation,
  resolveTargetSize,
  type Target,
  type RefLike,
} from './resolve/Target';
export { resolveVector3, resolveVec3, isVector3Like, type Vector3Like } from './resolve/resolveVector3';
export { TargetRegistry, type TargetSlot, type RegisteredTarget } from './resolve/TargetRegistry';

export { Vector3Damper } from './damping/Vector3Damper';
export { QuaternionDamper } from './damping/QuaternionDamper';
export { Predictor } from './damping/Predictor';

export { HardLockToTargetBodyThree, type HardLockToTargetOptions } from './body/HardLockToTargetBodyThree';
export { FollowBodyThree, type FollowThreeOptions } from './body/FollowBodyThree';
export { PositionComposerBodyThree, type PositionComposerThreeOptions } from './body/PositionComposerBodyThree';

export { HardLookAtAimThree } from './aim/HardLookAtAimThree';
export {
  RotateWithFollowTargetAimThree,
  type RotateWithFollowTargetOptions,
} from './aim/RotateWithFollowTargetAimThree';
export { RotationComposerAimThree, type RotationComposerThreeOptions } from './aim/RotationComposerAimThree';
export { PanTiltAimThree } from './aim/PanTiltAimThree';

export { TargetGroup, type TargetGroupMember, type TargetGroupPositionMode } from './extension/TargetGroup';
export {
  GroupFramingExtensionThree,
  type GroupFramingOptions,
  type GroupFramingFitMode,
  type GroupFramingMode,
} from './extension/GroupFramingExtensionThree';

export {
  BasicMultiChannelPerlinNoiseThree,
  type PerlinNoiseThreeOptions,
} from './noise/BasicMultiChannelPerlinNoiseThree';
