import { describe, expect, it } from "vitest";
import { Terminal } from "@xterm/headless";

/** Write bytes and wait for xterm to finish parsing them. */
async function writeAndFlush(term: Terminal, data: string): Promise<void> {
  await new Promise<void>((resolve) => term.write(data, resolve));
}

describe("xterm escape-sequence handling (hand-authored)", () => {
  it("cursor-up/back arithmetic is exact", async () => {
    const term = new Terminal({ allowProposedApi: true, cols: 40, rows: 10 });
    await writeAndFlush(term, "abc");
    // From (3,0): up 1 line → (3,-1) clamped to (3,0); back 3 → (0,0).
    await writeAndFlush(term, "\x1b[1A\x1b[3D");
    expect(term.buffer.active.cursorX).toBe(0);
    expect(term.buffer.active.cursorY).toBe(0);
  });

  it("wraps long output across rows, not columns", async () => {
    const term = new Terminal({ allowProposedApi: true, cols: 5, rows: 10 });
    await writeAndFlush(term, "1234567890");
    // 10 chars in a 5-col terminal: row 0 fills cols 0..4, row 1 gets 5..9.
    expect(term.buffer.active.cursorY).toBe(1);
    expect(term.buffer.active.getLine(0)?.translateToString().trimEnd()).toBe("12345");
    expect(term.buffer.active.getLine(1)?.translateToString().trimEnd()).toBe("67890");
  });

  it("CUrsor Position (CUP) sets an absolute position", async () => {
    const term = new Terminal({ allowProposedApi: true, cols: 40, rows: 20 });
    await writeAndFlush(term, "\x1b[5;10H");
    expect(term.buffer.active.cursorY).toBe(4); // 1-based → 0-based
    expect(term.buffer.active.cursorX).toBe(9);
  });

  it("erase-in-display clears the screen content", async () => {
    const term = new Terminal({ allowProposedApi: true, cols: 20, rows: 5 });
    await writeAndFlush(term, "line1\r\nline2\x1b[2J");
    // ED(2J) clears the visible screen: every line is now blank.
    for (let y = 0; y < 5; y++) {
      expect(term.buffer.active.getLine(y)?.translateToString().trimEnd()).toBe("");
    }
  });
});
