## Context

Runnables are stored as `{ id, name, commands: string[] }` in settings. Today each command string is whitespace-split into argv (`splitCommand`) and direct-executed via `pty_open`'s `command: Option<Vec<String>>`. Tab titles for runnables are set deterministically at creation from the argv basename (`commandName`) because direct-exec made the command itself the session's `shell_pid`, so the foreground-process poller (which walks the tree *below* the shell pid) found no descendants and fell back to the shell name.

## Goals / Non-Goals

**Goals:**
- Run every runnable through the interactive shell so functions/aliases work.
- Restore auto-titling for runnable tabs (the poller works because the command is now a child of the shell pid).
- Delete the argv-split and exe-name machinery.

**Non-Goals:**
- Per-runnable mode flags (everything is shell mode).
- Quoting/escaping the command string (passed whole to `-c`).
- Changing the runnable settings UI beyond the existing command subtitle.

## Decisions

### `command` becomes a single string, executed via `-i -c`
`pty_open` takes `command: Option<String>`. When present, spawn `<resolve_shell()> -i -c <command>` with the PTY as the slave; `cwd` still applies. Verified: `zsh -ic "op"` sources `.zshrc`, finds the function, runs it, and exits (close-on-exit preserved). With `-c`, the prompt is never drawn, so the earlier `%` startup artifact cannot occur in shell mode.
- **Why**: functions/aliases only exist in interactive shells; `-c` runs the command then exits.
- **Alternative**: `sh -c` — rejected (non-interactive, no `.zshrc`, no functions).

### `launchRunnable(commands: string[])` stores whole strings
Tabs carry `command: string` (the whole command string). `launchRunnable` no longer splits; the launcher passes each command string directly. `splitCommand` is deleted from `pty.ts`.
- **Why**: whole-string passthrough enables quoted args and functions; simpler than argv.

### Auto-titling restored for runnable tabs
`TerminalHost` removes the `tab.command != null` skip in the auto-title poller. Runnable tabs now behave exactly like shell tabs: title starts as the shell name, the poller renames to the foreground process (descending past the `-ic` shell wrapper to its child, e.g. `op` → `opencode`) and reverts to the shell name when idle. `commandName` and its usage in `launchRunnable` are deleted.
- **Why**: with a shell wrapper, the command is a child of `shell_pid`, which `parse_ps_output` already handles (it skips shell comms and descends). The deterministic-title workaround was only needed for direct-exec.

### Tab model
`TerminalTab.command: string | null` (was `string[] | null`). `ptyOpen` signature: `(cwd, onEvent, command?: string | null, cols?, rows?)`.

## Risks / Trade-offs

- [Startup latency] → sourcing `.zshrc` per launch adds ~50-200ms vs direct-exec. Acceptable; matches opening a normal terminal tab.
- [Shell-integration OSC markers in output] → zsh emits `OSC 133;D`/`133;A` markers; xterm ignores/handles them invisibly (verified).
- [Command not a direct child] → the `-ic` shell is the PTY's foreground process; Ctrl+C/signals flow to it and the command like any shell tab. Exit still propagates.
- [Idle shell between command end and close] → the shell exits when `-c` completes, so the tab closes immediately; no lingering prompt.

## Migration Plan

Frontend + one Rust signature change in one cycle. Existing stored runnables are already `{ commands: string[] }` — unchanged shape, only interpretation of each string changes. Rollback: revert the `pty_open` param and the launcher/context changes.
