## 1. Rust: wallpaper commands

- [x] 1.1 Add `appearance_set_background(path: String) -> Result<String, String>`: copy the file to `config_dir()/overlook/background.<ext>` (create the dir), return the stored filename; validate the source exists and is a file
- [x] 1.2 Add `appearance_clear_background() -> Result<(), String>`: delete the stored file (ignore missing)
- [x] 1.3 Register both in the `generate_handler!` list in `lib.rs`; `cargo test` and `cargo clippy --all-targets -- -D warnings` pass

## 2. Asset protocol

- [x] 2.1 In `tauri.conf.json`, enable `app.security.assetProtocol` with `{ enable: true, scope: ["$APPCONFIG/**"] }`
- [x] 2.2 Verify `cargo check` picks up the config (no code change needed)

## 3. Settings model

- [x] 3.1 Add `background: { image: string | null; blur: number; opacity: number }` to `Settings`; defaults `{ image: null, blur: 20, opacity: 0.5 }`
- [x] 3.2 Validate/normalize on load (clamp blur 0–60, opacity 0.05–1, image string or null)

## 4. Wallpaper layer + translucency

- [x] 4.1 Render `.app-wallpaper` in `AppShell` when `background.image` is set: fixed full-window, `convertFileSrc(configDir/overlook/<image>)`, cover, blur, opacity; give `.app-layout` a higher z-index
- [x] 4.2 Toggle a `body.has-wallpaper` class; under it: `body/#root` transparent, `.slot` and `.app-sider` → `color-mix(in srgb, var(--ol-bg) 55%, transparent)`
- [x] 4.3 Make the xterm background translucent under `.has-wallpaper` (theme `background` becomes the color-mix value)

## 5. Settings UI

- [x] 5.1 Add a "Background image" subsection to the Appearance pane: upload button → native image picker → `appearance_set_background` → store filename
- [x] 5.2 When an image is set, show Blur (0–60) and Opacity (5–100) sliders wired live to `update()`, plus a "Clear background" button
- [x] 5.3 Style the section in `SettingsModal.css`; surface errors via `message.error`

## 6. Verification

- [x] 6.1 `bun check-types` and `bun lint` pass; `cargo test` and `cargo clippy --all-targets -- -D warnings` pass
- [x] 6.2 Manual: pick an image → wallpaper covers the window through chrome and terminals; sliders update live; clear removes it; moving/deleting the source file doesn't break it; settings persist across restart; no wallpaper on first run
