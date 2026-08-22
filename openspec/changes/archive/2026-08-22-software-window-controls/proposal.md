## Why

On Linux and Windows, `titleBarStyle: "Overlay"` is ignored (it is macOS/iOS-only), so the app ships with the OS's native title bar stacked above our tab bar — extra chrome that cannot be styled, clashes with the app's dark AntD theme, and wastes vertical space in a terminal-first app. Terax and Vivaldi solve this by disabling OS decorations and rendering their own window controls; we should do the same, with a Vivaldi-style left/right position option. macOS already behaves as desired (native traffic lights over the tab bar) and stays untouched.

## What Changes

- **Disable OS window decorations on Linux and Windows** via platform config files (`tauri.linux.conf.json`, `tauri.windows.conf.json` → `decorations: false`). Base `tauri.conf.json` (macOS `Overlay` + `hiddenTitle`) unchanged.
- **Add a `<WindowControls>` component** rendered into the tab bar on non-macOS: minimize / maximize-restore / close using Ant Design icons (`MinusOutlined`, `BorderOutlined`, `SwitcherOutlined` when maximized, `CloseOutlined`), wired to the Tauri window API.
- **Add a "window control position" appearance setting** (`left` | `right`, default `right`), fully functional on both Linux and Windows; hidden on macOS.
- **Generalize tab-bar layout rules**: controls render at the far-left or far-right edge per the setting; the reserved-gutter padding replaces today's macOS-only `paddingLeft: 80` for the left-controls case.
- **Extend `src-tauri/capabilities/default.json`** with the window permissions needed by the built-in commands: `core:window:allow-minimize`, `-toggle-maximize`, `-close`, `-start-dragging`.
- **Preserve drag behavior**: existing tab-bar drag regions keep dragging the undecorated window; double-click on empty bar space toggles maximize.

## Capabilities

### New Capabilities
- `window-chrome`: The app-drawn window frame on Linux and Windows — disabled OS decorations, software-rendered min/maximize/close controls and their AntD-icon styling, the left/right position setting's effect on layout, drag/double-click-maximize behavior, and the maximized-state glyph swap.

### Modified Capabilities
- `appearance-settings`: New requirement — a persisted "window control position" choice (left | right, default right), shown only where software controls exist (non-macOS) and applied immediately.

## Impact

- `src-tauri/tauri.linux.conf.json`, `src-tauri/tauri.windows.conf.json` — new files.
- `src-tauri/capabilities/default.json` — four added `core:window` permission allows.
- `src/components/WindowControls.tsx` (+ CSS) — new component.
- `src/components/TerminalTabBar.tsx` / `.css` — render controls; generalize gutter padding.
- `src/settings/SettingsContext.tsx` + settings modal — new persisted setting.
- No changes to the Rust PTY/workspace modules or the IPC boundary; window actions use Tauri's built-in `core:window` commands.
