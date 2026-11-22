/** Bit of each modifier key in the `leftModifiers`, `rightModifiers` and `middleModifiers` of `ConsumedInput`. */
export const ModifierKeys = { shift: 1, ctrl: 2, alt: 4, meta: 8 } as const;

export type ModifierKey = keyof typeof ModifierKeys;
