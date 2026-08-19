import { describe, expect, it } from "vitest";
import { stripBackgroundCodes } from "./pty";

/** Decode a Uint8Array to a string for readable assertions. */
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

describe("stripBackgroundCodes", () => {
  it("removes standard background SGR codes", () => {
    const out = stripBackgroundCodes(
      new TextEncoder().encode("\x1b[41mred bg\x1b[0m"),
    );
    expect(dec(out)).toBe("red bg\x1b[0m");
  });

  it("removes 256-color and truecolor backgrounds", () => {
    const out = stripBackgroundCodes(
      new TextEncoder().encode(
        "\x1b[48;5;196m256\x1b[48;2;255;0;0mtrue\x1b[0m",
      ),
    );
    expect(dec(out)).toBe("256true\x1b[0m");
  });

  it("preserves foreground codes and non-background sequences", () => {
    const out = stripBackgroundCodes(
      new TextEncoder().encode(
        "\x1b[31mred \x1b[41m\x1b[1mB\x1b[0m\x1b[K",
      ),
    );
    // Foreground SGR, bold, and the erase-line CSI must survive.
    expect(dec(out)).toBe("\x1b[31mred \x1b[1mB\x1b[0m\x1b[K");
  });

  it("preserves multi-byte UTF-8 bytes byte-for-byte", () => {
    // `↵` is U+21B5 = 3 UTF-8 bytes. If the filter decode/re-encode round
    // trips it (e.g. a chunk boundary splits the sequence), it would become
    // U+FFFD — the exact corruption class the RPROMPT bug was suspected of.
    const original = "\x1b[41m127 ↵\x1b[0m";
    const out = stripBackgroundCodes(new TextEncoder().encode(original));
    const decoded = dec(out);
    expect(decoded).toBe("127 ↵\x1b[0m");
    expect(decoded.includes("\uFFFD")).toBe(false);
  });

  it("is a no-op on chunks with no background codes", () => {
    const original = "plain text \x1b[31mred\x1b[0m";
    const out = stripBackgroundCodes(new TextEncoder().encode(original));
    expect(dec(out)).toBe(original);
  });
});
