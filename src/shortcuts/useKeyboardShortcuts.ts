import { useEffect, useRef } from "react";
import { useTerminalLayout } from "../layout/TerminalLayoutContext";
import { useSettings } from "../settings/SettingsContext";
import { getShortcutAction } from "./actionRegistry";
import { ACTIONS, matchesEvent, type ActionId } from "./keybindings";

/** True when the event target is a text field where bare keystrokes must not
 *  trigger shortcuts (typing in search, editing runnables, etc.). xterm's
 *  hidden helper textarea is exempt — when a terminal is focused, app
 *  shortcuts still win. Modifier combos (Cmd/Ctrl/Alt) bypass this entirely:
 *  e.g. Cmd+1 must still switch terminals while the search input is focused. */
function isTypingTarget(e: KeyboardEvent): boolean {
  // Modifier combos are always app shortcuts, never typing.
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  const target = e.target;
  if (!(target instanceof HTMLElement)) return false;
  // Inside a terminal: the target is xterm's invisible helper textarea, which
  // must never swallow app shortcuts.
  if (target.closest(".xterm")) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  // AntD modals/popovers render in portals; the target inside them is an
  // input in the common cases above. Buttons inside popovers are safe to
  // override with shortcuts (the launcher popover rows).
  return false;
}

/**
 * Global keyboard shortcut dispatch. Runs in the capture phase so combos are
 * consumed before xterm's textarea (or any focused element) sees them.
 * Bindings come from settings; actions resolve from the layout context or the
 * app-action registry.
 */
export function useKeyboardShortcuts(): void {
  const { settings } = useSettings();
  const layout = useTerminalLayout();
  // Keep the latest layout in a ref so the capture handler (bound once per
  // keybinding change) always dispatches against the current state.
  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;

      for (const id of ACTIONS) {
        const binding = settings.keybindings[id];
        if (!binding) continue;
        const hit =
          matchesEvent(e, binding.primary) ||
          (binding.alt != null && matchesEvent(e, binding.alt));
        if (!hit) continue;
        dispatch(id);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.keybindings]);

  function dispatch(id: ActionId): void {
    const l = layoutRef.current;
    switch (id) {
      case "focusSlot0":
        l.focusSlot(0);
        getShortcutAction("focusTerminalSlot0")?.();
        break;
      case "focusSlot1":
        l.focusSlot(1);
        getShortcutAction("focusTerminalSlot1")?.();
        break;
      case "focusSlot2":
        l.focusSlot(2);
        getShortcutAction("focusTerminalSlot2")?.();
        break;
      case "focusSidebar":
        getShortcutAction("focusSidebar")?.();
        break;
      case "nextTab":
        moveTab(1);
        break;
      case "prevTab":
        moveTab(-1);
        break;
      case "closeTab": {
        const focused = l.state.slots[l.state.focusedSlot];
        if (focused != null) l.closeTab(focused);
        break;
      }
      case "newTerminal":
        l.newTab();
        break;
      case "toggleVerticalSplit":
        l.toggleVertical();
        break;
      case "toggleBottomSplit":
        l.toggleBottom();
        break;
      case "toggleSidebar":
        getShortcutAction("toggleSidebar")?.();
        break;
      case "openLauncher":
        getShortcutAction("openLauncher")?.();
        break;
      case "zoomIn": {
        const focused = l.state.slots[l.state.focusedSlot];
        if (focused != null) l.zoomTab(focused, 1);
        break;
      }
      case "zoomOut": {
        const focused = l.state.slots[l.state.focusedSlot];
        if (focused != null) l.zoomTab(focused, -1);
        break;
      }
    }
  }

  /** Select the tab adjacent to the focused one within the active layout. */
  function moveTab(delta: number): void {
    const l = layoutRef.current;
    const { tabs, slots, focusedSlot } = l.state;
    if (tabs.length === 0) return;
    const focusedId = slots[focusedSlot];
    const index = focusedId != null ? tabs.findIndex((t) => t.id === focusedId) : -1;
    const next = (index === -1 ? 0 : (index + delta + tabs.length) % tabs.length);
    l.selectTab(tabs[next].id);
  }
}
