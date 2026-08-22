## 1. Config and capabilities

- [x] 1.1 Add `src-tauri/tauri.linux.conf.json` with `"app": { "windows": [{ "decorations": false }] }`; verify the merge resolves in `bun run tauri:dev` (no native title bar on Linux)
- [ ] 1.2 Add `src-tauri/tauri.windows.conf.json` with the same `decorations: false` override; verify via a Windows build or config merge inspection
- [x] 1.3 Confirm base `tauri.conf.json` (macOS `Overlay` + `hiddenTitle`) is unchanged
- [x] 1.4 Add `core:window:allow-minimize`, `core:window:allow-toggle-maximize`, `core:window:allow-close`, `core:window:allow-start-dragging` to `src-tauri/capabilities/default.json`; verify no capability schema errors on app start

## 2. WindowControls component

- [x] 2.1 Create `src/components/WindowControls.tsx`: minimize / maximize / close buttons wired to `getCurrentWindow().minimize() / toggleMaximize() / close()`, using AntD icons (`MinusOutlined`, `BorderOutlined`, `CloseOutlined`); render nothing on macOS — verify by clicking each control in the dev app
- [x] 2.2 Track maximized state via `onResized()` + `isMaximized()` and swap to the restore glyph (`SwitcherOutlined`) while maximized — verify maximize/restore flips the icon
- [x] 2.3 Style controls as AntD `type="text" size="small"` icon buttons identical to the tab bar's other actions (reusing `.tabbar-actions` for layout; no bespoke CSS) — verify visually against the tab bar
- [x] 2.4 Verify pressing a control button and dragging never moves the window (buttons excluded from drag regions)

## 3. Tab bar integration

- [x] 3.1 Render `<WindowControls>` in `TerminalTabBar.tsx` per the position setting: far-left edge, or after `tabbar-actions` at the right edge — verify both positions
- [x] 3.2 Generalize the reserved-gutter padding (leading gutter when controls are left-positioned; macOS keeps `paddingLeft: 80`) — verify no tab content renders under left-positioned controls
- [x] 3.3 Verify empty tab-bar space still drags the window and double-click still toggles maximize with decorations off

## 4. Settings

- [x] 4.1 Add persisted `windowControlsPosition: "left" | "right"` (default `"right"`) to `SettingsContext` following existing persistence/corrupt-input-fallback conventions; verify restart persistence and bad-value fallback
- [x] 4.2 Add the position choice to the appearance settings section, rendered only when software controls exist (hidden on macOS) — verify visibility per platform
- [x] 4.3 Verify changing the setting moves the controls immediately

## 5. Verification and docs

- [x] 5.1 Run `bun lint`, `bun check-types`, `bun run test`; run `cargo clippy --all-targets -- -D warnings` and `cargo test` in `src-tauri/` — all green
- [x] 5.2 Manual check on Linux: no OS title bar; min/maximize/restore/close work; drag + double-click maximize work; window resize via edges works
- [ ] 5.3 Manual check on Windows: same as 5.2 (undecorated resize edges, snap shortcuts unaffected)
- [ ] 5.4 Manual check on macOS: zero visual/behavioral change vs. current build (traffic lights, drag regions)
- [ ] 5.5 Update `README.md`/`DESIGN.md` if they describe window chrome behavior
