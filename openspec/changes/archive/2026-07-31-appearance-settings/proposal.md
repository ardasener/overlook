## Why

Overlook's appearance is hardcoded: the AntD chrome colors live in `main.tsx`, the terminal colors/font in `TerminalView.tsx`, and the CSS uses literal hex values. A terminal-first workspace needs user control over its look. FoldQuery (a sibling Tauri+React project) already has a clean, proven settings architecture — palettes as a single source of truth, CSS variables on the document root, an AntD theme adapter, and a settings modal. This change ports that architecture to Overlook, extended with what a terminal app specifically needs: explicit ANSI color sets per palette.

## What Changes

- **Settings system** — `src/settings/SettingsContext.tsx`: `Settings` (theme, UI font, UI scale, terminal font, terminal size), `SettingsProvider`, `useSettings()`, localStorage persistence with strict validation-on-load (stale values snap to defaults).
- **Palette registry** — `src/themes/palettes.ts`: `Palette` type extended with an `ansi` block (16 ANSI colors) per palette, using each theme's published terminal color scheme. 7 palettes ported from FoldQuery: Nord, Catppuccin Latte, Catppuccin Mocha, Monokai, Dracula, Solarized Light, Solarized Dark.
- **Theme adapters**:
  - `src/themes/cssVars.ts` — palette → CSS custom properties (`--ol-*`) applied to `<html>` before first paint and on every change.
  - `src/themes/antd.ts` — palette + UI font + UI scale → AntD `ThemeConfig` (dark/light algorithm from palette kind).
  - `src/themes/xterm.ts` — **new**: palette + terminal font + size → xterm.js `ITerminalOptions` (theme incl. ANSI 16, font family, font size), applied live via `term.options` without recreating the terminal.
- **Settings modal** — `src/components/settings/SettingsModal.tsx`: AntD Modal with *Appearance* (theme-card grid, UI font, UI scale) and *Terminal* (font rendered in its own typeface, font size) sections. Entry point: gear button in the sidebar header.
- **Fonts** — `@fontsource` self-hosted: Inter/Roboto/Noto Sans (UI) + Fira Code/JetBrains Mono/IBM Plex Mono (terminal).
- **De-hardcoding** — `main.tsx`, `App.css`, `TerminalView.tsx` switch from literal colors to palette-driven values.
- **New dependency**: `@ant-design/icons` (modal/gear icons), `@fontsource/*` packages.

## Capabilities

### New Capabilities
- `appearance-settings`: Users can control the application theme (a single palette driving both UI chrome and terminal colors), UI font family, UI scale, terminal font family, and terminal font size from a settings modal; choices persist across restarts.

### Modified Capabilities
<!-- None — terminal-session's rendering behavior is preserved; the terminal pane just becomes theme-driven. -->

## Impact

- **New code**: `src/settings/`, `src/themes/{palettes,cssVars,antd,xterm}.ts`, `src/components/settings/`, `src/fonts.ts`
- **Modified code**: `src/main.tsx` (theme provider wiring), `src/App.tsx` (gear entry + modal mount), `src/App.css` + `WorkspaceSidebar.css` (variables), `src/modules/terminal/TerminalView.tsx` (theme-driven options), `package.json` (icons + fonts)
- **New dependencies**: `@ant-design/icons`, `@fontsource/inter`, `@fontsource/roboto`, `@fontsource/noto-sans`, `@fontsource/fira-code`, `@fontsource/jetbrains-mono`, `@fontsource/ibm-plex-mono`
- **None of this is breaking** — settings default to the current dark look
