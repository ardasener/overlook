import { isMacOS } from "../lib/platform";

/** Every app action that can be bound to a keyboard shortcut. */
export type ActionId =
  | "focusSlot0"
  | "focusSlot1"
  | "focusSlot2"
  | "focusSidebar"
  | "nextTab"
  | "prevTab"
  | "closeTab"
  | "newTerminal"
  | "toggleVerticalSplit"
  | "toggleBottomSplit"
  | "toggleSidebar"
  | "openLauncher"
  | "zoomIn"
  | "zoomOut";

/** Internal (non-configurable) actions used to route focus to a terminal.
 *  Registered per-slot by each TerminalHost; not shown in settings. */
export type FocusSlotActionId =
  | "focusTerminalSlot0"
  | "focusTerminalSlot1"
  | "focusTerminalSlot2";

/** Action ids that can appear in the action registry. */
export type RegistryActionId = ActionId | FocusSlotActionId;

/** A parsed combo: which modifiers must be held, and the main key. */
export interface Combo {
  /** The platform primary modifier: Cmd on macOS, Ctrl elsewhere. */
  mod: boolean;
  /** Literal Ctrl key (distinct from `mod` on macOS). */
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  /** Normalized key (see `normalizeKey`). */
  key: string;
}

export interface Keybinding {
  /** Combo string, e.g. `"Cmd+Shift+["`. */
  primary: string;
  /** Alternative combo string, or null when only primary applies. */
  alt: string | null;
}

/** Human-readable labels for the settings UI. */
export const ACTION_LABELS: Record<ActionId, string> = {
  focusSlot0: "Focus terminal (top)",
  focusSlot1: "Focus terminal (right)",
  focusSlot2: "Focus terminal (bottom)",
  focusSidebar: "Focus workspace panel",
  nextTab: "Next tab",
  prevTab: "Previous tab",
  closeTab: "Close tab",
  newTerminal: "New terminal",
  toggleVerticalSplit: "Toggle vertical split",
  toggleBottomSplit: "Toggle bottom split",
  toggleSidebar: "Toggle workspace panel",
  openLauncher: "Open runnables",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
};

/** All bindable actions in display order. */
export const ACTIONS: ActionId[] = [
  "focusSlot0",
  "focusSlot1",
  "focusSlot2",
  "focusSidebar",
  "nextTab",
  "prevTab",
  "closeTab",
  "newTerminal",
  "toggleVerticalSplit",
  "toggleBottomSplit",
  "toggleSidebar",
  "openLauncher",
  "zoomIn",
  "zoomOut",
];

/** Modifier label for the current platform (Cmd on macOS, Ctrl elsewhere). */
export function modLabel(): string {
  return isMacOS() ? "Cmd" : "Ctrl";
}

/**
 * Unify keys that are the same physical key on different layouts: on US
 * layouts `+` is `Shift+=`, so both map to `=`. Zoom in/out can then be
 * bound as `Cmd++` / `Cmd+-` and match the physical presses.
 */
function normalizeKey(key: string): string {
  if (key === "+") return "=";
  return key;
}

/**
 * Parse a combo string like `"Cmd+Shift+["` into its parts. `Cmd` is the
 * platform-neutral primary (meta on macOS, ctrl elsewhere); `Ctrl` is the
 * literal ctrl key. Unknown tokens are ignored. `"Cmd++"` (zoom in, US layout
 * `Shift+=`) is handled so the trailing `+` is the key.
 */
export function parseCombo(combo: string): Combo {
  const out: Combo = { mod: false, ctrl: false, shift: false, alt: false, key: "" };
  // "Cmd++" / "Cmd+Shift++" → key is "+" (stored as the "=" physical key).
  if (combo.endsWith("++")) {
    const prefix = combo.slice(0, -1); // e.g. "Cmd+" → ["Cmd", ""]
    for (const part of prefix.split("+")) {
      if (part === "Cmd") out.mod = true;
      else if (part === "Ctrl") out.ctrl = true;
      else if (part === "Alt" || part === "Option") out.alt = true;
    }
    out.shift = true;
    out.key = "=";
    return out;
  }
  for (const part of combo.split("+")) {
    if (part === "Cmd") out.mod = true;
    else if (part === "Ctrl") out.ctrl = true;
    else if (part === "Shift") out.shift = true;
    else if (part === "Alt" || part === "Option") out.alt = true;
    else if (part.length > 0) out.key = normalizeKey(part.toLowerCase());
  }
  return out;
}

/**
 * Format a combo back to the canonical string form. `Shift+=` (the `+` key
 * on US layouts) renders as `+` and collapses the Shift token — so zoom in
 * shows `Cmd++` rather than `Cmd+Shift+=`. On non-macOS, `mod` renders as
 * `Ctrl` (matching the physical key); a literal `ctrl` renders as `Ctrl`.
 */
export function formatCombo(c: Combo): string {
  const parts: string[] = [];
  if (c.mod) parts.push(modLabel());
  else if (c.ctrl) parts.push("Ctrl");
  if (c.alt) parts.push("Alt");
  if (c.shift && c.key !== "=") parts.push("Shift");
  parts.push(c.key === "=" && c.shift ? "+" : c.key);
  return parts.join("+");
}

/**
 * Build a combo from a keyboard event (used when recording). On macOS the
 * primary modifier is Cmd (meta); literal Ctrl is recorded separately. On
 * other platforms Ctrl IS the primary, so it sets `mod`.
 */
export function comboFromEvent(e: KeyboardEvent): Combo {
  const mac = isMacOS();
  return {
    mod: mac ? e.metaKey : e.ctrlKey,
    ctrl: mac ? e.ctrlKey : false,
    shift: e.shiftKey,
    alt: e.altKey,
    key: e.key.toLowerCase(),
  };
}

/** Whether a keyboard event matches a combo string on this platform. */
export function matchesEvent(e: KeyboardEvent, combo: string): boolean {
  const c = parseCombo(combo);
  if (normalizeKey(e.key.toLowerCase()) !== c.key) return false;
  const mac = isMacOS();
  const modHeld = mac ? e.metaKey : e.ctrlKey;
  if (c.mod !== modHeld) return false;
  // Literal Ctrl: on macOS it's the ctrl key; elsewhere it coincides with the
  // primary modifier, which was already checked above.
  if (mac && c.ctrl !== e.ctrlKey) return false;
  // For the `=`/`+` key (zoom in), accept either shifted or unshifted press,
  // since US layouts produce `+` with Shift and other layouts produce `=`.
  if (c.key !== "=" && c.shift !== e.shiftKey) return false;
  if (c.alt !== e.altKey) return false;
  return true;
}

/** Default bindings (Cmd on macOS, Ctrl elsewhere via the Cmd token). */
export const DEFAULT_KEYBINDINGS: Record<ActionId, Keybinding> = {
  focusSlot0: { primary: "Cmd+1", alt: null },
  focusSlot1: { primary: "Cmd+2", alt: null },
  focusSlot2: { primary: "Cmd+3", alt: null },
  focusSidebar: { primary: "Cmd+4", alt: null },
  nextTab: { primary: "Cmd+]", alt: "Ctrl+Tab" },
  prevTab: { primary: "Cmd+[", alt: "Ctrl+Shift+Tab" },
  closeTab: { primary: "Cmd+W", alt: null },
  newTerminal: { primary: "Cmd+T", alt: null },
  toggleVerticalSplit: { primary: "Cmd+\\", alt: null },
  toggleBottomSplit: { primary: "Cmd+B", alt: null },
  toggleSidebar: { primary: "Cmd+S", alt: null },
  openLauncher: { primary: "Cmd+R", alt: null },
  zoomIn: { primary: "Cmd++", alt: null },
  zoomOut: { primary: "Cmd+-", alt: null },
};
