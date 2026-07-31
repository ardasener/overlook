## 1. Theme infrastructure

- [x] 1.1 Add `@ant-design/icons` and `@fontsource/{inter,roboto,noto-sans,fira-code,jetbrains-mono,ibm-plex-mono}` dependencies; create `src/fonts.ts` importing the font CSS; import it in `main.tsx`
- [x] 1.2 Create `src/themes/palettes.ts`: `Palette` type (FoldQuery fields + `ansi: AnsiColors` block), `PALETTES` with 7 palettes (Nord, Catppuccin Latte, Catppuccin Mocha, Monokai, Dracula, Solarized Light, Solarized Dark) including each theme's official ANSI terminal colors, `getPalette()`, `withAlpha()`
- [x] 1.3 Create `src/themes/cssVars.ts`: `paletteCssVars(palette, uiScale)` → `--ol-*` custom properties, `applyPaletteVars(el, palette, uiScale)` using `setProperty`
- [x] 1.4 Create `src/themes/antd.ts`: `UI_FONT_STACKS` (inter/roboto/noto-sans), `UI_SCALE_*` constants, `antdTheme(palette, uiFont, uiScale)` → `ThemeConfig` (dark/light algorithm from `palette.kind`, tokens mapped from palette)
- [x] 1.5 Create `src/themes/xterm.ts`: `TERM_FONT_STACKS` (fira-code/jetbrains-mono/ibm-plex-mono), `xtermOptions(palette, termFont, termSize)` → partial `ITerminalOptions` mapping bg/text/primary/ansi into xterm theme keys

## 2. Settings state

- [x] 2.1 Create `src/settings/SettingsContext.tsx`: `Settings` interface (themeId, uiFont, uiScale, termFont, termSize), `DEFAULTS` (dark theme, uiScale 1, termSize 13), `UI_FONT_OPTIONS`/`TERM_FONT_OPTIONS`, `loadSettings()` with field-by-field validation, `SettingsProvider` (apply CSS vars on change + persist to localStorage), `useSettings()`
- [x] 2.2 Rewrite `src/main.tsx`: `SettingsProvider` wraps a `ThemedApp` that renders `ConfigProvider theme={antdTheme(palette, uiFont, uiScale)}`; apply palette vars to `<html>` before first paint from `loadSettings()`

## 3. Settings modal

- [x] 3.1 Create `src/components/settings/SettingsModal.tsx` (plus CSS): AntD Modal with Appearance section (theme-card grid with color dots + check, UI font Select, UI scale InputNumber) and Terminal section (font Select rendering each option in its own typeface, size InputNumber 8–24)
- [x] 3.2 Add gear button (`SettingOutlined`) to `WorkspaceSidebar` header; wire modal open/close state in `App.tsx`

## 4. De-hardcode the app

- [x] 4.1 Convert `App.css` and `WorkspaceSidebar.css` from literal hex to `var(--ol-*)` custom properties, using `calc(... * var(--ol-scale))` for scale-sensitive dimensions
- [x] 4.2 Update `TerminalView.tsx`: initial xterm options from `xtermOptions(palette, termFont, termSize)`, and a `useEffect` on settings that applies theme/font/size live via `term.options` (no terminal recreation)
- [x] 4.3 Verify `pnpm check-types` and `pnpm lint` pass

## 5. Verification

- [x] 5.1 Run `pnpm tauri dev`: confirm first launch renders the current dark look (defaults)
- [x] 5.2 Verify theme switching restyles both UI chrome and terminal immediately (try a light palette too)
- [x] 5.3 Verify terminal font/size changes apply live to a running shell (change font, confirm no session loss; change size, confirm `stty size` reflects new cols/rows)
- [x] 5.4 Verify UI scale and UI font changes apply to AntD chrome
- [x] 5.5 Verify settings persist across an app restart; verify corrupt localStorage (hand-edit) falls back to defaults
