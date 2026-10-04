export { applyCameraState, copyCameraStateFromCamera, writeCameraLens, writeCameraTransform } from './camera';
export { CameraFrustumHelperThree } from './CameraFrustumHelperThree';
export { KlippThree, type FrameUpdate, type KlippMode, type KlippThreeOptions } from './KlippThree';
export { readTargetExtent } from './readTargetExtent';
export { readTargetPose, readTargetRotation } from './readTargetPose';
export { isVector3Like, resolveVec3, resolveVector3, type Vector3Like } from './resolve/resolveVector3';
export {
  resolveTargetPosition,
  resolveTargetRotation,
  resolveTargetSize,
  type RefLike,
  type Target,
} from './resolve/Target';
export { TargetRegistry, type RegisteredTarget, type TargetSlot } from './resolve/TargetRegistry';
export {
  VirtualCameraThree,
  type CameraPiece,
  type InitialCameraState,
  type VirtualCameraThreeOptions,
} from './VirtualCameraThree';

export { Predictor } from './damping/Predictor';
export { QuaternionDamper } from './damping/QuaternionDamper';
export { Vector3Damper } from './damping/Vector3Damper';

export { FollowBodyThree, type FollowThreeOptions } from './body/FollowBodyThree';
export { HardLockToTargetBodyThree, type HardLockToTargetOptions } from './body/HardLockToTargetBodyThree';
export { PositionComposerBodyThree, type PositionComposerThreeOptions } from './body/PositionComposerBodyThree';

export { HardLookAtAimThree } from './aim/HardLookAtAimThree';
export { PanTiltAimThree } from './aim/PanTiltAimThree';
export {
  RotateWithFollowTargetAimThree,
  type RotateWithFollowTargetOptions,
} from './aim/RotateWithFollowTargetAimThree';
export { RotationComposerAimThree, type RotationComposerThreeOptions } from './aim/RotationComposerAimThree';

export {
  GroupFramingExtensionThree,
  type GroupFramingFitMode,
  type GroupFramingMode,
  type GroupFramingOptions,
} from './extension/GroupFramingExtensionThree';
export { TargetGroup, type TargetGroupMember, type TargetGroupPositionMode } from './extension/TargetGroup';

export {
  BasicMultiChannelPerlinNoiseThree,
  type PerlinNoiseThreeOptions,
} from './noise/BasicMultiChannelPerlinNoiseThree';
