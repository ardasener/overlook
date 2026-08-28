import { GENERATED_PALETTES } from "../generated/base16Themes";

export type PaletteKind = "light" | "dark";

export interface SyntaxColors {
  keyword: string;
  string: string;
  comment: string;
  number: string;
  function: string;
  type: string;
  operator: string;
  variable: string;
  property: string;
  punctuation: string;
  error: string;
}

/** The ANSI-16 terminal colors for a palette. */
export interface AnsiColors {
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface Palette {
  id: string;
  name: string;
  author?: string;
  kind: PaletteKind;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  accents: [string, string, string];
  syntax: SyntaxColors;
  ansi: AnsiColors;
}

export const PALETTES: Palette[] = GENERATED_PALETTES;
export const DEFAULT_PALETTE_ID = "catppuccin-mocha";

export function getPalette(id: string): Palette {
  return (
    PALETTES.find((palette) => palette.id === id) ??
    PALETTES.find((palette) => palette.id === DEFAULT_PALETTE_ID) ??
    PALETTES[0]
  );
}

/** Convert #rrggbb to an 8-digit #rrggbbaa hex string with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = value.slice(0, 2);
  const g = value.slice(2, 4);
  const b = value.slice(4, 6);
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}${a}`;
}
