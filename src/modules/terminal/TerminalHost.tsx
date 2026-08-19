import { useEffect, useMemo, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";
import { useSettings } from "../../settings/SettingsContext";
import { useTerminalLayout } from "../../layout/TerminalLayoutContext";
import { registerShortcutAction } from "../../shortcuts/actionRegistry";
import type { ActionId } from "../../shortcuts/keybindings";
import { xtermOptions } from "../../themes/xterm";
import { isShiftEnter } from "./keys";
import { useTerminal } from "./useTerminal";
import {
  ptyClose,
  ptyForegroundProcess,
  ptyOpen,
  ptyResize,
  ptyWrite,
  stripBackgroundCodes,
} from "./pty";

const BASE_TERMINAL_OPTIONS = {
  cursorBlink: true,
  scrollback: 10_000,
  allowTransparency: true,
};

/**
 * Shift+Enter (no other modifiers) is the established "newline" convention in
 * terminal emulators: it is sent as ESC+CR (`\x1b\r`) so TUIs can distinguish
 * it from the plain `\r` that submits input (e.g. opencode's `alt+return`
 * newline binding). xterm 6.0.0 sends `\r` for both, so we intercept here.
 */

/** Bounds for the effective (default + zoom) font size. */
const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 24;

interface TerminalHostProps {
  /** Stable identity for this host's PTY session. */
  tabId: string;
  /** Panel slot this host occupies, or null when parked. */
  slot: number | null;
  /** Whether the host is currently on screen (hidden hosts skip fitting). */
  visible: boolean;
}

/**
 * One live terminal session, bound to a tab. The host stays mounted for the
 * tab's lifetime — visibility is controlled by the parent via CSS — so the
 * PTY session and scrollback survive tab switches, parking, and panel moves.
 * Unmounting (session kill) happens only when the tab closes.
 */
function TerminalHost({ tabId, slot, visible }: TerminalHostProps) {
  const sessionIdRef = useRef<number | null>(null);
  const spawningRef = useRef(false);
  const terminalRef = useRef<Terminal | null>(null);
  // Live flag for the strip-background output filter (read by the session
  // output handler, which is bound once per tab).
  const stripBackgroundRef = useRef(false);
  const visibleRef = useRef(visible);
  const titleRef = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const { settings, palette } = useSettings();
  const { tabOf, shellName, focusSlot, zoomTab, renameTab, closeTab } = useTerminalLayout();

  const tab = tabOf(tabId);
  const fontZoom = tab?.fontZoom ?? 0;
  const effectiveFontSize = Math.min(
    FONT_SIZE_MAX,
    Math.max(FONT_SIZE_MIN, settings.termSize + fontZoom),
  );

  // Keyboard focus switching (Cmd+1/2/3) must land DOM focus on this terminal,
  // not just change the highlighted slot. Register a per-slot focus handler the
  // shortcut hook calls after focusSlot().
  useEffect(() => {
    if (slot == null) return;
    const id = `focusTerminalSlot${slot}` as ActionId;
    return registerShortcutAction(id, () => terminalRef.current?.focus());
  }, [slot]);

  // Initial options reflect the settings at mount time; changes apply live.
  const initialOptions = useMemo(
    () => ({
      ...BASE_TERMINAL_OPTIONS,
      ...xtermOptions(
        palette,
        settings.termFont,
        settings.termSize,
        settings.background.image != null,
        settings.background.remapBackground,
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Fresh addon per terminal instance (StrictMode double-mount safe).
  const { containerRef, terminal, fitAddonRef } = useTerminal(initialOptions, [
    () => new WebglAddon(),
  ]);

  // Keep the latest terminal readable from stable callbacks.
  useEffect(() => {
    terminalRef.current = terminal;
  }, [terminal]);

  // Wire keyboard input and resize events back to the PTY.
  useEffect(() => {
    if (!terminal) return;
    const dataSub = terminal.onData((data) => {
      const id = sessionIdRef.current;
      if (id != null) void ptyWrite(id, data);
    });
    const resizeSub = terminal.onResize(({ cols, rows }) => {
      const id = sessionIdRef.current;
      if (id != null) void ptyResize(id, cols, rows);
    });
    // Shift+Enter → ESC+CR (`\x1b\r`), the shift-enter newline convention;
    // returning false stops xterm from emitting the plain `\r` it would
    // otherwise send. Every other key passes through xterm's default handling.
    // The handler is removed automatically when the terminal is disposed.
    // xterm calls this for BOTH keydown and keyup, so only write on keydown —
    // otherwise one press produces two `\x1b\r` sequences (two newlines).
    terminal.attachCustomKeyEventHandler((event) => {
      if (isShiftEnter(event)) {
        event.preventDefault();
        if (event.type === "keydown") {
          const id = sessionIdRef.current;
          if (id != null) void ptyWrite(id, "\x1b\r");
        }
        return false;
      }
      return true;
    });
    return () => {
      dataSub.dispose();
      resizeSub.dispose();
    };
  }, [terminal]);

  // Apply appearance live: theme + font family from settings, font size from
  // the per-tab zoom. Refit when the size changes so the new cell geometry
  // propagates to the PTY via onResize.
  const prevFontSizeRef = useRef(effectiveFontSize);
  useEffect(() => {
    if (!terminal) return;
    const { fontFamily, theme } = xtermOptions(
      palette,
      settings.termFont,
      settings.termSize,
      settings.background.image != null,
      settings.background.remapBackground,
    );
    terminal.options.fontFamily = fontFamily;
    terminal.options.theme = theme;
    terminal.options.fontSize = effectiveFontSize;
    if (prevFontSizeRef.current !== effectiveFontSize) {
      prevFontSizeRef.current = effectiveFontSize;
      fitAddonRef.current?.fit();
    }
  }, [terminal, settings, palette, effectiveFontSize, fitAddonRef]);

  // Keep the strip-background flag current for the (once-bound) output handler.
  useEffect(() => {
    stripBackgroundRef.current =
      settings.background.image != null && settings.background.stripBackground;
  }, [settings.background.image, settings.background.stripBackground]);

  // Ctrl/Cmd + wheel (or pinch) zooms this pane's font. Native non-passive
  // listener so preventDefault actually stops webview page zoom. Capture
  // phase is required: TUIs enable mouse reporting, which makes xterm install
  // its own wheel listener that stopPropagation()s — a bubble-phase listener
  // here would never fire inside htop/vim/opencode. Capture runs first, so we
  // intercept modifier-wheel before xterm turns it into a mouse report; plain
  // wheel (no modifier) passes through untouched.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      e.stopPropagation();
      zoomTab(tabId, e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, [containerRef, tabId, zoomTab]);

  // Auto-title: poll the foreground process while visible; rename when it
  // differs from the current title, reverting to the shell name when idle.
  // Runnable tabs use the same poller — their command runs through the shell,
  // so the foreground process (the command) is a child of the session's shell
  // pid and the poller names it correctly.
  useEffect(() => {
    titleRef.current = tab?.title;
  }, [tab?.title]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const interval = setInterval(() => {
      const id = sessionIdRef.current;
      if (id == null) return;
      void ptyForegroundProcess(id)
        .then((name) => {
          const next = name || shellName;
          if (cancelled || next === titleRef.current) return;
          renameTab(tabId, next);
        })
        .catch(() => {
          /* transient — retry next tick */
        });
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [visible, tabId, shellName, renameTab]);

  // Spawn the PTY session once the terminal is ready; tear it down on unmount
  // (tab close). React StrictMode mounts effects twice in dev; the synchronous
  // `spawningRef` guard makes the twin mount a no-op so exactly ONE shell is
  // spawned per tab — otherwise a doomed first shell would write its startup
  // output (a bare prompt) into the terminal before being killed.
  useEffect(() => {
    if (sessionIdRef.current !== null || spawningRef.current) return;
    // The terminal is created by `useTerminal`'s effect and synced to
    // `terminalRef` a commit later; wait for it so fit() can measure the real
    // size before the PTY spawns (a pre-terminal spawn would seed 80x24 and,
    // for a settled visible tab, never get refitted).
    const term = terminalRef.current;
    if (!term?.element) return;
    spawningRef.current = true;

    // Every tab belongs to a worktree; its shell starts there. Runnable tabs
    // run their command through the interactive shell instead. Fit first (when
    // visible) so the PTY is seeded at the terminal's real size and TUIs never
    // start at the 80x24 default and get resized mid-init; the ResizeObserver
    // keeps it correct.
    const cwd = tab?.worktree ?? null;
    const command = tab?.command ?? null;
    if (visibleRef.current) {
      try {
        fitAddonRef.current?.fit();
      } catch {
        /* hidden/zero-sized container — fall back below */
      }
    }
    const cols = Math.max(2, terminalRef.current?.cols ?? 80);
    const rows = Math.max(2, terminalRef.current?.rows ?? 24);

    void ptyOpen(cwd, (event) => {
      if (event.event === "output") {
        let bytes = new Uint8Array(event.data.data);
        // Strip background color codes when the option is on (read via ref so
        // the handler stays live without re-subscribing on settings change).
        if (stripBackgroundRef.current) {
          bytes = stripBackgroundCodes(bytes);
        }
        terminalRef.current?.write(bytes);
      } else if (event.event === "exit" && command !== null) {
        // Runnable tab: the process ending closes the tab.
        closeTab(tabId);
      }
    }, command, cols, rows)
      .then((id) => {
        spawningRef.current = false;
        sessionIdRef.current = id;
      })
      .catch((err: unknown) => {
        spawningRef.current = false;
        setError(String(err));
      });

    return () => {
      const id = sessionIdRef.current;
      if (id !== null) {
        sessionIdRef.current = null;
        void ptyClose(id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, terminal]);

  // Fit only while visible; hidden hosts are display:none and would fit to
  // zero cols/rows. Refit when a host becomes visible again.
  useEffect(() => {
    const fit = () => {
      const term = terminalRef.current;
      if (!term?.element) return; // xterm not opened yet
      fitAddonRef.current?.fit();
    };
    if (visible) {
      fit();
    }
    visibleRef.current = visible;
  }, [visible, fitAddonRef]);

  // Keep the terminal fitted while the pane resizes.
  useEffect(() => {
    if (!visible) return;
    const observer = new ResizeObserver(() => {
      if (!visibleRef.current) return;
      fitAddonRef.current?.fit();
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [visible, containerRef, fitAddonRef]);

  // Terminal fonts load lazily; until they do, xterm's cell metrics are wrong
  // and fit computes an incorrect size. Refit once the fonts settle so the
  // PTY (and TUIs) get the true dimensions.
  useEffect(() => {
    if (!visible) return;
    const fontsReady = document.fonts?.ready;
    if (!fontsReady) return;
    let cancelled = false;
    void fontsReady.then(() => {
      if (cancelled || !visibleRef.current) return;
      fitAddonRef.current?.fit();
    });
    return () => {
      cancelled = true;
    };
  }, [visible, fitAddonRef]);

  return (
    <div
      className="terminal-host"
      ref={containerRef}
      onMouseDown={() => {
        if (slot !== null) focusSlot(slot);
        terminalRef.current?.focus();
      }}
    >
      {error != null && <div className="terminal-error">{error}</div>}
    </div>
  );
}

export default TerminalHost;
