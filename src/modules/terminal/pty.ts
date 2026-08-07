import { Channel, invoke } from "@tauri-apps/api/core";

/** Events streamed from the Rust PTY backend. Mirrors `TerminalEvent` in Rust. */
export type TerminalEvent =
  | { event: "output"; data: { sessionId: number; data: number[] } }
  | { event: "exit"; data: { sessionId: number; code: number } };

/** Spawn a shell PTY and stream its output to `onEvent`. Resolves with the session id. */
export async function ptyOpen(
  cwd: string | null,
  onEvent: (event: TerminalEvent) => void,
  command?: string | null,
  cols?: number,
  rows?: number,
): Promise<number> {
  const channel = new Channel<TerminalEvent>();
  channel.onmessage = onEvent;
  return invoke<number>("pty_open", {
    cwd,
    onEvent: channel,
    command: command ?? null,
    cols: cols ?? 80,
    rows: rows ?? 24,
  });
}

/** Write raw input bytes to a session's PTY. */
export function ptyWrite(sessionId: number, data: string): Promise<void> {
  const bytes = Array.from(new TextEncoder().encode(data));
  return invoke("pty_write", { sessionId, data: bytes });
}

/** Resize a session's PTY. */
export function ptyResize(
  sessionId: number,
  cols: number,
  rows: number,
): Promise<void> {
  return invoke("pty_resize", { sessionId, cols, rows });
}

/**
 * Resolve the name of the process running in the foreground of a session's
 * shell (the deepest live descendant), or "" when the shell itself is the
 * leaf (terminal idle).
 */
export function ptyForegroundProcess(sessionId: number): Promise<string> {
  return invoke<string>("pty_foreground_process", { sessionId });
}

/** Basename of the resolved default shell (e.g. "zsh", "bash"), lowercased. */
export function ptyShellName(): Promise<string> {
  return invoke<string>("pty_shell_name");
}

/** Kill the shell of a session. */
export function ptyClose(sessionId: number): Promise<void> {
  return invoke("pty_close", { sessionId });
}

/**
 * Remove background color SGR codes from an output chunk so every background
 * renders transparent (the "strip background colors" option). Preserves
 * foreground codes and all other bytes. Covers:
 * - standard backgrounds `\x1b[40m`..`\x1b[47m`, `\x1b[100m`..`\x1b[107m`
 * - 256-color backgrounds `\x1b[48;5;Nm`
 * - truecolor backgrounds `\x1b[48;2;r;g;bm`
 */
export function stripBackgroundCodes(data: Uint8Array): Uint8Array {
  const text = new TextDecoder().decode(data);
  // ESC built via fromCharCode to satisfy no-control-regex (which bans ESC
  // in regex literals even as \x1b / \u001b).
  const esc = String.fromCharCode(27);
  const bgCodes = new RegExp(
    `${esc}\\[(?:4[0-7]|10[0-7])m|${esc}\\[48;[25];[0-9;]*m`,
    "g",
  );
  const filtered = text.replace(bgCodes, "");
  return new TextEncoder().encode(filtered);
}
