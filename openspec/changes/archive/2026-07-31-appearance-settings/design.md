## Context

Overlook's appearance is hardcoded across three places: the AntD theme tokens in `main.tsx`, the terminal options (font + 16-color theme) in `TerminalView.tsx`, and literal hex colors in `App.css`. There is no settings surface.

FoldQuery, a sibling Tauri 2 + React 19 + AntD 6 project, has a complete appearance-settings architecture that maps almost 1:1 onto Overlook's needs. Its core insight: **one palette is the single source of truth** — the same colors drive the AntD chrome (via `ThemeConfig` tokens), custom CSS (via CSS variables on `<html>`), and the editor/terminal (via an adapter that consumes the palette). Settings live in a React context and persist to localStorage.

This change ports that architecture, with one terminal-specific extension: **explicit ANSI 16-color blocks per palette** (user decision — extend, not derive). Terminal color schemes are published artifacts (Nord, Dracula, Catppuccin, Solarized all ship official terminal palettes), and deriving from syntax colors would produce inauthentic ANSI values.

## Goals / Non-Goals

**Goals:**
- A settings modal with two sections: *Appearance* (theme, UI font, UI scale) and *Terminal* (font family, font size).
- One palette drives both UI chrome and terminal colors (decision: single palette, not independent UI/terminal themes).
- All 7 FoldQuery palettes and 6 fonts ported (3 UI + 3 mono); ANSI colors sourced from each theme's official terminal palette.
- Settings persist across restarts (localStorage) and apply instantly when changed.
- Terminal changes apply **live** to the existing session — no terminal recreation, no session loss.
- De-hardcode `main.tsx`, `App.css`, `TerminalView.tsx` to palette-driven values.
- Keep the current dark look as the default so the app doesn't visibly change until the user opts in.

**Non-Goals:**
- Independent UI vs terminal theme selection (single palette model, per user decision).
- Custom user-defined palettes (no palette editor).
- Per-worktree/per-session theme overrides.
- Theme syncing to the OS light/dark mode (no `prefers-color-scheme` — palette `kind` is per-theme, user-picked).
- Window chrome/titlebar theming.
- Moving settings storage to Rust (localStorage is sufficient; no filesystem access needed — respects the two-process boundary).

## Decisions

### D1: Port FoldQuery's single-palette settings architecture

`SettingsContext` owns state + persistence; every surface derives from it. Data flow:

```
SettingsContext (useState + localStorage, validated on load)
      │  update({ themeId, uiFont, uiScale, termFont, termSize })
      ▼
┌──────────────┬──────────────┬──────────────┐
│ cssVars.ts   │ antd.ts      │ xterm.ts     │
│ --ol-* vars  │ Config-      │ term.options │
│ on <html>    │ Provider     │ (live apply) │
└──────┬───────┴──────┬───────┴──────┬───────┘
       ▼              ▼              ▼
   App chrome     AntD widgets   xterm session
```

Context value: `{ settings, palette, update(patch) }`. `palette` is `getPalette(settings.themeId)` so consumers never resolve ids themselves.

### D2: Settings surface and persistence

```ts
interface Settings {
  themeId: string;      // one of PALETTES[*].id
  uiFont: UiFontId;     // "inter" | "roboto" | "noto-sans"
  uiScale: number;      // 0.5–2.0, step 0.25 (default 1)
  termFont: TermFontId; // "fira-code" | "jetbrains-mono" | "ibm-plex-mono"
  termSize: number;     // 8–24 (default 13 — matches current)
}
```

- `loadSettings()` validates every field against the option registries; invalid or missing → default. Corrupt JSON → default. This is FoldQuery's hardening, kept verbatim in spirit.
- Persist on every change (`useEffect` → `localStorage.setItem("overlook-settings", …)`).
- Apply CSS vars to `<html>` **before first paint** in `main.tsx` (from `loadSettings()`), then re-apply on change (context effect).

### D3: Palette type gains an explicit `ansi` block

```ts
interface AnsiColors {
  black: string; red: string; green: string; yellow: string;
  blue: string; magenta: string; cyan: string; white: string;
  brightBlack: string; brightRed: string; brightGreen: string; brightYellow: string;
  brightBlue: string; brightMagenta: string; brightCyan: string; brightWhite: string;
}
interface Palette {
  id: string; name: string; kind: "light" | "dark";
  bg: string; surface: string; surfaceAlt: string; border: string;
  text: string; textSecondary: string; textMuted: string;
  primary: string; primaryText: string;
  syntax: SyntaxColors;
  ansi: AnsiColors;   // NEW — official terminal palette of the theme
}
```

Sources for the ANSI blocks (published terminal palettes):
- **Nord** → nordtheme.com terminal colors
- **Catppuccin Latte/Mocha** → catppuccin/terminal-port repo
- **Monokai** → classic Monokai terminal scheme
- **Dracula** → draculatheme.com terminal palette
- **Solarized Light/Dark** → Ethan Schoonover's published ANSI values

This is the extension the user chose over deriving ANSI from syntax colors.

### D4: xterm adapter applies changes live via `term.options`

xterm.js supports runtime option updates: `term.options.fontFamily`, `term.options.fontSize`, `term.options.theme`. `themes/xterm.ts` exports `xtermOptions(palette, termFont, termSize)` returning a partial `ITerminalOptions` (theme + font). `TerminalView` keeps its current `useXTerm` setup but:

- The initial options come from settings (not a hardcoded constant).
- A `useEffect([settings])` writes the derived options onto `term.options` — theme/font/size swap live with zero terminal recreation, preserving the running PTY session and scrollback.

xterm theme mapping from palette:

| xterm key | palette source |
|---|---|
| `background` | `bg` |
| `foreground` | `text` |
| `cursor` / `cursorAccent` | `primary` / `primaryText` |
| `selectionBackground` | `withAlpha(primary, 0.25)` |
| `black…white`, `brightBlack…brightWhite` | `ansi` block directly |

The current hardcoded dark theme in `TerminalView` becomes the default palette's ANSI + base colors, so the look is preserved out of the box.

### D5: De-hardcoding the chrome

- `main.tsx`: `ConfigProvider theme={antdTheme(palette, uiFont, uiScale)}` — the existing inline token object moves into `themes/antd.ts` (token mapping from FoldQuery: `colorPrimary ← primary`, `colorBgBase ← bg`, `colorBgContainer ← surface`, `colorBgElevated ← surfaceAlt`, `colorText ← text`, `colorBorder ← border`, `fontFamily ← UI stack`, `fontSize ← 14 × uiScale`).
- `App.css` / `WorkspaceSidebar.css`: literal hex → `var(--ol-bg)`, `var(--ol-surface)`, `var(--ol-border)`, `var(--ol-text-*)`, with `calc(... × var(--ol-scale))` for scale-sensitive sizes (sidebar width, header height).
- Modal portals render inside the same `<html>` root, so the CSS vars apply there too (FoldQuery's approach — no portal-specific theming needed).

### D6: Settings modal and entry point

- `SettingsModal.tsx`: AntD `Modal` (width ~560, `footer={null}`, centered), two sections:
  - **Appearance**: theme-card grid (4 color dots: bg/surface/text/primary + check badge, active border = palette primary), UI font `Select`, UI scale `InputNumber` (0.5–2, step 0.25, addon "×").
  - **Terminal**: font `Select` where each option renders in its own typeface, font size `InputNumber` (8–24).
- Entry point: a gear button in the `WorkspaceSidebar` header (`@ant-design/icons` `SettingOutlined`), toggling the modal. App.tsx holds the `open` state.

### D7: Fonts self-hosted via @fontsource

`src/fonts.ts` imports `@fontsource/{inter,roboto,noto-sans}/{400,500,600,700}.css` and `@fontsource/{fira-code,jetbrains-mono,ibm-plex-mono}/{400,500,600}.css` — same set as FoldQuery. Imported once in `main.tsx`. No CDN, offline-capable.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| `term.options.theme` swap causes flicker or render glitch | xterm re-renders on option set; acceptable. WebGL renderer re-paints on theme change — verified pattern in xterm apps. |
| Fonts bloat bundle (6 families × weights) | @fontsource woff2, ~all variable/static subsets only what's imported. Acceptable for a desktop app; trimmable later. |
| ANSI color inaccuracy for the ported palettes | Values come from each theme's official terminal palette, not eyeballed. |
| localStorage schema drift across versions | `loadSettings()` validates every field against registries; unknown fields ignored → defaults. |
| Modal theme mismatch (portals) | CSS vars live on `<html>`; portals inherit — same mechanism FoldQuery relies on. |
| Live option swap while TUI is mid-draw | xterm handles option changes between renders; a theme change mid-TUI-redraw settles on next frame. Acceptable. |

## Open Questions

None — architecture mirrors a proven sibling implementation; the only novel piece (xterm adapter) is a direct mapping from palette → `ITerminalOptions`.
