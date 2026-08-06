import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ptyShellName } from "../modules/terminal/pty";

export interface TerminalTab {
  id: string;
  title: string;
  /** Font size offset relative to the settings default (per-tab zoom). */
  fontZoom: number;
  /** Worktree path this tab's sessions run in. */
  worktree: string;
  /** Command run through the interactive shell (runnable tabs); null = plain shell. */
  command: string | null;
}

/** Session-scoped layout for one worktree: its tabs, splits, and focus. */
export interface WorktreeLayout {
  tabs: TerminalTab[];
  /** slot index → tab id (null = placeholder). slot0 always exists. */
  slots: (string | null)[];
  focusedSlot: number;
  /** Right pane (slot1) open. */
  vertical: boolean;
  /** Bottom pane (slot2) open. */
  bottom: boolean;
}

/**
 * Shape of the ACTIVE worktree's layout, kept for component compatibility
 * (the tab bar, split layout, and dimming read these fields).
 */
export interface LayoutState {
  tabs: TerminalTab[];
  slots: (string | null)[];
  focusedSlot: number;
  vertical: boolean;
  bottom: boolean;
}

/** In-flight pointer-based tab drag (WKWebView lacks working HTML5 DnD). */
export interface TabDrag {
  tabId: string;
  x: number;
  y: number;
  /** Pane slot currently under the pointer, or null. */
  overSlot: number | null;
}

/** Extract the slot index from a slot element's class (`slot-0`/`slot-1`/`slot-2`). */
export function slotFromClass(el: Element): number | null {
  const m = el.className.match(/slot-([012])/);
  return m ? Number(m[1]) : null;
}

interface TerminalLayoutContextValue {
  /** The active worktree's layout (empty when nothing is active). */
  state: LayoutState;
  /** Every tab across every worktree (hosts stay mounted). */
  allTabs: TerminalTab[];
  /** Currently selected worktree path, or null. */
  activeWorktree: string | null;
  /** Resolved default shell name (e.g. "zsh"), the idle tab title. */
  shellName: string;
  tabOf: (tabId: string) => TerminalTab | undefined;
  /** Panel slot a tab occupies within its own worktree, or null if parked. */
  slotOf: (tabId: string) => number | null;
  /** Activate a worktree, creating a fresh one-tab layout on first visit. */
  setActiveWorktree: (path: string) => void;
  newTab: () => void;
  /** Launch runnable commands: one tab per command, first in the focused slot,
   * the rest parked, all in the active worktree. */
  launchRunnable: (commands: string[]) => void;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  focusSlot: (slot: number) => void;
  toggleVertical: () => void;
  toggleBottom: () => void;
  /** Assign a dragged tab to a slot (parked → assign; shown elsewhere → swap). */
  dropTabOnSlot: (tabId: string, slot: number) => void;
  /** Swap the tabs of two slots (reserved for pane drag, not yet wired). */
  swapSlots: (a: number, b: number) => void;
  /** Adjust a tab's font size by a delta relative to the settings default. */
  zoomTab: (tabId: string, delta: number) => void;
  /** Set a tab's title (auto-naming from the running process). */
  renameTab: (tabId: string, title: string) => void;
  /** Active pointer drag (null when idle). */
  drag: TabDrag | null;
  beginDrag: (tabId: string, x: number, y: number) => void;
  moveDrag: (x: number, y: number) => void;
  endDrag: () => void;
}

const TerminalLayoutContext = createContext<TerminalLayoutContextValue | null>(null);

/** Create a fresh tab id. Monotonic counter avoids collisions with old ids. */
let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `tab-${idCounter}`;
}

/** Build a tab for a worktree; `command` is null for shell sessions. */
function makeTab(worktree: string, title: string, command: string | null): TerminalTab {
  return { id: makeId(), title, fontZoom: 0, worktree, command };
}

export function TerminalLayoutProvider({ children }: { children: ReactNode }) {
  // Default tab title = the resolved shell name (e.g. "zsh", "bash").
  const [shellName, setShellName] = useState("sh");
  useEffect(() => {
    let cancelled = false;
    void ptyShellName()
      .then((name) => {
        if (!cancelled && name) setShellName(name);
      })
      .catch(() => {
        /* keep "sh" fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** worktree path → its session layout. */
  const [layouts, setLayouts] = useState<Record<string, WorktreeLayout>>({});
  const [activeWorktree, setActiveWorktreeState] = useState<string | null>(null);

  const activeLayout: WorktreeLayout | null =
    activeWorktree != null ? (layouts[activeWorktree] ?? null) : null;

  const allTabs = useMemo(
    () => Object.values(layouts).flatMap((l) => l.tabs),
    [layouts],
  );

  const tabOf = useCallback(
    (tabId: string) => allTabs.find((t) => t.id === tabId),
    [allTabs],
  );

  const slotOf = useCallback(
    (tabId: string) => {
      for (const layout of Object.values(layouts)) {
        const i = layout.slots.indexOf(tabId);
        if (i !== -1) return i;
      }
      return null;
    },
    [layouts],
  );

  /** The layout that owns a tab (for cross-worktree mutations). */
  const layoutOfTab = useCallback(
    (tabId: string) => {
      for (const [path, layout] of Object.entries(layouts)) {
        if (layout.tabs.some((t) => t.id === tabId)) return path;
      }
      return null;
    },
    [layouts],
  );

  const updateLayout = useCallback(
    (path: string, updater: (l: WorktreeLayout) => WorktreeLayout) => {
      setLayouts((prev) => {
        const layout = prev[path];
        if (!layout) return prev;
        const next = updater(layout);
        // Bail when nothing changed so stable updates keep stable references
        // (children keyed off `layouts`/`allTabs` must not churn).
        return next === layout ? prev : { ...prev, [path]: next };
      });
    },
    [],
  );

  const updateActiveLayout = useCallback(
    (updater: (l: WorktreeLayout) => WorktreeLayout) => {
      setLayouts((prev) => {
        if (activeWorktree == null || !prev[activeWorktree]) return prev;
        const layout = prev[activeWorktree];
        const next = updater(layout);
        return next === layout ? prev : { ...prev, [activeWorktree]: next };
      });
    },
    [activeWorktree],
  );

  const setActiveWorktree = useCallback(
    (path: string) => {
      setLayouts((prev) => {
        if (prev[path]) return prev;
        // Fresh worktree: one tab in the default slot.
        const tab = makeTab(path, shellName, null);
        return {
          ...prev,
          [path]: {
            tabs: [tab],
            slots: [tab.id, null, null],
            focusedSlot: 0,
            vertical: false,
            bottom: false,
          },
        };
      });
      setActiveWorktreeState(path);
    },
    [shellName],
  );

  const newTab = useCallback(() => {
    updateActiveLayout((layout) => {
      const focused = Math.min(layout.focusedSlot, layout.slots.length - 1);
      const tab = makeTab(activeWorktree!, shellName, null);
      const slots = [...layout.slots];
      slots[focused] = tab.id; // previous occupant parks
      return { ...layout, tabs: [...layout.tabs, tab], slots, focusedSlot: focused };
    });
  }, [updateActiveLayout, shellName, activeWorktree]);

  const launchRunnable = useCallback(
    (commands: string[]) => {
      if (commands.length === 0 || activeWorktree == null) return;
      updateActiveLayout((layout) => {
        const focused = Math.min(layout.focusedSlot, layout.slots.length - 1);
        // Titles start as the shell name; the auto-title poller renames each
        // tab to its foreground process (the command is the shell's child).
        const tabs = commands.map((cmd) => makeTab(activeWorktree, shellName, cmd));
        const slots = [...layout.slots];
        slots[focused] = tabs[0].id; // previous occupant parks
        return {
          ...layout,
          tabs: [...layout.tabs, ...tabs],
          slots,
          focusedSlot: focused,
        };
      });
    },
    [updateActiveLayout, activeWorktree, shellName],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      const path = layoutOfTab(tabId);
      if (!path) return;
      updateLayout(path, (layout) => {
        const slots = layout.slots.map((t) => (t === tabId ? null : t));
        const wasFocused = layout.slots[layout.focusedSlot] === tabId;
        return {
          ...layout,
          tabs: layout.tabs.filter((t) => t.id !== tabId),
          slots,
          focusedSlot: wasFocused ? 0 : layout.focusedSlot,
        };
      });
    },
    [layoutOfTab, updateLayout],
  );

  const selectTab = useCallback(
    (tabId: string) => {
      updateActiveLayout((layout) => {
        const focused = Math.min(layout.focusedSlot, layout.slots.length - 1);
        // If the tab is already shown somewhere, just focus that slot.
        const shown = layout.slots.indexOf(tabId);
        if (shown !== -1) {
          return shown === focused ? layout : { ...layout, focusedSlot: shown };
        }
        // Otherwise show it in the focused slot, parking the current occupant.
        const slots = [...layout.slots];
        slots[focused] = tabId;
        return { ...layout, slots, focusedSlot: focused };
      });
    },
    [updateActiveLayout],
  );

  const focusSlot = useCallback(
    (slot: number) => {
      updateActiveLayout((layout) =>
        layout.focusedSlot === slot ? layout : { ...layout, focusedSlot: slot },
      );
    },
    [updateActiveLayout],
  );

  const toggleSplit = useCallback(
    (slot: number, key: "vertical" | "bottom") => {
      updateActiveLayout((layout) => {
        const open = !layout[key];
        const slots = [...layout.slots];
        if (open) {
          const parked = layout.tabs.find((t) => !slots.includes(t.id));
          if (parked) {
            slots[slot] = parked.id;
            return { ...layout, [key]: open, slots };
          }
          const tab = makeTab(activeWorktree!, shellName, null);
          slots[slot] = tab.id;
          return { ...layout, [key]: open, slots, tabs: [...layout.tabs, tab] };
        }
        slots[slot] = null;
        return {
          ...layout,
          [key]: open,
          slots,
          focusedSlot: layout.focusedSlot === slot ? 0 : layout.focusedSlot,
        };
      });
    },
    [updateActiveLayout, shellName, activeWorktree],
  );

  const toggleVertical = useCallback(() => toggleSplit(1, "vertical"), [toggleSplit]);
  const toggleBottom = useCallback(() => toggleSplit(2, "bottom"), [toggleSplit]);

  const dropTabOnSlot = useCallback(
    (tabId: string, slot: number) => {
      updateActiveLayout((layout) => {
        const slots = [...layout.slots];
        const from = slots.indexOf(tabId);
        if (from !== -1 && from !== slot) {
          // Shown in another pane → swap the two panes' tabs.
          slots[from] = slots[slot];
          slots[slot] = tabId;
        } else if (from === -1) {
          // Parked → assign, parking the slot's current occupant.
          slots[slot] = tabId;
        } else {
          return { ...layout, focusedSlot: slot };
        }
        return { ...layout, slots, focusedSlot: slot };
      });
    },
    [updateActiveLayout],
  );

  const swapSlots = useCallback(
    (a: number, b: number) => {
      updateActiveLayout((layout) => {
        const slots = [...layout.slots];
        const tmp = slots[a];
        slots[a] = slots[b];
        slots[b] = tmp;
        return { ...layout, slots };
      });
    },
    [updateActiveLayout],
  );

  const zoomTab = useCallback(
    (tabId: string, delta: number) => {
      const path = layoutOfTab(tabId);
      if (!path) return;
      updateLayout(path, (layout) => ({
        ...layout,
        tabs: layout.tabs.map((t) =>
          t.id === tabId ? { ...t, fontZoom: t.fontZoom + delta } : t,
        ),
      }));
    },
    [layoutOfTab, updateLayout],
  );

  const renameTab = useCallback(
    (tabId: string, title: string) => {
      const path = layoutOfTab(tabId);
      if (!path) return;
      updateLayout(path, (layout) => ({
        ...layout,
        tabs: layout.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
      }));
    },
    [layoutOfTab, updateLayout],
  );

  // ── Pointer-based tab drag ──────────────────────────────────────────────

  const [drag, setDrag] = useState<TabDrag | null>(null);
  const dragRef = useRef<TabDrag | null>(null);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const beginDrag = useCallback((tabId: string, x: number, y: number) => {
    // Prevent native text selection window-wide while dragging (WKWebView
    // would otherwise select workspace text under the pointer and swallow
    // the mousemove/mouseup events driving the drag).
    document.body.classList.add("ol-dragging");
    setDrag({ tabId, x, y, overSlot: null });
  }, []);

  const moveDrag = useCallback((x: number, y: number) => {
    setDrag((prev) => {
      if (!prev) return prev;
      const el = document.elementFromPoint(x, y);
      const slotEl = el?.closest?.(".slot");
      const overSlot =
        slotEl && !slotEl.classList.contains("host-hidden")
          ? slotFromClass(slotEl)
          : null;
      return { ...prev, x, y, overSlot };
    });
  }, []);

  const endDrag = useCallback(() => {
    document.body.classList.remove("ol-dragging");
    const d = dragRef.current;
    if (d && d.overSlot !== null) {
      dropTabOnSlot(d.tabId, d.overSlot);
    }
    setDrag(null);
  }, [dropTabOnSlot]);

  // While dragging, track the pointer globally; end on mouseup. preventDefault
  // stops native text selection from ever starting under the cursor.
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    };
    const onUp = () => endDrag();
    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag !== null, moveDrag, endDrag]);

  // The active layout exposed in the old flat shape.
  const state: LayoutState = useMemo(
    () =>
      activeLayout
        ? {
            tabs: activeLayout.tabs,
            slots: activeLayout.slots,
            focusedSlot: activeLayout.focusedSlot,
            vertical: activeLayout.vertical,
            bottom: activeLayout.bottom,
          }
        : { tabs: [], slots: [null, null, null], focusedSlot: 0, vertical: false, bottom: false },
    [activeLayout],
  );

  const value = useMemo<TerminalLayoutContextValue>(
    () => ({
      state,
      allTabs,
      activeWorktree,
      shellName,
      tabOf,
      slotOf,
      setActiveWorktree,
      newTab,
      launchRunnable,
      closeTab,
      selectTab,
      focusSlot,
      toggleVertical,
      toggleBottom,
      dropTabOnSlot,
      swapSlots,
      zoomTab,
      renameTab,
      drag,
      beginDrag,
      moveDrag,
      endDrag,
    }),
    [
      state,
      allTabs,
      activeWorktree,
      shellName,
      tabOf,
      slotOf,
      setActiveWorktree,
      newTab,
      launchRunnable,
      closeTab,
      selectTab,
      focusSlot,
      toggleVertical,
      toggleBottom,
      dropTabOnSlot,
      swapSlots,
      zoomTab,
      renameTab,
      drag,
      beginDrag,
      moveDrag,
      endDrag,
    ],
  );

  return (
    <TerminalLayoutContext.Provider value={value}>{children}</TerminalLayoutContext.Provider>
  );
}

export function useTerminalLayout(): TerminalLayoutContextValue {
  const ctx = useContext(TerminalLayoutContext);
  if (!ctx) throw new Error("useTerminalLayout must be used within TerminalLayoutProvider");
  return ctx;
}
