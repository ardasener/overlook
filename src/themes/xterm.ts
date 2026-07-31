import type { ITheme } from "@xterm/xterm";
import type { Palette } from "./palettes";
import { withAlpha } from "./palettes";

export const TERM_FONT_STACKS = {
  "fira-code": "'Fira Code', 'SF Mono', Menlo, Consolas, monospace",
  "jetbrains-mono": "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace",
  "ibm-plex-mono": "'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace",
} as const;

export type TermFontId = keyof typeof TERM_FONT_STACKS;

/** Terminal font size bounds (px). */
export const TERM_SIZE_MIN = 8;
export const TERM_SIZE_MAX = 24;

/** Builds the xterm theme from a palette; guarantees the terminal matches the UI. */
export function xtermTheme(palette: Palette): ITheme {
  const a = palette.ansi;
  return {
    background: palette.bg,
    foreground: palette.text,
    cursor: palette.primary,
    cursorAccent: palette.primaryText,
    selectionBackground: withAlpha(palette.primary, 0.25),
    black: a.black,
    red: a.red,
    green: a.green,
    yellow: a.yellow,
    blue: a.blue,
    magenta: a.magenta,
    cyan: a.cyan,
    white: a.white,
    brightBlack: a.brightBlack,
    brightRed: a.brightRed,
    brightGreen: a.brightGreen,
    brightYellow: a.brightYellow,
    brightBlue: a.brightBlue,
    brightMagenta: a.brightMagenta,
    brightCyan: a.brightCyan,
    brightWhite: a.brightWhite,
  };
}

/** Terminal options derived from settings. Applied live via `term.options`. */
export function xtermOptions(
  palette: Palette,
  termFont: TermFontId,
  termSize: number,
) {
  return {
    fontFamily: TERM_FONT_STACKS[termFont],
    fontSize: termSize,
    theme: xtermTheme(palette),
  };
}
