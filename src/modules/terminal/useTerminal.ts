import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Terminal } from "@xterm/xterm";
import type { ITerminalAddon, ITerminalOptions } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

export interface UseTerminalResult {
  /** Attach to the element the terminal renders into. */
  containerRef: RefObject<HTMLDivElement | null>;
  /** The live terminal, null until the first effect run. */
  terminal: Terminal | null;
  /** Current fit addon, for refitting on resize/visibility changes. */
  fitAddonRef: RefObject<FitAddon | null>;
}

/**
 * Thin React wrapper around a raw xterm.js Terminal — replaces react-xtermjs
 * so we control creation, addon loading, and disposal directly.
 *
 * The terminal (and every addon) is created fresh inside the mount effect, so
 * StrictMode's double-mount never reuses a disposed addon. Options changes are
 * applied by the caller via `terminal.options` — never by recreating the
 * terminal, which would lose the session's scrollback.
 */
export function useTerminal(
  options: ITerminalOptions,
  addonFactories: (() => ITerminalAddon)[] = [],
): UseTerminalResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);

  useEffect(() => {
    const term = new Terminal(options);
    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;

    // Load fit plus any caller addons; a failing addon (e.g. WebGL on an
    // unsupported driver) falls back to xterm's default renderer.
    for (const factory of [() => fitAddon, ...addonFactories]) {
      try {
        term.loadAddon(factory());
      } catch (err) {
        console.warn("Failed to load terminal addon", err);
      }
    }

    if (containerRef.current) {
      term.open(containerRef.current);
      term.focus();
    }
    setTerminal(term);

    return () => {
      term.dispose();
      fitAddonRef.current = null;
      setTerminal(null);
    };
  }, []);

  return { containerRef, terminal, fitAddonRef };
}
