/** Input region within the element, from `0` to `1` measured from its top-left corner. */
export type InteractiveArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Whether `clientX/Y` falls within `area` of `element`. A locked pointer counts as inside: its position is frozen. */
export function isInsideInteractiveArea(
  element: HTMLElement,
  area: InteractiveArea | null,
  clientX: number,
  clientY: number,
): boolean {
  if (!area || document.pointerLockElement === element) return true;
  const rect = element.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;
}
