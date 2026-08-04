## Context

The app currently spawns only shells via `pty_open` (Rust `spawn_session` → `resolve_shell()`). Tabs are per-worktree layout entries in `TerminalLayoutContext`; `TerminalHost` binds one PTY session per tab; auto-naming polls `pty_foreground_process`. Settings are frontend-only, persisted to localStorage. Adding runnables is a cross-stack change: a small Rust extension for direct-exec, plus frontend tab/settings/UI work.

## Goals / Non-Goals

**Goals:**
- Launch configured runnables (one tab per command) into the active worktree via a tab-bar popover.
- Direct-exec commands (no shell wrapper), whitespace-split argv.
- Runnable config in settings (add/edit/delete), seeded defaults, localStorage persistence.
- Runnable tabs auto-named and closed on process exit.

**Non-Goals:**
- Shell-syntax commands (quotes, pipes, env) — plain whitespace split only.
- Auto-splitting multi-command launches (parked tabs for now).
- Keyboard shortcuts, per-runnable icons, per-runnable cwd overrides.
- Persisting runnable-tab layout across restarts (layouts are already session-scoped).

## Decisions

### `pty_open` gains an optional `command`
Rust `pty_open(manager, on_event, cwd, command: Option<Vec<String>>)`. When `Some`, `spawn_session` runs that argv directly (via `CommandBuilder` with `cmd` + `args`) instead of the shell. `cwd` still applies. Frontend splits the command string on whitespace (`String.split(" ").filter(non-empty)`).
- **Why**: direct exec without a shell, staying inside the existing command/IPC boundary (no new commands, no capability changes).
- **Alternative**: reuse the shell with `sh -c` — rejected (shell wrapper muddies exit propagation and contradicts the direct-exec decision).

### `TerminalTab.command: string | null`
Tabs carry an optional single command string (the runnable's per-entry command, not the whole list — each tab spawns one command). `null` = normal shell tab. `newTab()` and split-created tabs stay `null`; `launchRunnable` sets it.
- **Why**: one command per tab maps 1:1 to the existing per-tab session model; the runnable list is expanded into tabs at launch time.

### `launchRunnable(commands: string[])` in `TerminalLayoutContext`
Adds one tab per command to the active worktree's layout: the first in the focused slot (parking its occupant), the rest parked. All tabs share the active worktree. Titles are set deterministically at creation to the executable basename of the command (`argv[0]` after the last path separator).
- **Why**: reuses `newTab`'s mechanics; matches the "parked tabs" decision. The foreground-process auto-title cannot name direct-exec tabs — it walks the process tree *below* the session's `shell_pid`, but for a direct-exec command the command itself IS the shell pid, so the walk finds no descendants and falls back to the shell name. A deterministic exe-name title avoids relying on that poller entirely.

### Close tab on session exit
`TerminalHost`'s event handler already receives `TerminalEvent::Exit`. For command tabs, on exit call `closeTab(tabId)` (and clear `sessionIdRef`). Shell tabs keep today's behavior (session ends only on manual close). The exit event currently only deregisters in Rust; the frontend ignores it — this wires it up for command tabs only.
- **Why**: matches the "close on exit" decision; shell tabs unaffected.

### Spawn failure → inline error
`pty_open` already returns `Result`; on `Err` the host sets its existing `error` state (inline `terminal-error` div). No change needed beyond making sure the error surfaces for command spawns (e.g. ENOENT).

### Settings shape
`Settings.runnables: Runnable[]` with `Runnable = { id: string; name: string; commands: string[] }`. `loadSettings` seeds defaults when the key is absent or `runnables` is missing; every entry is user-editable (no built-in protection). Persisted with the existing settings JSON.
- **Why**: one flat list, no merge layer; localStorage is the existing settings store.

### Launcher popover (custom, not Select)
A `Popover` in `TerminalTabBar` containing an `Input` (search, case-insensitive name filter) and a list of rows (name + commands subtitle). First match highlighted; Enter launches it; click launches. Controlled open state so launching closes it.
- **Why**: matches the add-project/fork popover pattern; full control over row content and keyboard behavior.

### Settings editor (inline in modal)
A "Runnables" section in `SettingsModal`: rows with edit/delete; "Add runnable" shows an inline form (name input + dynamic command inputs with add/remove). Edits apply via the existing `update()` patch.
- **Why**: keeps everything in the existing modal; no second modal.

## Risks / Trade-offs

- [Whitespace split breaks quoted commands] → accepted for v1; documented in the spec (non-goal); a tokenizer can come later.
- [Direct exec loses shell startup files] → intended (no shell env setup); runnables are apps, not commands that need the shell.
- [Exit closes the tab even if the user wanted to inspect output] → matches decision A; scrollback dies with the tab, acceptable for TUI tools.
- [ENOENT surfaces as inline error but the tab persists until manually closed] → the error message names the executable so the user knows what failed; close is one click.
- [Runnables are global, not per-worktree] → intended; they always run in the active worktree at launch time.

## Migration Plan

Frontend + one Rust signature change in the same cycle; no schema migration (settings defaults seed missing `runnables`). Rollback: revert the `pty_open` param and the frontend files.
