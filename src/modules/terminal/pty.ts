import { Channel, invoke } from "@tauri-apps/api/core";

/** Events streamed from the Rust PTY backend. Mirrors `TerminalEvent` in Rust. */
export type TerminalEvent =
  | { event: "output"; data: { sessionId: number; data: number[] } }
  | { event: "exit"; data: { sessionId: number; code: number } };

/** Spawn a shell PTY and stream its output to `onEvent`. Resolves with the session id. */
export async function ptyOpen(
  cwd: string | null,
  onEvent: (event: TerminalEvent) => void,
  command?: string[] | null,
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
 * Split a runnable command string into argv on whitespace, dropping empty
 * tokens (plain split — quoted args are intentionally unsupported for now).
 */
export function splitCommand(command: string): string[] {
  return command.trim().split(/\s+/).filter((tok) => tok.length > 0);
}
