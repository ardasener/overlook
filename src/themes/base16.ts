import type { AnsiColors, Palette } from "./palettes";

export const BASE16_DEFAULT_THEME_ID = "catppuccin-mocha";

const BASE16_KEYS = [
  "base00",
  "base01",
  "base02",
  "base03",
  "base04",
  "base05",
  "base06",
  "base07",
  "base08",
  "base09",
  "base0A",
  "base0B",
  "base0C",
  "base0D",
  "base0E",
  "base0F",
] as const;

export type Base16Key = (typeof BASE16_KEYS)[number];

export interface Base16Scheme {
  system: "base16";
  name: string;
  author: string;
  slug?: string;
  variant: "light" | "dark";
  palette: Record<Base16Key, string>;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

/** Validate untrusted YAML-decoded data before it enters the theme catalog. */
export function parseBase16Scheme(raw: unknown): Base16Scheme {
  if (!raw || typeof raw !== "object") {
    throw new Error("Base16 scheme must be an object");
  }
  const candidate = raw as Record<string, unknown>;
  if (candidate.system !== "base16") {
    throw new Error("Base16 scheme must declare system: base16");
  }
  if (typeof candidate.name !== "string" || candidate.name.trim() === "") {
    throw new Error("Base16 scheme is missing name");
  }
  if (typeof candidate.author !== "string") {
    throw new Error(`Base16 scheme ${candidate.name} is missing author`);
  }
  if (candidate.variant !== "light" && candidate.variant !== "dark") {
    throw new Error(`Base16 scheme ${candidate.name} has an invalid variant`);
  }
  if (!candidate.palette || typeof candidate.palette !== "object") {
    throw new Error(`Base16 scheme ${candidate.name} is missing palette`);
  }

  const source = candidate.palette as Record<string, unknown>;
  const palette = {} as Record<Base16Key, string>;
  for (const key of BASE16_KEYS) {
    const value = source[key];
    if (!isHexColor(value)) {
      throw new Error(`Base16 scheme ${candidate.name} has invalid ${key}`);
    }
    palette[key] = value.toLowerCase();
  }

  return {
    system: "base16",
    name: candidate.name,
    author: candidate.author,
    slug: typeof candidate.slug === "string" ? candidate.slug : undefined,
    variant: candidate.variant,
    palette,
  };
}

function ansiColors(p: Base16Scheme["palette"]): AnsiColors {
  return {
    black: p.base01,
    red: p.base08,
    green: p.base0B,
    yellow: p.base0A,
    blue: p.base0D,
    magenta: p.base0E,
    cyan: p.base0C,
    white: p.base05,
    brightBlack: p.base03,
    brightRed: p.base08,
    brightGreen: p.base0B,
    brightYellow: p.base0A,
    brightBlue: p.base0D,
    brightMagenta: p.base0E,
    brightCyan: p.base0C,
    brightWhite: p.base07,
  };
}

/** Convert a validated Base16 scheme into the app's existing palette shape. */
export function base16ToPalette(id: string, scheme: Base16Scheme): Palette {
  const p = scheme.palette;
  return {
    id,
    name: scheme.name,
    author: scheme.author,
    kind: scheme.variant,
    bg: p.base00,
    surface: p.base01,
    surfaceAlt: p.base02,
    border: p.base03,
    text: p.base05,
    textSecondary: p.base04,
    textMuted: p.base03,
    primary: p.base0D,
    primaryText: p.base00,
    accents: [p.base0B, p.base0E, p.base0C],
    syntax: {
      keyword: p.base0E,
      string: p.base0B,
      comment: p.base03,
      number: p.base09,
      function: p.base0D,
      type: p.base0C,
      operator: p.base08,
      variable: p.base05,
      property: p.base0D,
      punctuation: p.base04,
      error: p.base08,
    },
    ansi: ansiColors(p),
  };
}

/** Normalize an arbitrary scheme name into a stable catalog ID. */
export function normalizeThemeId(
  value: unknown,
  validIds: readonly string[] = [],
  fallback = BASE16_DEFAULT_THEME_ID,
): string {
  const normalized = typeof value === "string"
    ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "";
  return validIds.length === 0 || validIds.includes(normalized) ? normalized || fallback : fallback;
}
