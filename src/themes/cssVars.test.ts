import { describe, expect, it } from "vitest";
import { paletteCssVars } from "./cssVars";
import type { Palette } from "./palettes";

const palette: Palette = {
  id: "test",
  name: "Test",
  kind: "light",
  bg: "#fdf6e3",
  surface: "#eee8d5",
  surfaceAlt: "#e4ddc8",
  border: "#93a1a1",
  text: "#657b83",
  textSecondary: "#839496",
  textMuted: "#586e75",
  primary: "#268bd2",
  primaryText: "#ffffff",
  accents: ["#2aa198", "#b58900", "#6c71c4"],
  syntax: {
    keyword: "#6c71c4",
    string: "#859900",
    comment: "#93a1a1",
    number: "#d33682",
    function: "#268bd2",
    type: "#2aa198",
    operator: "#dc322f",
    variable: "#657b83",
    property: "#268bd2",
    punctuation: "#839496",
    error: "#dc322f",
  },
  ansi: {
    black: "#073642",
    red: "#dc322f",
    green: "#859900",
    yellow: "#b58900",
    blue: "#268bd2",
    magenta: "#d33682",
    cyan: "#2aa198",
    white: "#eee8d5",
    brightBlack: "#586e75",
    brightRed: "#cb4b16",
    brightGreen: "#586e75",
    brightYellow: "#657b83",
    brightBlue: "#839496",
    brightMagenta: "#6c71c4",
    brightCyan: "#93a1a1",
    brightWhite: "#fdf6e3",
  },
};

describe("palette CSS variables", () => {
  it("publishes modal surface and mask values with the palette", () => {
    const vars = paletteCssVars(palette) as Record<string, string>;

    expect(vars["--ol-modal-bg"]).toBe("#fdf6e3");
    expect(vars["--ol-popup-bg"]).toBe("#fdf6e3");
    expect(vars["--ol-modal-mask"]).toBe("color-mix(in srgb, #fdf6e3 70%, black 30%)");
    expect(vars["--ol-modal-mask-opacity"]).toBe("0.45");
  });
});
