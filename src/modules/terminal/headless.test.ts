import { describe, expect, it } from "vitest";
import { Terminal } from "@xterm/headless";

/** Write bytes and wait for xterm to finish parsing them (write is async). */
async function writeAndFlush(term: Terminal, data: string): Promise<void> {
  await new Promise<void>((resolve) => term.write(data, resolve));
}

/**
 * Draw the second prompt line (`╰─$ `) followed by a RPROMPT redraw:
 * `ESC[K ESC[<n>C <rprompt> ESC[<m>D`. Cursor starts at (0,0); after drawing
 * the 4-char prompt it is at column 4 — the position zsh returns to when the
 * RPROMPT math is correct.
 */
async function drawPromptWithRprompt(
  term: Terminal,
  fwd: number,
  rprompt: string,
  back: number,
): Promise<void> {
  await writeAndFlush(term, "\u2570\u2500$ ");
  await writeAndFlush(term, `\x1b[K\x1b[${fwd}C${rprompt}\x1b[${back}D`);
}

describe("headless xterm", () => {
  it("exposes the buffer API needed for state assertions", async () => {
    const term = new Terminal({ allowProposedApi: true, cols: 80, rows: 24 });
    await writeAndFlush(term, "hello");
    expect(term.buffer.active.cursorX).toBe(5);
    expect(term.buffer.active.cursorY).toBe(0);
    // translateToString pads with trailing spaces; trim for content checks.
    expect(term.buffer.active.getLine(0)?.translateToString().trimEnd()).toBe("hello");
  });

  it("correct RPROMPT math (width 5) returns the cursor after the prompt", async () => {
    // After the locale fix, zsh emits fwd=65/back=70 for `127 ↵` (5 glyphs)
    // at 75 cols: from col 4, 65 forward → 69, draw 5 → 74, 70 back → 4.
    const term = new Terminal({ allowProposedApi: true, cols: 75, rows: 39 });
    await drawPromptWithRprompt(term, 65, "\x1b[1m\x1b[31m127 ↵\x1b[00m\x1b[0m", 70);

    // Cursor must sit after `╰─$ ` (column 4), NOT on the `$` (column 2).
    expect(term.buffer.active.cursorX).toBe(4);
  });

  it("pre-fix RPROMPT math (width 7) lands the cursor on the prompt symbol", async () => {
    // The pre-fix bytes (no locale): fwd=59/back=66. From col 4, 59 forward →
    // 63, draw 5 → 68, 66 back → 2 (on `$`). This documents that the fix is
    // in the BYTES the shell emits (covered by the Rust L2 test), not in
    // xterm's handling of them.
    const term = new Terminal({ allowProposedApi: true, cols: 75, rows: 39 });
    await drawPromptWithRprompt(term, 59, "\x1b[1m\x1b[31m127 ↵\x1b[00m\x1b[0m", 66);

    expect(term.buffer.active.cursorX).toBe(2);
  });
});
