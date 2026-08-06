import type { RegistryActionId } from "./keybindings";

type ShortcutAction = () => void;

/**
 * Module-level registry for app actions that live outside the layout/settings
 * contexts (e.g. the workspace-panel toggle in AppShell, the runnable launcher
 * popover in TerminalTabBar, per-slot terminal focus in TerminalHost).
 * Components register their handler on mount and the keyboard hook dispatches
 * through it.
 */
const registry = new Map<RegistryActionId, ShortcutAction>();

/** Register a handler for an action. Returns an unregister function. */
export function registerShortcutAction(id: RegistryActionId, fn: ShortcutAction): () => void {
  registry.set(id, fn);
  return () => {
    if (registry.get(id) === fn) registry.delete(id);
  };
}

/** Look up the registered handler, if any. */
export function getShortcutAction(id: RegistryActionId): ShortcutAction | undefined {
  return registry.get(id);
}
