import { describe, expect, it } from "vitest";
import {
  BUNDLED_FONT_OPTIONS,
  normalizeFontOptions,
  repairFontSelections,
} from "./fonts";

describe("system font options", () => {
  it("deduplicates families and aggregates monospaced faces", () => {
    expect(
      normalizeFontOptions([
        { name: "Inter", monospaced: false },
        { name: "Fira Code", monospaced: true },
        { name: "Fira Code", monospaced: false },
      ]),
    ).toEqual([
      { name: "Fira Code", monospaced: true },
      { name: "Inter", monospaced: false },
    ]);
  });

  it("repairs unavailable selections to bundled defaults", () => {
    expect(
      repairFontSelections("Missing UI", "Missing Terminal", BUNDLED_FONT_OPTIONS),
    ).toEqual({ uiFont: "Inter", termFont: "FiraCode Nerd Font Mono" });
  });

  it("does not use a non-monospaced family for the terminal", () => {
    expect(
      repairFontSelections("Inter", "Inter", [
        { name: "Inter", monospaced: false },
        { name: "Fira Code Nerd Font Mono", monospaced: true },
      ]),
    ).toEqual({ uiFont: "Inter", termFont: "FiraCode Nerd Font Mono" });
  });
});
