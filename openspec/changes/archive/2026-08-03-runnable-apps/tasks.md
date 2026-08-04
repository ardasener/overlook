## 1. Rust direct-exec support

- [x] 1.1Add optional `command: Option<Vec<String>>` to `pty_open` in `src-tauri/src/modules/pty/mod.rs`; pass it through to `spawn_session`
- [x] 1.2In `spawn_session` (session.rs), when `command` is `Some`, build a `CommandBuilder` from argv[0] + args instead of `resolve_shell()`; keep cwd handling
- [x] 1.3Add a Rust unit test: a command session (e.g. `sh -c 'echo run-test-ok'`) produces output through the channel, and `cargo test`/`cargo clippy` pass

## 2. Frontend spawn plumbing

- [x] 2.1Update `ptyOpen` in `src/modules/terminal/pty.ts` to accept and forward an optional `command` (argv array) to `pty_open`
- [x] 2.2Add a `splitCommand` helper (whitespace split, drop empty tokens) used at launch time

## 3. Tab model + launch action

- [x] 3.1Add `command: string | null` to `TerminalTab` in `TerminalLayoutContext`; default `null` in `newTab`, `setActiveWorktree`, and split-created tabs
- [x] 3.2Add `launchRunnable(commands: string[])`: for each command, add a tab (first in the focused slot, rest parked) with `command` set, in the active worktree
- [x] 3.3Expose `launchRunnable` in the context value

## 4. Host lifecycle

- [x] 4.1In `TerminalHost`, pass the tab's `command` to `ptyOpen` (spawn argv when set)
- [x] 4.2On `TerminalEvent::Exit` for a command tab, close the tab (call `closeTab(tabId)`); shell tabs keep current behavior
- [x] 4.3Ensure spawn errors surface via the existing inline `terminal-error` state

## 5. Launcher UI

- [x] 5.1Add the run button (e.g. `PlayCircleOutlined` or `RocketOutlined`) to `TerminalTabBar` actions, next to the new-terminal `+`
- [x] 5.2Build the searchable popover: `Input` filter + runnable rows (name + commands subtitle), first-match highlight, click/Enter to launch, closes on launch
- [x] 5.3Style the popover in `TerminalTabBar.css` to match the app chrome

## 6. Settings: runnables config

- [x] 6.1Add `Runnable` interface and `Settings.runnables: Runnable[]`; seed defaults (AI `opencode`, Editor `micro`, Monitor `btop`, Dev all three) when absent; persist with existing settings
- [x] 6.2Add the "Runnables" section to `SettingsModal`: list with edit/delete, "Add runnable" inline form (name + dynamic command inputs)
- [x] 6.3Validation: name required; a runnable with no commands is rejected or ignored in the launcher

## 7. Verification

- [x] 7.1`bun check-types` and `bun lint` pass; `cargo test` and `cargo clippy --all-targets -- -D warnings` pass
- [x] 7.2 Manual: launch each default runnable from the popover; verify one/parked tabs, correct cwd, auto-title, and close-on-exit (quit the TUI)
- [x] 7.3 Manual: launch a runnable whose binary is missing → inline error; add/edit/delete runnables in settings → launcher reflects changes and they persist across restart
