## Context

The app paints `--ol-bg` (theme background) opaquely on `body/#root`, each `.slot` panel, the `.app-sider`, and the xterm viewport (via `xtermOptions` `theme.background`). Settings are frontend-only in localStorage with an `update()` patch. The dialog plugin is installed and used for the project picker. Tauri 2 serves local files to the webview via the asset protocol (`convertFileSrc`), gated by `app.security.assetProtocol` scope in `tauri.conf.json`.

## Goals / Non-Goals

**Goals:**
- Full-window background image visible through chrome and terminal panes.
- Blur + opacity controls with live preview, persisted in settings.
- Robust to source-file moves (copy into the app config dir).

**Non-Goals:**
- Position/scale/alignment controls (cover only).
- Per-panel translucency tuning.
- Multiple wallpapers or per-worktree wallpapers.
- OS-level wallpaper integration.

## Decisions

### Copy the image into the config dir
A new Rust command `appearance_set_background(path)` copies the picked file to `config_dir()/overlook/background.<ext>` (overwriting the previous one) and returns the stored filename. `appearance_clear_background()` deletes it. Settings store only the filename.
- **Why**: the wallpaper survives source moves/deletes; the asset scope stays narrow (`$APPCONFIG/**`) instead of granting the whole home dir; follows the Rust-owns-filesystem boundary.
- **Alternative**: reference the original absolute path + persisted-scope plugin — rejected (fragile when files move, wider scope).

### Asset protocol scope
`tauri.conf.json`: `app.security.assetProtocol = { enable: true, scope: ["$APPCONFIG/**"] }`. Frontend builds the URL with `convertFileSrc(configDir + "/overlook/" + filename)`.
- **Why**: minimal, static scope; `$APPCONFIG` is the config dir base variable.
- **Note**: asset scope is config-level, not a capability permission — no `capabilities/default.json` change.

### Wallpaper layer
A `<div className="app-wallpaper">` rendered in AppShell, `position: fixed; inset: 0; z-index: 0`, behind `.app-layout` (which gets `position: relative; z-index: 1`). The div uses `background-image: url(...)`, `background-size: cover`, `background-position: center`, `filter: blur(Npx)`, `opacity: X`. Rendered only when `background.image` is set.
- **Why**: one fixed layer; blur/opacity apply to the whole image uniformly.

### Translucent surfaces
- `html/body/#root`: `background: transparent` when a wallpaper is set (keep the theme bg otherwise via a `body.has-wallpaper` class).
- `.slot`: `background: color-mix(in srgb, var(--ol-bg) 55%, transparent)` under `.has-wallpaper`.
- `.app-sider`: same treatment via `antdTheme` siderBg is solid — override with a `.has-wallpaper` CSS rule instead.
- Terminal: the xterm `theme.background` becomes `color-mix(in srgb, var(--ol-bg) 55%, transparent)` when a wallpaper is set, so the image shows through the viewport behind text.
- **Why**: one `body.has-wallpaper` class toggles all translucency; the 55% constant balances legibility with visibility (blur/opacity sliders are the user's fine-tune).

### Settings model
`Settings.background: { image: string | null; blur: number; opacity: number }`, defaults `{ image: null, blur: 20, opacity: 0.5 }`. `loadSettings` validates shape; `update()` persists. Sliders clamp blur 0–60, opacity 0.05–1.

### Settings UI
A "Background image" subsection in the Appearance pane: upload `Button` (icon + label) → `open({ multiple: false, filters: [{ name: "Images", extensions: ["png","jpg","jpeg","webp","gif","heic"] }] })`; on a picked path call `appearance_set_background` and store the returned filename. When `image` is set, show two `Slider`s (Blur 0–60, Opacity 5–100) wired to `update()` (live), plus a "Clear background" button calling `appearance_clear_background` and nulling `image`. Errors surface via `message.error`.

## Risks / Trade-offs

- [Blur/opacity values differ per image] → defaults are conservative (20px, 50%); sliders are live so the user tunes per image.
- [Translucent terminals reduce text contrast] → 55% theme-bg mix keeps most contrast; wallpaper blur+opacity are the user's dials; terminal text is always full-brightness.
- [HEIC images may not render in WKWebView] → acceptable; PNG/JPG/WebP/GIF are the reliable subset; HEIC in the filter list degrades to a blank layer if unsupported.
- [Copying a large image on every change] → one-time per pick; overwrite-in-place avoids accumulation.
- [`.has-wallpaper` CSS cascade risk] → the class is toggled from settings state in AppShell; rules are scoped under it.

## Migration Plan

Frontend + one Rust command + config change in one cycle. Existing installs: `background` missing → defaults (no wallpaper). Rollback: revert the config scope, the command, and the CSS/UI.
