import { describe, expect, it } from "vitest";
import {
  BASE16_DEFAULT_THEME_ID,
  base16ToPalette,
  normalizeThemeId,
  parseBase16Scheme,
  type Base16Scheme,
} from "./base16";

const scheme: Base16Scheme = {
  system: "base16",
  name: "Example Theme",
  author: "Example Author",
  variant: "dark",
  palette: {
    base00: "#000000",
    base01: "#111111",
    base02: "#222222",
    base03: "#333333",
    base04: "#444444",
    base05: "#555555",
    base06: "#666666",
    base07: "#777777",
    base08: "#880000",
    base09: "#998800",
    base0A: "#aaaa00",
    base0B: "#00bb00",
    base0C: "#00cccc",
    base0D: "#0000dd",
    base0E: "#ee00ee",
    base0F: "#ff00ff",
  },
};

describe("Base16 theme conversion", () => {
  it("maps Base16 values to the application palette", () => {
    const palette = base16ToPalette("example-theme", scheme);

    expect(palette).toMatchObject({
      id: "example-theme",
      name: "Example Theme",
      kind: "dark",
      bg: "#000000",
      surface: "#111111",
      surfaceAlt: "#222222",
      border: "#333333",
      textSecondary: "#444444",
      text: "#555555",
      primary: "#0000dd",
      ansi: {
        black: "#111111",
        red: "#880000",
        yellow: "#aaaa00",
        green: "#00bb00",
        blue: "#0000dd",
        magenta: "#ee00ee",
        cyan: "#00cccc",
        white: "#555555",
        brightBlack: "#333333",
        brightWhite: "#777777",
      },
    });
  });

  it("normalizes names into stable theme IDs", () => {
    expect(normalizeThemeId("Catppuccin Mocha", ["catppuccin-mocha"])).toBe(
      "catppuccin-mocha",
    );
    expect(normalizeThemeId("A/B: Theme! 2", ["a-b-theme-2"])).toBe(
      "a-b-theme-2",
    );
  });

  it("rejects incomplete or invalid schemes", () => {
    expect(() =>
      parseBase16Scheme({ system: "base16", name: "Missing palette", author: "test", variant: "dark" }),
    ).toThrow(/palette/i);
    expect(() =>
      parseBase16Scheme({
        ...scheme,
        palette: { ...scheme.palette, base0D: "not-a-color" },
      }),
    ).toThrow(/base0D/i);
  });

  it("falls back to Catppuccin Mocha for unknown IDs", () => {
    expect(normalizeThemeId("unknown", [BASE16_DEFAULT_THEME_ID])).toBe(
      BASE16_DEFAULT_THEME_ID,
    );
  });
});
