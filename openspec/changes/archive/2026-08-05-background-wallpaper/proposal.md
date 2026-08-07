## Why

The app currently paints solid theme colors everywhere. Users (inspired by Terax) want a full-window background image — with blur and opacity controls — visible through the app chrome and even the terminal panes, for a more personal, immersive look.

## What Changes

- A background image covers the whole window behind the UI: the sidebar, panel frames, and terminal interiors become translucent so the blurred image shows through.
- The Appearance tab gains a "Background image" section: an upload button opening the native file picker, blur and opacity sliders once an image is set, and a clear button.
- The image is copied into the app's config dir (so it survives source-file moves/deletes) and served via Tauri's asset protocol.

## Capabilities

### New Capabilities
- `background-wallpaper`: Full-window background image with blur and opacity, configurable in settings.

### Modified Capabilities
<!-- None: appearance settings grow, but no existing capability changes behavior. -->

## Impact

- `src-tauri/src/lib.rs`: new `appearance_set_background` command (copies the image into the config dir; `appearance_clear_background` deletes it).
- `src-tauri/tauri.conf.json`: enable `app.security.assetProtocol` with scope `["$APPCONFIG/**"]`.
- `src/settings/SettingsContext.tsx`: `background: { image, blur, opacity }` in `Settings`, defaults, persistence, validation.
- `src/App.tsx` + `src/App.css`: wallpaper layer + translucent surfaces (body, slots, sider, xterm viewport).
- `src/modules/terminal/useTerminal.ts` or xterm options: terminal background becomes translucent when a wallpaper is set.
- `src/components/settings/SettingsModal.tsx` + CSS: "Background image" section in Appearance (upload, sliders, clear).
- Capability file: no new permissions (asset protocol is config-level, not capability-level).
