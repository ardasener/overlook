import { Channel, invoke } from "@tauri-apps/api/core";

/** Events streamed from the Rust PTY backend. Mirrors `TerminalEvent` in Rust. */
export type TerminalEvent =
  | { event: "output"; data: { sessionId: number; data: number[] } }
  | { event: "exit"; data: { sessionId: number; code: number } };

/** Spawn a shell PTY and stream its output to `onEvent`. Resolves with the session id. */
export async function ptyOpen(
  cwd: string | null,
  onEvent: (event: TerminalEvent) => void,
): Promise<number> {
  const channel = new Channel<TerminalEvent>();
  channel.onmessage = onEvent;
  return invoke<number>("pty_open", { cwd, onEvent: channel });
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

/** Kill the shell of a session. */
export function ptyClose(sessionId: number): Promise<void> {
  return invoke("pty_close", { sessionId });
}
