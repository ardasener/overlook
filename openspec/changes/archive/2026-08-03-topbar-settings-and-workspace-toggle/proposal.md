## Why

The settings icon currently lives in the workspace sidebar header, far from the other chrome actions and hidden whenever the sidebar is closed. Terminal users want one consistent action bar: settings next to the split toggles, plus a way to show or hide the workspace panel entirely so the terminal can take the full window.

## What Changes

- The settings icon SHALL move from the workspace sidebar header to the top bar, grouped with the new-terminal and split-toggle buttons.
- A new workspace-toggle icon SHALL appear in the top bar that shows/hides the workspace panel (docked collapse — the terminal area expands to fill the freed space).
- The workspace panel SHALL start open on every launch; its open state is session-scoped and NOT persisted.
- The workspace sidebar header SHALL keep search and add-project only (the settings button is removed).

## Capabilities

### New Capabilities
- `topbar-actions`: The top bar action group (new terminal, split toggles, settings, workspace toggle) — covers where settings lives and the workspace panel toggle behavior.

### Modified Capabilities
<!-- None: the workspace tree itself (search, add/remove, fork) is unchanged. -->

## Impact

- `src/App.tsx` — `workspacesOpen` state, Sider collapse wiring, new props to `TerminalTabBar`.
- `src/components/TerminalTabBar.tsx` — add settings + workspace-toggle buttons.
- `src/components/WorkspaceSidebar.tsx` — remove settings button and `onOpenSettings` prop.
- `src/components/WorkspaceSidebar.css` / `src/App.css` — minor cleanup of the removed settings styles.
- No Rust, no IPC, no new commands (frontend-only change).
