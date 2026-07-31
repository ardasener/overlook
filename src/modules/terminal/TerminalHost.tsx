import { useEffect, useMemo, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import { WebglAddon } from "@xterm/addon-webgl";
import { useSettings } from "../../settings/SettingsContext";
import { xtermOptions } from "../../themes/xterm";
import { useTerminal } from "./useTerminal";
import { ptyClose, ptyOpen, ptyResize, ptyWrite } from "./pty";

const BASE_TERMINAL_OPTIONS = {
  cursorBlink: true,
  scrollback: 10_000,
};

interface TerminalHostProps {
  /** Stable identity for this host's PTY session. */
  tabId: string;
  /** Whether the host is currently on screen (hidden hosts skip fitting). */
  visible: boolean;
}

/**
 * One live terminal session, bound to a tab. The host stays mounted for the
 * tab's lifetime — visibility is controlled by the parent via CSS — so the
 * PTY session and scrollback survive tab switches, parking, and panel moves.
 * Unmounting (session kill) happens only when the tab closes.
 */
function TerminalHost({ tabId, visible }: TerminalHostProps) {
  const sessionIdRef = useRef<number | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const visibleRef = useRef(visible);
  const [error, setError] = useState<string | null>(null);

  const { settings, palette } = useSettings();

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
      if (id != null) void ptyResize(id, cols, rows);
    });
    return () => {
      dataSub.dispose();
      resizeSub.dispose();
    };
  }, [terminal]);

  // Apply appearance settings live: theme, font family, and font size swap
  // without recreating the terminal, preserving the PTY session + scrollback.
  useEffect(() => {
    if (!terminal) return;
    const { fontFamily, fontSize, theme } = xtermOptions(
      palette,
      settings.termFont,
      settings.termSize,
    );
    terminal.options.fontFamily = fontFamily;
    terminal.options.fontSize = fontSize;
    terminal.options.theme = theme;
  }, [terminal, settings, palette]);

  // Spawn the PTY session once the terminal is ready; tear it down on unmount
  // (tab close). StrictMode double-mounts effects in dev: the cancelled guard
  // closes any session opened by the first mount so exactly one shell survives.
  useEffect(() => {
    let cancelled = false;
    let openedId: number | null = null;

    void ptyOpen(null, (event) => {
      if (event.event === "output") {
        terminalRef.current?.write(new Uint8Array(event.data.data));
      }
    })
      .then((id) => {
        if (cancelled) {
          void ptyClose(id);
          return;
        }
        openedId = id;
        sessionIdRef.current = id;
      })
      .catch((err: unknown) => setError(String(err)));

    return () => {
      cancelled = true;
      sessionIdRef.current = null;
      if (openedId != null) void ptyClose(openedId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId]);

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

  return (
    <div
      className="terminal-host"
      ref={containerRef}
      onMouseDown={() => terminalRef.current?.focus()}
    >
      {error != null && <div className="terminal-error">{error}</div>}
    </div>
  );
}

export default TerminalHost;
