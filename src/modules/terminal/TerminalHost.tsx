import { useEffect, useMemo, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";
import { useSettings } from "../../settings/SettingsContext";
import { useTerminalLayout } from "../../layout/TerminalLayoutContext";
import { xtermOptions } from "../../themes/xterm";
import { useTerminal } from "./useTerminal";
import {
  ptyClose,
  ptyForegroundProcess,
  ptyOpen,
  ptyResize,
  ptyWrite,
} from "./pty";

const BASE_TERMINAL_OPTIONS = {
  cursorBlink: true,
  scrollback: 10_000,
};

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

  // Initial options reflect the settings at mount time; changes apply live.
  const initialOptions = useMemo(
    () => ({
      ...BASE_TERMINAL_OPTIONS,
      ...xtermOptions(palette, settings.termFont, settings.termSize),
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
      console.debug(`[pty] onResize tab=${tabId} cols=${cols} rows=${rows} session=${id}`);
      if (id != null) void ptyResize(id, cols, rows);
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
    );
    terminal.options.fontFamily = fontFamily;
    terminal.options.theme = theme;
    terminal.options.fontSize = effectiveFontSize;
    if (prevFontSizeRef.current !== effectiveFontSize) {
      prevFontSizeRef.current = effectiveFontSize;
      fitAddonRef.current?.fit();
    }
  }, [terminal, settings, palette, effectiveFontSize, fitAddonRef]);

  // Ctrl/Cmd + wheel (or pinch) zooms this pane's font. Native non-passive
  // listener so preventDefault actually stops webview page zoom.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      zoomTab(tabId, e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [containerRef, tabId, zoomTab]);

  // Auto-title: poll the foreground process while visible; rename when it
  // differs from the current title, reverting to the shell name when idle.
  // Runnable tabs have a deterministic exe-name title and are skipped — the
  // poller cannot name a direct-exec process (it IS the session's shell pid).
  useEffect(() => {
    if (tab?.command != null) return;
    titleRef.current = tab?.title;
  }, [tab?.title, tab?.command]);

  useEffect(() => {
    if (!visible || tab?.command != null) return;
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
    // direct-exec their argv instead. Fit first (when visible) so the PTY is
    // seeded at the terminal's real size and TUIs never start at the 80x24
    // default and get resized mid-init; the ResizeObserver keeps it correct.
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
    console.debug(`[pty] spawn tab=${tabId} visible=${visibleRef.current} cols=${cols} rows=${rows}`, command ? `cmd=${command.join(" ")}` : "shell");

    void ptyOpen(cwd, (event) => {
      if (event.event === "output") {
        terminalRef.current?.write(new Uint8Array(event.data.data));
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
      console.debug(`[pty] fit(visible) tab=${tabId} -> cols=${term.cols} rows=${term.rows}`);
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
      console.debug(`[pty] fit(observer) tab=${tabId} -> cols=${terminalRef.current?.cols} rows=${terminalRef.current?.rows}`);
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
      console.debug(`[pty] fit(fonts-ready) tab=${tabId} -> cols=${terminalRef.current?.cols} rows=${terminalRef.current?.rows}`);
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
