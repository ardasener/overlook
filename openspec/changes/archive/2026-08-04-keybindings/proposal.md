## Why

Every UI action currently requires the mouse. Terminal users expect to drive the app entirely from the keyboard, and the shortcuts must never leak into TUI applications (vim, htop, micro). We also want the bindings to be user-configurable rather than hard-coded.

## What Changes

- A capture-phase keyboard handler (`useKeyboardShortcuts`) intercepts configured combos before xterm sees them (`preventDefault` + `stopPropagation`), so TUIs never receive them.
- Bindings cover: focus slots 0/1/2 + sidebar, tab navigation, split toggles, sidebar toggle, new terminal, runnable launcher, close tab, zoom.
- Each action has a primary and an optional alternative binding; both stored in settings (localStorage) with sane defaults.
- The settings modal becomes tabbed (Appearance / Terminal / Runnables / Keybindings); the Keybindings tab shows each action with its primary + alt, click-to-record capture mode, and a Reset to defaults button.

## Capabilities

### New Capabilities
- `keybindings`: Configurable keyboard shortcuts for all app actions, with default bindings, per-action primary + alternative bindings, capture-mode recording in settings, and reset.

### Modified Capabilities
<!-- None: actions already exist; this adds keyboard dispatch on top. -->

## Impact

- `src/settings/SettingsContext.tsx`: `keybindings` in `Settings`, default map constant, validation, persistence.
- `src/shortcuts/keybindings.ts` (new): action registry, combo parse/format/compare, `resolveMod` (`Cmd` vs `Ctrl`).
- `src/shortcuts/useKeyboardShortcuts.ts` (new): capture-phase handler dispatching to layout/settings actions.
- `src/App.tsx`: mount the hook.
- `src/components/settings/SettingsModal.tsx` + CSS: convert to AntD Tabs, add the Keybindings tab with recording rows and reset.
- `src/layout/TerminalLayoutContext.tsx`: expose any missing actions (zoom is settings-level; launcher is tab-bar-level — wiring may need small refactors).
- No Rust, no IPC, no capabilities file changes.
