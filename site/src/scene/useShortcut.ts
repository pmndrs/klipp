import { useEffect } from 'react';

/** Calls `onPress` when the key `code` is pressed on its own, unless the user is typing in a field. */
export function useShortcut(code: string, onPress: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== code || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return;
      onPress();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [code, onPress]);
}
