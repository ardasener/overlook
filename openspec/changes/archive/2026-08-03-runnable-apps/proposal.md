## Why

The app can only spawn shells. Terminal users want one-click launch of TUI tools (AI assistants, editors, monitors) into the current worktree — without manually typing commands. A configurable "runnables" launcher makes the app a genuine workspace cockpit.

## What Changes

- A run button appears next to the new-terminal `+` in the tab bar; clicking opens a searchable popover of runnables.
- Runnables are configurable in the settings modal: add, edit, delete. Seeded defaults: AI (`opencode`), Editor (`micro`), Monitor (`btop`), Dev (all three).
- A runnable launches one or more tabs (one per command) in the active worktree. Commands are direct-exec (no shell wrapper), split on whitespace into argv.
- Runnable tabs use the existing auto-naming (foreground process) and close when their process exits.
- Spawn failures show an inline error in the tab.

## Capabilities

### New Capabilities
- `runnable-launcher`: The run button popover with searchable runnable list, launch behavior (multi-tab, direct exec, close-on-exit, auto-titles), and the settings editor for runnables.

### Modified Capabilities
<!-- None: shell tabs, split layouts, and workspaces are unchanged. -->

## Impact

- `src-tauri/src/modules/pty/mod.rs` (+ session.rs): `pty_open` gains an optional `command` to direct-exec instead of a shell.
- `src/modules/terminal/pty.ts`: pass the optional command through.
- `src/layout/TerminalLayoutContext.tsx`: `TerminalTab.command`, `launchRunnable` action.
- `src/modules/terminal/TerminalHost.tsx`: exit closes the tab; spawn-failure inline error.
- `src/components/TerminalTabBar.tsx`: run button + searchable popover.
- `src/settings/SettingsContext.tsx`: `runnables` settings + defaults + persistence.
- `src/components/settings/SettingsModal.tsx`: runnables editor section.
- No new IPC commands beyond the `pty_open` parameter; capabilities file unchanged.
