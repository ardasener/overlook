import type { ITheme } from "@xterm/xterm";
import type { Palette } from "./palettes";
import { withAlpha } from "./palettes";

export const TERM_FONT_STACKS = {
  "fira-code": "'FiraCode Nerd Font Mono', 'SF Mono', Menlo, Consolas, monospace",
  "jetbrains-mono": "'JetBrainsMono Nerd Font Mono', 'SF Mono', Menlo, Consolas, monospace",
  "blex-mono": "'BlexMono Nerd Font Mono', 'SF Mono', Menlo, Consolas, monospace",
  "sauce-code-pro": "'SauceCodePro Nerd Font Mono', 'SF Mono', Menlo, Consolas, monospace",
  "go-mono": "'GoMono Nerd Font Mono', 'SF Mono', Menlo, Consolas, monospace",
  "ubuntu-mono": "'UbuntuMono Nerd Font Mono', 'SF Mono', Menlo, Consolas, monospace",
  "dejavu-sans-mono": "'DejaVuSansMono Nerd Font Mono', 'SF Mono', Menlo, Consolas, monospace",
  "terminess": "'Terminess Nerd Font Mono', 'SF Mono', Menlo, Consolas, monospace",
} as const;

export type TermFontId = keyof typeof TERM_FONT_STACKS;

/** Terminal font size bounds (px). */
export const TERM_SIZE_MIN = 8;
export const TERM_SIZE_MAX = 24;

/** Builds the xterm theme from a palette; guarantees the terminal matches the UI. */
export function xtermTheme(
  palette: Palette,
  translucent = false,
  remapBackground = false,
): ITheme {
  const a = palette.ansi;
  // When remapping, the default background AND ANSI black become fully
  // transparent (8-digit hex alpha) so TUIs that paint the default background
  // let the wallpaper show through; explicit colored backgrounds still render.
  const transparent = withAlpha(palette.bg, 0);
  return {
    background: translucent && remapBackground ? transparent : translucent ? withAlpha(palette.bg, 0) : palette.bg,
    foreground: palette.text,
    cursor: palette.primary,
    cursorAccent: palette.primaryText,
    selectionBackground: withAlpha(palette.primary, 0.25),
    black: translucent && remapBackground ? transparent : a.black,
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
  translucent = false,
  remapBackground = false,
) {
  return {
    fontFamily: TERM_FONT_STACKS[termFont],
    fontSize: termSize,
    theme: xtermTheme(palette, translucent, remapBackground),
  };
}
