import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface TerminalTab {
  id: string;
  title: string;
}

export interface LayoutState {
  /** All tabs in creation order (shown + parked). */
  tabs: TerminalTab[];
  /** slot index → tab id (null = placeholder). slot0 always exists. */
  slots: (string | null)[];
  /** Panel that receives new/selected tabs. */
  focusedSlot: number;
  /** Right pane (slot1) open. */
  vertical: boolean;
  /** Bottom pane (slot2) open. */
  bottom: boolean;
  nextTabNumber: number;
}

interface TerminalLayoutContextValue {
  state: LayoutState;
  /** Panel slot a tab currently occupies, or null if parked. */
  slotOf: (tabId: string) => number | null;
  newTab: () => void;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  focusSlot: (slot: number) => void;
  toggleVertical: () => void;
  toggleBottom: () => void;
}

const TerminalLayoutContext = createContext<TerminalLayoutContextValue | null>(null);

/** Create a fresh tab id. Monotonic counter avoids collisions with old ids. */
let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `tab-${idCounter}`;
}

export function TerminalLayoutProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LayoutState>(() => {
    const firstTab: TerminalTab = { id: makeId(), title: "Terminal 1" };
    return {
      tabs: [firstTab],
      // Always length 3; closed panels hold null.
      slots: [firstTab.id, null, null],
      focusedSlot: 0,
      vertical: false,
      bottom: false,
      nextTabNumber: 2,
    };
  });

  const slotOf = useCallback(
    (tabId: string) => {
      const i = state.slots.findIndex((t) => t === tabId);
      return i === -1 ? null : i;
    },
    [state.slots],
  );

  /** Create a tab for a new terminal. */
  const createTab = useCallback((nextNumber: number) => {
    const tab: TerminalTab = { id: makeId(), title: `Terminal ${nextNumber}` };
    return { tab, nextNumber: nextNumber + 1 };
  }, []);

  const newTab = useCallback(() => {
    setState((prev) => {
      const focused = Math.min(prev.focusedSlot, prev.slots.length - 1);
      const { tab, nextNumber } = createTab(prev.nextTabNumber);
      const slots = [...prev.slots];
      slots[focused] = tab.id; // previous occupant parks
      return {
        ...prev,
        tabs: [...prev.tabs, tab],
        slots,
        focusedSlot: focused,
        nextTabNumber: nextNumber,
      };
    });
  }, [createTab]);

  const closeTab = useCallback((tabId: string) => {
    setState((prev) => {
      const slots = prev.slots.map((t) => (t === tabId ? null : t));
      const wasFocused = prev.slots[prev.focusedSlot] === tabId;
      return {
        ...prev,
        tabs: prev.tabs.filter((t) => t.id !== tabId),
        slots,
        focusedSlot: wasFocused ? 0 : prev.focusedSlot,
      };
    });
  }, []);

  const selectTab = useCallback((tabId: string) => {
    setState((prev) => {
      const focused = Math.min(prev.focusedSlot, prev.slots.length - 1);
      // If the tab is already shown somewhere, just focus that slot.
      const shown = prev.slots.indexOf(tabId);
      if (shown !== -1) {
        return { ...prev, focusedSlot: shown };
      }
      // Otherwise show it in the focused slot, parking the current occupant.
      const slots = [...prev.slots];
      slots[focused] = tabId;
      return { ...prev, slots, focusedSlot: focused };
    });
  }, []);

  const focusSlot = useCallback((slot: number) => {
    setState((prev) => ({ ...prev, focusedSlot: slot }));
  }, []);

  /**
   * Open/close a panel at `slot`. Opening fills it with the first parked tab
   * in order, or creates a new terminal when nothing is parked. Closing parks
   * whatever the panel held.
   */
  const toggleSplit = useCallback(
    (slot: number, key: "vertical" | "bottom") => {
      setState((prev) => {
        const open = !prev[key];
        const slots = [...prev.slots];
        if (open) {
          const parked = prev.tabs.find((t) => !slots.includes(t.id));
          if (parked) {
            slots[slot] = parked.id;
            return { ...prev, [key]: open, slots };
          }
          const { tab, nextNumber } = createTab(prev.nextTabNumber);
          slots[slot] = tab.id;
          return {
            ...prev,
            [key]: open,
            slots,
            tabs: [...prev.tabs, tab],
            nextTabNumber: nextNumber,
          };
        }
        slots[slot] = null;
        return {
          ...prev,
          [key]: open,
          slots,
          focusedSlot: prev.focusedSlot === slot ? 0 : prev.focusedSlot,
        };
      });
    },
    [createTab],
  );

  const toggleVertical = useCallback(() => toggleSplit(1, "vertical"), [toggleSplit]);
  const toggleBottom = useCallback(() => toggleSplit(2, "bottom"), [toggleSplit]);
  const value = useMemo<TerminalLayoutContextValue>(
    () => ({ state, slotOf, newTab, closeTab, selectTab, focusSlot, toggleVertical, toggleBottom }),
    [state, slotOf, newTab, closeTab, selectTab, focusSlot, toggleVertical, toggleBottom],
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
