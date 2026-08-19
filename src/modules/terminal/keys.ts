/**
 * Shift+Enter (no other modifiers) is the established "newline" convention in
 * terminal emulators: it is sent as ESC+CR (`\x1b\r`) so TUIs can distinguish
 * it from the plain `\r` that submits input (e.g. opencode's `alt+return`
 * newline binding).
 */
export function isShiftEnter(e: {
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}): boolean {
  return e.key === "Enter" && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey;
}
