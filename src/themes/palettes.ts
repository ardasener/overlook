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

/** The ANSI-16 terminal colors for a palette, from the theme's official
 *  terminal color scheme (not derived from syntax colors). */
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
  kind: PaletteKind;
  /** App background (also the terminal background). */
  bg: string;
  /** Container/surface color (panes, inputs, cards). */
  surface: string;
  /** Elevated surface (modals, popovers, pane headers). */
  surfaceAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  /** Text color rendered on top of `primary`. */
  primaryText: string;
  /** Three distinct hues used to color-code panels and their tabs. */
  accents: [string, string, string];
  syntax: SyntaxColors;
  ansi: AnsiColors;
}

/**
 * Palette definitions. Hex values are taken from the official specs:
 * Nord (nordtheme.com), Catppuccin (palette repo), Dracula (draculatheme.com),
 * Solarized (Ethan Schoonover's spec), Monokai (classic values). ANSI blocks
 * use each theme's published terminal color scheme.
 */
export const PALETTES: Palette[] = [
  {
    id: "nord",
    name: "Nord",
    kind: "dark",
    bg: "#2e3440",
    surface: "#3b4252",
    surfaceAlt: "#434c5e",
    border: "#434c5e",
    text: "#eceff4",
    textSecondary: "#d8dee9",
    textMuted: "#4c566a",
    primary: "#88c0d0",
    primaryText: "#2e3440",
    accents: ['#a3be8c', '#b48ead', '#88c0d0'],
    syntax: {
      keyword: "#81a1c1",
      string: "#a3be8c",
      comment: "#4c566a",
      number: "#b48ead",
      function: "#88c0d0",
      type: "#8fbcbb",
      operator: "#81a1c1",
      variable: "#d8dee9",
      property: "#8fbcbb",
      punctuation: "#eceff4",
      error: "#bf616a",
    },
    ansi: {
      black: "#3b4252",
      red: "#bf616a",
      green: "#a3be8c",
      yellow: "#ebcb8b",
      blue: "#81a1c1",
      magenta: "#b48ead",
      cyan: "#88c0d0",
      white: "#e5e9f0",
      brightBlack: "#4c566a",
      brightRed: "#bf616a",
      brightGreen: "#a3be8c",
      brightYellow: "#ebcb8b",
      brightBlue: "#81a1c1",
      brightMagenta: "#b48ead",
      brightCyan: "#8fbcbb",
      brightWhite: "#eceff4",
    },
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    kind: "light",
    bg: "#eff1f5",
    surface: "#e6e9ef",
    surfaceAlt: "#dce0e8",
    border: "#ccd0da",
    text: "#4c4f69",
    textSecondary: "#5c5f77",
    textMuted: "#6c6f85",
    primary: "#1e66f5",
    primaryText: "#ffffff",
    accents: ['#40a02b', '#ea76cb', '#179299'],
    syntax: {
      keyword: "#8839ef",
      string: "#40a02b",
      comment: "#9ca0b0",
      number: "#fe640b",
      function: "#1e66f5",
      type: "#df8e1d",
      operator: "#179299",
      variable: "#4c4f69",
      property: "#1e66f5",
      punctuation: "#4c4f69",
      error: "#d20f39",
    },
    ansi: {
      black: "#5c5f77",
      red: "#d20f39",
      green: "#40a02b",
      yellow: "#df8e1d",
      blue: "#1e66f5",
      magenta: "#ea76cb",
      cyan: "#179299",
      white: "#acb0be",
      brightBlack: "#6c6f85",
      brightRed: "#d20f39",
      brightGreen: "#40a02b",
      brightYellow: "#df8e1d",
      brightBlue: "#1e66f5",
      brightMagenta: "#ea76cb",
      brightCyan: "#179299",
      brightWhite: "#bcc0cc",
    },
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    kind: "dark",
    bg: "#1e1e2e",
    surface: "#181825",
    surfaceAlt: "#11111b",
    border: "#313244",
    text: "#cdd6f4",
    textSecondary: "#bac2de",
    textMuted: "#6c7086",
    primary: "#89b4fa",
    primaryText: "#1e1e2e",
    accents: ['#a6e3a1', '#f5c2e7', '#94e2d5'],
    syntax: {
      keyword: "#cba6f7",
      string: "#a6e3a1",
      comment: "#6c7086",
      number: "#fab387",
      function: "#89b4fa",
      type: "#f9e2af",
      operator: "#94e2d5",
      variable: "#cdd6f4",
      property: "#89b4fa",
      punctuation: "#cdd6f4",
      error: "#f38ba8",
    },
    ansi: {
      black: "#45475a",
      red: "#f38ba8",
      green: "#a6e3a1",
      yellow: "#f9e2af",
      blue: "#89b4fa",
      magenta: "#f5c2e7",
      cyan: "#94e2d5",
      white: "#bac2de",
      brightBlack: "#585b70",
      brightRed: "#f38ba8",
      brightGreen: "#a6e3a1",
      brightYellow: "#f9e2af",
      brightBlue: "#89b4fa",
      brightMagenta: "#f5c2e7",
      brightCyan: "#94e2d5",
      brightWhite: "#a6adc8",
    },
  },
  {
    id: "monokai",
    name: "Monokai",
    kind: "dark",
    bg: "#272822",
    surface: "#3e3d32",
    surfaceAlt: "#49483e",
    border: "#49483e",
    text: "#f8f8f2",
    textSecondary: "#cfcfc2",
    textMuted: "#75715e",
    primary: "#a6e22e",
    primaryText: "#272822",
    accents: ['#a6e22e', '#ae81ff', '#66d9ef'],
    syntax: {
      keyword: "#f92672",
      string: "#e6db74",
      comment: "#75715e",
      number: "#ae81ff",
      function: "#a6e22e",
      type: "#66d9ef",
      operator: "#f92672",
      variable: "#f8f8f2",
      property: "#66d9ef",
      punctuation: "#f8f8f2",
      error: "#f92672",
    },
    ansi: {
      black: "#272822",
      red: "#f92672",
      green: "#a6e22e",
      yellow: "#f4bf75",
      blue: "#66d9ef",
      magenta: "#ae81ff",
      cyan: "#a1efe4",
      white: "#f8f8f2",
      brightBlack: "#75715e",
      brightRed: "#f92672",
      brightGreen: "#a6e22e",
      brightYellow: "#f4bf75",
      brightBlue: "#66d9ef",
      brightMagenta: "#ae81ff",
      brightCyan: "#a1efe4",
      brightWhite: "#f9f8f5",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    kind: "dark",
    bg: "#282a36",
    surface: "#343746",
    surfaceAlt: "#3f4251",
    border: "#44475a",
    text: "#f8f8f2",
    textSecondary: "#c3c9d4",
    textMuted: "#6272a4",
    primary: "#bd93f9",
    primaryText: "#282a36",
    accents: ['#50fa7b', '#ff79c6', '#8be9fd'],
    syntax: {
      keyword: "#ff79c6",
      string: "#f1fa8c",
      comment: "#6272a4",
      number: "#bd93f9",
      function: "#50fa7b",
      type: "#8be9fd",
      operator: "#ff79c6",
      variable: "#f8f8f2",
      property: "#50fa7b",
      punctuation: "#f8f8f2",
      error: "#ff5555",
    },
    ansi: {
      black: "#21222c",
      red: "#ff5555",
      green: "#50fa7b",
      yellow: "#f1fa8c",
      blue: "#bd93f9",
      magenta: "#ff79c6",
      cyan: "#8be9fd",
      white: "#f8f8f2",
      brightBlack: "#6272a4",
      brightRed: "#ff6e6e",
      brightGreen: "#69ff94",
      brightYellow: "#ffffa5",
      brightBlue: "#d6acff",
      brightMagenta: "#ff92df",
      brightCyan: "#a4ffff",
      brightWhite: "#ffffff",
    },
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    kind: "light",
    bg: "#fdf6e3",
    surface: "#eee8d5",
    surfaceAlt: "#fdf6e3",
    border: "#d8d0bd",
    text: "#657b83",
    textSecondary: "#839496",
    textMuted: "#93a1a1",
    primary: "#268bd2",
    primaryText: "#fdf6e3",
    accents: ['#859900', '#d33682', '#2aa198'],
    syntax: {
      keyword: "#859900",
      string: "#2aa198",
      comment: "#93a1a1",
      number: "#d33682",
      function: "#268bd2",
      type: "#b58900",
      operator: "#859900",
      variable: "#657b83",
      property: "#268bd2",
      punctuation: "#657b83",
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
      brightBlack: "#002b36",
      brightRed: "#cb4b16",
      brightGreen: "#586e75",
      brightYellow: "#657b83",
      brightBlue: "#839496",
      brightMagenta: "#6c71c4",
      brightCyan: "#93a1a1",
      brightWhite: "#fdf6e3",
    },
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    kind: "dark",
    bg: "#002b36",
    surface: "#073642",
    surfaceAlt: "#103f4c",
    border: "#586e75",
    text: "#93a1a1",
    textSecondary: "#839496",
    textMuted: "#586e75",
    primary: "#268bd2",
    primaryText: "#002b36",
    accents: ['#859900', '#d33682', '#2aa198'],
    syntax: {
      keyword: "#859900",
      string: "#2aa198",
      comment: "#586e75",
      number: "#d33682",
      function: "#268bd2",
      type: "#b58900",
      operator: "#859900",
      variable: "#839496",
      property: "#268bd2",
      punctuation: "#93a1a1",
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
      brightBlack: "#002b36",
      brightRed: "#cb4b16",
      brightGreen: "#586e75",
      brightYellow: "#657b83",
      brightBlue: "#839496",
      brightMagenta: "#6c71c4",
      brightCyan: "#93a1a1",
      brightWhite: "#fdf6e3",
    },
  },
];

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** Convert #rrggbb to an rgba() string with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
