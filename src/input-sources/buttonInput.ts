/** Which buttons are held, and which went down or up since the last `clear`. */
export type ButtonInput<T> = {
  readonly pressed: Set<T>;
  readonly justPressed: Set<T>;
  readonly justReleased: Set<T>;
};

export const create = <T>(): ButtonInput<T> => ({
  pressed: new Set(),
  justPressed: new Set(),
  justReleased: new Set(),
});

/** Marks `button` as held. Pressing a held button again is not a new press. */
export function press<T>(state: ButtonInput<T>, button: T): void {
  if (state.pressed.has(button)) return;
  state.pressed.add(button);
  state.justPressed.add(button);
}

/** Releases `button` if it was held. */
export function release<T>(state: ButtonInput<T>, button: T): void {
  if (state.pressed.delete(button)) state.justReleased.add(button);
}

/** Releases every held button, for when the page loses focus mid-press. */
export function releaseAll<T>(state: ButtonInput<T>): void {
  for (const button of state.pressed) state.justReleased.add(button);
  state.pressed.clear();
}

/** Starts a new frame: forgets which buttons just went down or up, keeps what is held. */
export function clear<T>(state: ButtonInput<T>): void {
  state.justPressed.clear();
  state.justReleased.clear();
}
