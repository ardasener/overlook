## Why

The project has a Tauri + React + AntD boilerplate with the terminal stack dependencies installed but no live terminal. The terminal is the product's hero — without it, Overlook is an empty shell. This change wires a single interactive terminal (portable-pty → Tauri Channel → xterm.js + WebGL) into the existing app layout, replacing the placeholder pane with a fully working shell session.

## What Changes

- **Rust PTY module** — `src-tauri/src/modules/pty/`: `PtyManager` session registry, `pty_open`/`pty_write`/`pty_resize`/`pty_close` commands spawning via `portable-pty` and streaming output over a Tauri `Channel` (modeled on Terax's proven session pattern: `child.clone_killer()` separation, explicit drop order, waiter thread with blocking `child.wait()`).
- **Frontend terminal module** — typed IPC client (`invoke` wrappers + `Channel<TerminalEvent>` listener) and `TerminalView` component using `react-xtermjs` (useXTerm) with WebGL + fit addons, wiring keyboard input and resize events back to the PTY.
- **Dependencies** — `portable-pty` added to `Cargo.toml`; frontend deps already installed.
- **Placeholder replacement** — the current empty `TerminalView` div becomes the live xterm instance.

## Capabilities

### New Capabilities
- `terminal-session`: A single interactive terminal session — the Rust backend spawns the user's default shell in a PTY, streams raw bytes to an xterm.js instance in the webview over a Tauri `Channel`, and relays keyboard input and resize events back to the PTY.

### Modified Capabilities
<!-- None — the live terminal fills the dev-skeleton spec's "main content area reserved for terminals" without changing the requirement. -->

## Impact

- **New code**: `src-tauri/src/modules/pty/{mod.rs,session.rs}`, `src/modules/terminal/pty.ts`, updated `TerminalView.tsx`
- **Modified code**: `src-tauri/src/lib.rs` (register commands + manage state), `src-tauri/capabilities/default.json` (core permissions), `src-tauri/Cargo.toml` (portable-pty dep)
- **New dependency**: `portable-pty` 0.9 (Rust crate)
- **None of this is breaking** — no existing users, no other features depend on the terminal pane
