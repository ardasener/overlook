## Context

The project has a working Tauri 2 + React 19 + AntD 6 boilerplate with a placeholder terminal pane (`TerminalView.tsx` renders an empty `<div>`). The terminal stack dependencies (`@xterm/xterm@5.5.0`, `@xterm/addon-webgl`, `react-xtermjs`) are installed and type-checking passes. The Rust backend has no commands registered.

The target UI is exactly what the shell already renders: workspace sidebar on the left, terminal pane filling the rest of the window.

## Goals / Non-Goals

**Goals:**
- One interactive terminal, auto-spawned on app launch, rendered in the existing pane.
- The terminal must be a real PTY session: the user's `$SHELL` runs attached to a pseudo-terminal, with interactive programs (editors, TUIs) working correctly.
- Keyboard input reaches the shell; shell output renders in xterm.js via WebGL.
- The terminal resizes with the window.

**Non-Goals:**
- Multi-tab terminals (later change).
- Workspace/worktree directory binding (spawns in the process CWD; directory binding comes later).
- Shell integration (OSC 7/133, prompt boundary detection) — deferred.
- DA filter (PowerShell cursor-position query reply) — not needed on Unix.
- Agent detection, output coalescing/flusher — POC complexity is overkill.
- Windows/WSL support.
- Custom themes beyond the baked-in dark theme.

## Decisions

### D1: Session pattern mirrors Terax (ChildKiller separation + explicit drop order)

Within a Tauri macOS app, `portable-pty` in isolation (cargo test) works correctly — interactive zsh spawns and stays alive. However, an earlier attempt had the shell dying instantly with exit code 1 (one process via SIGHUP, one via natural exit) when spawned from within the running app. Terax, which uses this exact stack on macOS, handles it successfully. Their pattern:

1. **`child.clone_killer()` creates a separate kill handle.** The full child handle moves into the waiter thread (which calls `child.wait()`); the killer lives in the `Session` struct inside a `Mutex<Box<dyn ChildKiller>>`. This avoids deadlock: `pty_close` kills via the killer without touching the child held by the waiter.
2. **Explicit field drop order.** Rust drops struct fields top-to-bottom. The Session struct is ordered so the killer field drops first, then the writer (close input), then the master (last). This ensures the child is killed before the PTY closes, preventing orphan zombies.
3. **`ChildKillGuard` during setup.** A temporary guard auto-kills the child if any step after spawn (writer take, reader clone) fails.

We adopt this pattern directly. If the shell still exits on spawn, the investigation sub-task will capture the shell's stderr (via PTY read) before exit.

### D2: Two threads (reader + waiter), no flusher

Terax uses three threads: reader (reads + filters), flusher (coalesces 4ms window + sends chunks), and waiter (child exit). For a single terminal with no agent detection or DA filter, the third thread adds complexity without benefit. Each `read()` call from the PTY master naturally returns a chunk (up to 8KB), which is a reasonable send granularity. A coalescing flusher can be added later if single-byte sends become a problem (they won't for an interactive shell at this scale).

### D3: Channel<TerminalEvent> with JSON serialization

`Channel::send` requires `TSend: IpcResponse`. The blanket impl `impl<T: Serialize> IpcResponse for T` means any `Serialize` type works, serialized to JSON. A simple event enum:

```rust
#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum TerminalEvent {
    Output { session_id: u32, data: Vec<u8> },
    Exit { session_id: u32, code: u32 },
}
```

The `data` field is a JSON array of byte values (e.g., `[27, 91, 63, ...]`). For interactive terminal use (~tens of KB/sec) this overhead is negligible. Later optimization: `Channel<Response>` with `InvokeResponseBody::Raw` for binary streaming, at the cost of a custom framing protocol on the frontend to distinguish output from exit events.

### D4: react-xtermjs useXTerm with stable addons

`react-xtermjs` 1.0.12 creates the xterm Terminal instance once, keyed on `[options, addons]` — both must be stable references to avoid terminal disposal/recreation. Addons (`FitAddon`, `WebglAddon`) are created once via `useMemo` and passed as a stable array. The `listeners` object can change per render without retriggering the effect (the hook stores listeners in a ref).

### D5: Platform-aware default shell resolution, no init scripts

Shell resolution order:

1. **`$SHELL` if set and usable** — resolve the variable; on Unix require the path to exist and be executable (a set-but-stale `$SHELL` pointing at a removed binary must not break launch).
2. **Platform default otherwise**:

| Platform | Default |
|---|---|
| Windows | PowerShell — `pwsh.exe` (PowerShell 7+) if present, else `powershell.exe` (Windows PowerShell 5.1) |
| macOS | `/bin/zsh` |
| Linux / other Unix | `/bin/bash` |

This lives in a small pure `resolve_shell()` function (`#[cfg]`-gated arms), unit-testable without spawning a PTY. Windows fallback is defensive — Windows/WSL support is explicitly deferred, but the resolver is where it will hook in. No custom shell init (`.zshenv`, `.bashrc` injection) — the shell runs with its user's normal configuration. Shell detects interactivity automatically because `isatty(stdin)` returns true when attached to a PTY slave.

### D6: Resize flow

```
Window resize → ResizeObserver fires
  → fitAddon.fit() (xterm recalculates cols/rows)
    → xterm onResize({cols, rows}) → pty_resize(cols, rows)
      → master.resize(PtySize { rows, cols, ... })
```

And on initial mount: `fitAddon.fit()` fires the ResizeObserver (observers fire once on start), ensuring the shell gets the correct initial size.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Shell dies on spawn (exit code 1 / SIGHUP) — observed in earlier attempt with simpler session code | Terax-proven pattern (D1) is the first line of defense. Investigation sub-task to read shell stderr from PTY and surface errors in the terminal pane. |
| StrictMode double-mount spawns two PTY sessions | Cancelled-flag guard in useEffect cleanup: if `cancelled` when `ptyOpen` promise resolves, immediately `pty_close` the spurious session. |
| WebglAddon throws on load (GPU/driver issue) | `try/catch` on `term.loadAddon(new WebglAddon())`; fall back to xterm's default canvas/DOM renderer (no user-visible break, just slightly lower performance). |
| JSON overhead for terminal output | Negligible for interactive shells at this scale (~tens of KB/sec). Binary optimization path via `Channel<Response>` documented as a future refinement. |
| Orphaned child if app crashes without cleanup | Acceptable for dev; production hardening (Drop kill, process-group kill) comes later per DESIGN.md §6. |

## Open Questions

None — the design is well-scoped at the architecture level. The "shell dies on spawn" risk will be addressed empirically during implementation.
