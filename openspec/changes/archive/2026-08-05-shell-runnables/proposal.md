## Why

Runnables currently direct-exec their command as an argv array, which cannot run shell functions or aliases (e.g. a `op` zsh function that manages a shared opencode server) — those only exist inside an interactive shell that sources `.zshrc`. Executing every runnable through the interactive shell instead is simpler (no argv splitting, quoted args work, `.zshrc` env applies) and restores the automatic foreground-process tab titling for runnable tabs.

## What Changes

- Runnable commands execute via the interactive shell (`<shell> -i -c "<command>"`) instead of direct-exec. Command strings pass through whole (no whitespace splitting).
- Runnable tabs use the same auto-title poller as shell tabs (title live-updates to the foreground process); the deterministic exe-name title is removed.
- The `command` IPC parameter changes from an argv array to a single command string; `splitCommand` and `commandName` helpers are deleted.

## Capabilities

### Modified Capabilities
- `runnable-launcher`: Commands run through the interactive shell; tabs are auto-titled by the foreground process.

### New Capabilities
<!-- None: behavior changes to the existing runnable-launcher capability. -->

## Impact

- `src-tauri/src/modules/pty/mod.rs` + `session.rs`: `command: Option<String>` spawns `<shell> -i -c <command>`.
- `src/modules/terminal/pty.ts`: `ptyOpen` forwards a single string.
- `src/layout/TerminalLayoutContext.tsx`: `launchRunnable` takes `string[]`, stores each whole string as the tab command; tab title starts as the shell name (auto-title takes over).
- `src/modules/terminal/TerminalHost.tsx`: pass command through; remove the auto-title skip for command tabs.
- `src/components/TerminalTabBar.tsx`: launcher passes strings directly; `splitCommand` import removed.
- `src/components/settings/SettingsModal.tsx` + context: command strings are whole commands (no split semantics change in the UI).
- No capability file changes (same commands).
