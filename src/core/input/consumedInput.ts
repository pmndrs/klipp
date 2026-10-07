/** Input gathered since the last frame, as plain numbers. */
export type ConsumedInput = {
  leftDx: number;
  leftDy: number;
  middleDx: number;
  middleDy: number;
  rightDx: number;
  rightDy: number;
  /** Single-finger touch movement. */
  touchOneDx: number;
  touchOneDy: number;
  /** Two-finger centroid movement. */
  touchTwoDx: number;
  touchTwoDy: number;
  /** Three-finger centroid movement. */
  touchThreeDx: number;
  touchThreeDy: number;
  /** Two-finger twist in radians. */
  touchRotateDelta: number;
  /** Pinch with two fingers or on a trackpad, as the change in `ln(scale)`. Spreading is positive. */
  pinchDelta: number;
  /** Wheel scrolling in pixels, as the browser reports it: right and down are positive. */
  wheelDeltaX: number;
  wheelDeltaY: number;
  /** Raw mouse movement while Pointer Lock is active and no button is held. */
  lockedDx: number;
  lockedDy: number;
  /** Current hold state for the source. */
  leftHeld: boolean;
  middleHeld: boolean;
  rightHeld: boolean;
  touchOneHeld: boolean;
  touchTwoHeld: boolean;
  touchThreeHeld: boolean;
};

/** Reusable zero-valued input buffer. */
export function create(): ConsumedInput {
  return {
    leftDx: 0,
    leftDy: 0,
    middleDx: 0,
    middleDy: 0,
    rightDx: 0,
    rightDy: 0,
    touchOneDx: 0,
    touchOneDy: 0,
    touchTwoDx: 0,
    touchTwoDy: 0,
    touchThreeDx: 0,
    touchThreeDy: 0,
    touchRotateDelta: 0,
    pinchDelta: 0,
    wheelDeltaX: 0,
    wheelDeltaY: 0,
    lockedDx: 0,
    lockedDy: 0,
    leftHeld: false,
    middleHeld: false,
    rightHeld: false,
    touchOneHeld: false,
    touchTwoHeld: false,
    touchThreeHeld: false,
  };
}
