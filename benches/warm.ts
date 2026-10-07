/**
 * Runs `fn` a few hundred times before it is measured. labs times the first calls to decide whether to batch,
 * and cold code there makes it time every call alone, which mostly measures its own timer.
 */
export function warm<T>(fn: () => T, times = 500): () => T {
  for (let i = 0; i < times; i++) fn();
  return fn;
}
