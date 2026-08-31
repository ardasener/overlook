import { describe, expect, it } from "vitest";
import { shouldAllowTerminalTransparency } from "./xterm";

describe("shouldAllowTerminalTransparency", () => {
  it("disables transparency without a background image", () => {
    expect(shouldAllowTerminalTransparency(null)).toBe(false);
  });

  it("enables transparency with a background image", () => {
    expect(shouldAllowTerminalTransparency("wallpaper.jpg")).toBe(true);
  });
});
