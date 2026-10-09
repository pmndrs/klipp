import { HardLookAt } from '../scenes/aim/HardLookAt';
import { PanTilt } from '../scenes/aim/PanTilt';
import { PanTiltRecentering } from '../scenes/aim/PanTiltRecentering';
import { PanTiltReferenceFrame } from '../scenes/aim/PanTiltReferenceFrame';
import { PanTiltRestrictedLook } from '../scenes/aim/PanTiltRestrictedLook';
import { RotateWithFollowTarget } from '../scenes/aim/RotateWithFollowTarget';
import { RotationComposer } from '../scenes/aim/RotationComposer';
import { RotationComposerLookahead } from '../scenes/aim/RotationComposerLookahead';
import { RotationComposerTargetOffset } from '../scenes/aim/RotationComposerTargetOffset';
import { BlendCurves } from '../scenes/blending/BlendCurves';
import { BlendCurvesDamping } from '../scenes/blending/BlendCurvesDamping';
import { BlendHints } from '../scenes/blending/BlendHints';
import { CustomBlends } from '../scenes/blending/CustomBlends';
import { Follow } from '../scenes/body/Follow';
import { HardLockToTarget } from '../scenes/body/HardLockToTarget';
import { OrbitFollow } from '../scenes/body/OrbitFollow';
import { OrbitFollowBindingMode } from '../scenes/body/OrbitFollowBindingMode';
import { OrbitFollowDampedAim } from '../scenes/body/OrbitFollowDampedAim';
import { OrbitFollowGroupFraming } from '../scenes/body/OrbitFollowGroupFraming';
import { OrbitFollowRecentering } from '../scenes/body/OrbitFollowRecentering';
import { OrbitFollowThreeRing } from '../scenes/body/OrbitFollowThreeRing';
import { PositionComposer } from '../scenes/body/PositionComposer';
import { PositionComposerDolly } from '../scenes/body/PositionComposerDolly';
import { PositionComposerLookahead } from '../scenes/body/PositionComposerLookahead';
import { GroupFraming } from '../scenes/extension/GroupFraming';
import { Lens } from '../scenes/extension/Lens';
import { Impulse } from '../scenes/impulse/Impulse';
import { InputFromData } from '../scenes/input/InputFromData';
import { InputRawInput } from '../scenes/input/InputRawInput';
import { InputTouchAndAreas } from '../scenes/input/InputTouchAndAreas';
import { InputWheelAndPinch } from '../scenes/input/InputWheelAndPinch';
import { BasicMultiChannelPerlin } from '../scenes/noise/BasicMultiChannelPerlin';
import { Placeholder } from '../scenes/Placeholder';
import { StandbyUpdate } from '../scenes/virtual-camera/StandbyUpdate';

import type { ExampleCategory } from './types';

/** Scenes not built yet point at `Placeholder` with `ready: false`, which hides them from the sidebar. */
export const categories: ExampleCategory[] = [
  {
    slug: 'body',
    title: 'Body',
    examples: [
      {
        slug: 'hard-lock-to-target',
        title: 'HardLockToTarget',
        Scene: HardLockToTarget,
        description:
          'The camera sits exactly on the blue ball as it orbits. Raise `damping` and watch it lag behind in the spectator view. Turn on `lookAtSubject` to add an Aim that looks at the red shape.',
        ready: true,
      },
      {
        slug: 'follow',
        title: 'Follow',
        Scene: Follow,
        description:
          'The camera follows a plane at a fixed `offset`. `bindingMode` changes how the offset turns with the plane: with `lockToTarget` the camera rolls with every bank, with `lockToTargetWithWorldUp` it stays level.',
        spectatorPosition: [0, 14, 18],
        spectatorTarget: [0, 3, 0],
        ready: true,
      },
      {
        slug: 'orbit-follow',
        title: 'OrbitFollow',
        group: 'orbit-follow',
        Scene: OrbitFollow,
        description:
          'Drag to move the camera around the shape, scroll or pinch to zoom. The orange circle and blue arc show where dragging takes the camera. Turn on `lockPointer` and left-click to orbit with the mouse alone.',
        spectatorPosition: [12, 10, 14],
        spectatorTarget: [0, 1.5, 0],
        ready: true,
      },
      {
        slug: 'orbit-follow-binding-mode',
        title: 'OrbitFollow: Binding Mode',
        group: 'orbit-follow',
        Scene: OrbitFollowBindingMode,
        description:
          '`bindingMode` decides whether the orbit turns with the plane: with `lockToTargetWithWorldUp` the camera stays behind it, with `worldSpace` it keeps its heading. With `damping` the camera lags behind the plane, but dragging around the orbit is never delayed.',
        spectatorPosition: [0, 14, 18],
        spectatorTarget: [0, 3, 0],
        ready: true,
      },
      {
        slug: 'orbit-follow-three-ring',
        title: 'OrbitFollow: Three Rings',
        group: 'orbit-follow',
        Scene: OrbitFollowThreeRing,
        description:
          'With `orbitStyle: threeRing` the camera moves on a surface through three rings instead of a sphere. Change the rings and `splineCurvature`, and drag up and down to follow the blue curve.',
        spectatorPosition: [14, 10, 14],
        spectatorTarget: [0, 2, 0],
        ready: true,
      },
      {
        slug: 'orbit-follow-recentering',
        title: 'OrbitFollow: Recentering',
        group: 'orbit-follow',
        Scene: OrbitFollowRecentering,
        description:
          'Drag and let go. After `wait` seconds the camera eases back: behind the plane with `recenteringTarget: trackingTarget`, or to the axis center with `axisCenter`.',
        spectatorPosition: [0, 14, 18],
        spectatorTarget: [0, 3, 0],
        ready: true,
      },
      {
        slug: 'orbit-follow-damped-aim',
        title: 'OrbitFollow: Damped Aim',
        group: 'orbit-follow',
        Scene: OrbitFollowDampedAim,
        description:
          "The camera lags behind the plane with `damping`, and a `RotationComposer` with `aimDamping` turns toward it slowly, so the plane drifts on screen. Dragging around the orbit still keeps it in place: turns made by the Body skip the Aim's damping.",
        spectatorPosition: [0, 14, 18],
        spectatorTarget: [0, 3, 0],
        ready: true,
      },
      {
        slug: 'orbit-follow-group-framing',
        title: 'OrbitFollow: Group Framing',
        group: 'orbit-follow',
        Scene: OrbitFollowGroupFraming,
        description:
          'Orbit around a group of balls while `GroupFraming` moves the camera in and out along the view, so every ball stays in the frame from any side. With `fitMode: ceiling` it only ever moves out from the orbit, with `rigid` it also moves in.',
        spectatorPosition: [0, 40, 50],
        spectatorTarget: [0, 0, 0],
        ready: true,
      },
      {
        slug: 'position-composer',
        title: 'PositionComposer',
        group: 'position-composer',
        Scene: PositionComposer,
        description:
          'A top-down camera moves to keep the ball inside the green `deadZone`, and never lets it past the red `hardLimit`. Turn off `autoMove` to move the ball yourself.',
        spectatorPosition: [16, 20, 16],
        spectatorTarget: [0, 0, 0],
        ready: true,
      },
      {
        slug: 'position-composer-dolly',
        title: 'PositionComposer: Dolly',
        group: 'position-composer',
        Scene: PositionComposerDolly,
        description:
          'The camera moves forward and back to stay `cameraDistance` away from the ball, but ignores movement between the two rings (`depthDeadZone`).',
        spectatorPosition: [12, 6, 14],
        spectatorTarget: [0, 0, 0],
        ready: true,
      },
      {
        slug: 'position-composer-lookahead',
        title: 'PositionComposer: Lookahead',
        group: 'position-composer',
        Scene: PositionComposerLookahead,
        description:
          'With `lookaheadTime`, the camera frames where the ball is going, so the ball trails behind the crosshair. Set it to 0 to keep the ball centered.',
        spectatorPosition: [0, 16, 22],
        spectatorTarget: [0, 1, 0],
        ready: true,
      },
    ],
  },
  {
    slug: 'aim',
    title: 'Aim',
    examples: [
      {
        slug: 'hard-look-at',
        title: 'HardLookAt',
        Scene: HardLookAt,
        description:
          'A fixed camera always looks straight at the selected ball. Switch `activeTarget` to see it snap to the other one instantly.',
        spectatorPosition: [0, 4, 15],
        spectatorTarget: [0, 2, 0],
        ready: true,
      },
      {
        slug: 'rotate-with-follow-target',
        title: 'RotateWithFollowTarget',
        Scene: RotateWithFollowTarget,
        description:
          'The camera rides in the gondola and copies its rotation. Turn off `followPosition` to switch to a camera that stays in the middle and only copies the rotation.',
        spectatorPosition: [0, 12, 16],
        spectatorTarget: [0, 2, 0],
        ready: true,
      },
      {
        slug: 'rotation-composer',
        title: 'RotationComposer',
        group: 'rotation-composer',
        Scene: RotationComposer,
        description:
          'A fixed camera turns only when the ball leaves the green `deadZone`, and never lets it past the red `hardLimit`. Turn off `autoMove` to move the ball yourself.',
        spectatorPosition: [0, 6, 18],
        spectatorTarget: [0, 2, 0],
        ready: true,
      },
      {
        slug: 'rotation-composer-lookahead',
        title: 'RotationComposer: Lookahead',
        group: 'rotation-composer',
        Scene: RotationComposerLookahead,
        description:
          'The camera aims where the ball is going, so the ball trails behind the crosshair. Set `lookaheadTime` to 0 to keep it centered. The camera only turns, it never moves.',
        spectatorPosition: [0, 16, 22],
        spectatorTarget: [0, 1, 0],
        ready: true,
      },
      {
        slug: 'rotation-composer-target-offset',
        title: 'RotationComposer: Target Offset',
        group: 'rotation-composer',
        Scene: RotationComposerTargetOffset,
        description:
          "The camera aims at the tip of the yellow arrow (`targetOffset`) instead of the box's center. The offset moves and turns with the box.",
        spectatorPosition: [0, 6, 14],
        spectatorTarget: [0, 2, 0],
        ready: true,
      },
      {
        slug: 'pan-tilt',
        title: 'PanTilt',
        group: 'pan-tilt',
        Scene: PanTilt,
        description:
          'Drag or touch to look around. Turn on `lockPointer` and left-click for mouse look with Pointer Lock. `damping` and `maxSpeed` change how the camera responds.',
        spectatorPosition: [8, 5, 8],
        spectatorTarget: [0, 2, 0],
        ready: true,
      },
      {
        slug: 'pan-tilt-reference-frame',
        title: 'PanTilt: Reference Frame',
        group: 'pan-tilt',
        Scene: PanTiltReferenceFrame,
        description:
          "Look around from the cockpit of a flying plane. With `rigidMount` on, `pan` and `tilt` are relative to the plane, so the view turns, banks and dips with it. Turn it off and the view keeps a fixed heading, but still tilts with the plane's bank and pitch, since `Follow` passes the plane's up direction on to the Aim.",
        spectatorPosition: [0, 10, 16],
        spectatorTarget: [0, 3, 0],
        ready: true,
      },
      {
        slug: 'pan-tilt-restricted-look',
        title: 'PanTilt: Restricted Look',
        group: 'pan-tilt',
        Scene: PanTiltRestrictedLook,
        description:
          'A security camera with a limited `panRange` and `tiltRange`. Drag past either pillar and it stops at the edge instead of wrapping around.',
        spectatorPosition: [0, 6, 8],
        spectatorTarget: [0, 2, 0],
        ready: true,
      },
      {
        slug: 'pan-tilt-recentering',
        title: 'PanTilt: Recentering',
        group: 'pan-tilt',
        Scene: PanTiltRecentering,
        description:
          'Drag away from the green marker and let go. After `wait` seconds the camera eases back to the center on its own.',
        spectatorPosition: [8, 5, 8],
        spectatorTarget: [0, 2, 0],
        ready: true,
      },
    ],
  },
  {
    slug: 'input',
    title: 'Input',
    examples: [
      {
        slug: 'input-from-data',
        title: 'Input from data',
        Scene: InputFromData,
        description:
          'One camera, three sources of input. Pick a `source` and only its settings show up. With the mouse you can record what you do, `scripted` lets code orbit with `applyDelta`, and `replay` plays the recording back without any mouse.',
        spectatorPosition: [8, 5, 8],
        spectatorTarget: [0, 2, 0],
        ready: true,
      },
      {
        slug: 'input-wheel-and-pinch',
        title: 'Wheel and Pinch',
        Scene: InputWheelAndPinch,
        description:
          'Scroll or pinch to zoom. The wheel moves in pixels and needs its own `gain`, while a pinch on a trackpad or a touch screen zooms exactly as much as the fingers spread. The zoom stops at `closest` and `farthest`.',
        spectatorPosition: [12, 10, 14],
        spectatorTarget: [0, 1.5, 0],
        ready: true,
      },
      {
        slug: 'input-touch-and-areas',
        title: 'Touch and Areas',
        Scene: InputTouchAndAreas,
        description:
          'Input only starts inside the green `area`, so the rest of the page stays usable. Pinch to zoom and twist to turn the box: with `lockTouchAxis` a two-finger gesture does one or the other, never both, which is handy when twisting is handled by hand from `input`. Turn off `suppressContextMenu` to get the browser menu back on right-click.',
        spectatorPosition: [12, 10, 14],
        spectatorTarget: [0, 1.5, 0],
        ready: true,
      },
      {
        slug: 'input-raw-input',
        title: 'Raw Input',
        Scene: InputRawInput,
        description:
          'Everything the controller read this frame, as plain numbers in `input`. Use it for gestures no axis maps: here a right-drag spins the shape.',
        spectatorPosition: [12, 10, 14],
        spectatorTarget: [0, 1.5, 0],
        ready: true,
      },
    ],
  },
  {
    slug: 'noise',
    title: 'Noise',
    examples: [
      {
        slug: 'basic-multi-channel-perlin',
        title: 'BasicMultiChannelPerlin',
        Scene: BasicMultiChannelPerlin,
        description:
          'Continuous shake on top of an orbit camera. Drag to orbit, scroll to zoom, and tune the shake in the panel.',
        spectatorPosition: [4, 5, 12],
        spectatorTarget: [0, 2, 4],
        ready: true,
      },
    ],
  },
  {
    slug: 'impulse',
    title: 'Impulse',
    examples: [
      {
        slug: 'impulse',
        title: 'Impulse',
        Scene: Impulse,
        description:
          'Each button fires an impulse from its colored marker. Try `cameraSpace` for recoil-style kicks and `shake` for extra rattle. The last button uses the curve you draw in the panel.',
        spectatorPosition: [10, 8, 16],
        spectatorTarget: [0, 1, -3],
        ready: true,
      },
    ],
  },
  {
    slug: 'extension',
    title: 'Extension',
    examples: [
      {
        slug: 'group-framing',
        title: 'GroupFraming',
        Scene: GroupFraming,
        description:
          "Four spheres orbit at different distances, and the camera moves closer or farther to keep all of them in view. Compare `fitMode` 'rigid' and 'ceiling'.",
        spectatorPosition: [26, 19, 32],
        spectatorTarget: [0, 0, 0],
        ready: true,
      },
      {
        slug: 'lens',
        title: 'Lens',
        Scene: Lens,
        description:
          'Change `fov`, `near` and `far` live. Push `near` up to clip the yellow sphere, pull `far` in to clip the tunnel, and swing `fov` to stretch it.',
        spectatorPosition: [4, 5, 10],
        spectatorTarget: [0, 1.5, -10],
        ready: true,
      },
    ],
  },
  {
    slug: 'virtual-camera',
    title: 'VirtualCamera',
    examples: [
      {
        slug: 'standby-update',
        title: 'StandbyUpdate',
        Scene: StandbyUpdate,
        description:
          'A ring of cameras watches the ball, one of them on screen. Watch the blue frustums in the spectator view: with `always` they all turn smoothly, with `roundRobin` the off-screen ones take turns and step, and with `never` they freeze until you put one on screen.',
        spectatorPosition: [0, 22, 20],
        spectatorTarget: [0, 1, 0],
        ready: true,
      },
    ],
  },
  {
    slug: 'camera-controls',
    title: 'Camera Controls',
    examples: [
      { slug: 'locked', title: 'Locked orbit', Scene: Placeholder, ready: false },
      { slug: 'free-vs-locked', title: 'Free vs. locked', Scene: Placeholder, ready: false },
    ],
  },
  {
    slug: 'debugging',
    title: 'Debugging',
    examples: [{ slug: 'camera-frustum-helper', title: 'CameraFrustumHelper', Scene: Placeholder, ready: false }],
  },
  {
    slug: 'blending',
    title: 'Blending',
    examples: [
      {
        slug: 'blend-curves',
        title: 'BlendCurves',
        group: 'blend-curves',
        Scene: BlendCurves,
        description:
          "Pick a shot and watch the blend. The bar shows the curve's progress against plain linear time (the white tick), so you can see each curve's shape.",
        spectatorPosition: [8, 10, 14],
        spectatorTarget: [0, 1.5, 0],
        ready: true,
      },
      {
        slug: 'blend-curves-damping',
        title: 'BlendCurves: Damping',
        group: 'blend-curves',
        Scene: BlendCurvesDamping,
        description:
          'The same switch with two kinds of blend: a curve always finishes in exactly `time` seconds, while damping eases in like a spring and has no fixed end.',
        spectatorPosition: [10, 8, 14],
        spectatorTarget: [0, 1.5, 0],
        ready: true,
      },
      {
        slug: 'blend-hints',
        title: 'BlendHints',
        Scene: BlendHints,
        description:
          "Switch between a high and a low shot. The line shows the camera's path: straight by default, arcing with `spherical` or `cylindrical`. `ignoreTarget` changes how the camera turns during the blend.",
        spectatorPosition: [-22, 10, -2],
        spectatorTarget: [0, 6, 0],
        ready: true,
      },
      {
        slug: 'custom-blends',
        title: 'CustomBlends',
        Scene: CustomBlends,
        description:
          'Pick a camera to trigger a transition. Some camera pairs have their own blend in `customBlends`, and the label shows which rule was used.',
        spectatorPosition: [14, 12, -10],
        spectatorTarget: [0, 2, 0],
        ready: true,
      },
    ],
  },
  {
    slug: 'events',
    title: 'Camera Events',
    examples: [{ slug: 'camera-events', title: 'Camera Events', Scene: Placeholder, ready: false }],
  },
  {
    slug: 'combined',
    title: 'Combined rigs',
    examples: [
      { slug: 'third-person-chase-cam', title: 'Third-person chase cam', Scene: Placeholder, ready: false },
      { slug: 'top-down-strategy-camera', title: 'Top-down / strategy camera', Scene: Placeholder, ready: false },
      { slug: 'cutscene-system', title: 'Cutscene system', Scene: Placeholder, ready: false },
      { slug: 'impact-feedback', title: 'Impact feedback', Scene: Placeholder, ready: false },
      { slug: 'kitchen-sink', title: 'Kitchen sink', Scene: Placeholder, ready: false },
    ],
  },
  {
    slug: 'tutorials',
    title: 'Tutorials',
    examples: [
      {
        slug: 'third-person-from-scratch',
        title: 'Third-person camera from scratch',
        Scene: Placeholder,
        ready: false,
      },
      { slug: 'gameplay-cutscene-handoff', title: 'Gameplay <-> cutscene handoff', Scene: Placeholder, ready: false },
      { slug: 'camera-shake-on-hit', title: 'Camera shake on hit', Scene: Placeholder, ready: false },
      {
        slug: 'custom-extension-parallax',
        title: 'Custom Extension: pointer parallax',
        Scene: Placeholder,
        ready: false,
      },
      { slug: 'ui-reacting-to-events', title: 'UI reacting to camera events', Scene: Placeholder, ready: false },
      { slug: 'debugging-dead-zones', title: 'Debugging dead zones live', Scene: Placeholder, ready: false },
    ],
  },
];
