/** Bitmask controlling how a camera transition is blended. */
export const BlendHints = {
  none: 0,
  cylindricalPosition: 1 << 0,
  sphericalPosition: 1 << 1,
  ignoreTarget: 1 << 3,
} as const;

export type BlendHints = number;
