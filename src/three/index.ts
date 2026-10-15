export { applyCameraState, copyCameraStateFromCamera, writeCameraLens, writeCameraTransform } from './camera';
export { CameraFrustumHelperThree } from './CameraFrustumHelperThree';
export { KlippThree, type KlippThreeOptions } from './KlippThree';
export { readTargetExtent } from './readTargetExtent';
export { readTargetPose, readTargetRotation } from './readTargetPose';
export { VirtualCameraThree, type InitialCameraState, type VirtualCameraThreeOptions } from './VirtualCameraThree';

export { HardLookAtAimThree } from './aim/HardLookAtAimThree';
export { PanTiltAimThree } from './aim/PanTiltAimThree';
export { RotateWithFollowTargetAimThree } from './aim/RotateWithFollowTargetAimThree';
export { RotationComposerAimThree, type RotationComposerThreeOptions } from './aim/RotationComposerAimThree';

export { FollowBodyThree, type FollowThreeOptions } from './body/FollowBodyThree';
export { HardLockToTargetBodyThree } from './body/HardLockToTargetBodyThree';
export { OrbitFollowBodyThree, type OrbitFollowThreeOptions } from './body/OrbitFollowBodyThree';
export { OrbitFollowHelperThree } from './body/OrbitFollowHelperThree';
export { PositionComposerBodyThree, type PositionComposerThreeOptions } from './body/PositionComposerBodyThree';

export { Predictor } from './damping/Predictor';
export { QuaternionDamper } from './damping/QuaternionDamper';
export { Vector3Damper } from './damping/Vector3Damper';

export { GroupFramingExtensionThree } from './extension/GroupFramingExtensionThree';
export { TargetGroup, type TargetGroupMember } from './extension/TargetGroup';

export {
  BasicMultiChannelPerlinNoiseThree,
  type PerlinNoiseThreeOptions,
} from './noise/BasicMultiChannelPerlinNoiseThree';

export { resolveVector3, type Vector3Like } from './resolve/resolveVector3';
export { resolveTargetPosition, resolveTargetRotation, type RefLike, type Target } from './resolve/Target';
export { TargetRegistry, type RegisteredTarget, type TargetSlot } from './resolve/TargetRegistry';
