## 1. Rust: shell execution

- [x] 1.1 Change `pty_open`'s `command` param to `Option<String>`; when set, spawn `<resolve_shell()> -i -c <command>` instead of direct-exec argv (keep `cwd`)
- [x] 1.2 Update the `command_session_executes_argv` test to the new string form (e.g. `-c "echo run-test-ok"` still produces output through the channel); `cargo test` and `cargo clippy --all-targets -- -D warnings` pass

## 2. Frontend: whole-string commands

- [x] 2.1 `pty.ts`: `ptyOpen` forwards `command?: string | null`; delete `splitCommand`
- [x] 2.2 `TerminalLayoutContext`: `TerminalTab.command: string | null`; `launchRunnable(commands: string[])` stores each string whole; delete `commandName` (titles start as the shell name); update the type export
- [x] 2.3 `TerminalTabBar`: launcher calls `launchRunnable(r.commands)` directly (no `splitCommand`); remove the import

## 3. Auto-titling restored

- [x] 3.1 `TerminalHost`: remove the `tab?.command != null` skip in the auto-title poller (and its effect); pass `tab.command` (string) to `ptyOpen`
- [x] 3.2 Close-on-exit for command tabs unchanged (exit event closes the tab)

## 4. Verification

- [x] 4.1 `bun check-types` and `bun lint` pass
- [x] 4.2 Manual: a runnable whose command is a zsh function/alias (e.g. the user's `op`) launches and runs; a runnable with quoted args works; tab titles live-update to the foreground process (`op` → `opencode`); quitting the app closes the tab; close-on-exit still works
