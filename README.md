# Overlook

A lightweight, terminal-first desktop workspace for developers. Overlook helps you manage **project workspaces and git worktrees**, keeping per-worktree terminal sessions and state organized — without the AI chrome, built-in editors, or clutter of modern "agent IDEs".

Design inspiration comes from [Terax](https://github.com/crynta/terax-ai) (terminal-first Tauri app) and [OpenChamber](https://github.com/openchamber/openchamber) (git worktree workflow polish). See [DESIGN.md](./DESIGN.md) for the full vision and architecture.

## Tech stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript + Vite |
| UI chrome | Ant Design 6 |
| Terminal emulation | xterm.js (`@xterm/xterm` 6.0.0, WebGL renderer) |
| Terminal wrapper | `useTerminal` — our own thin React hook (no react-xtermjs) |
| PTY backend | `portable-pty` |
| Package manager | bun |

## Quick start

Prerequisites: [Rust](https://rustup.rs), [Node 20+](https://nodejs.org), and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```bash
bun install        # install frontend deps
bun tauri dev      # development (compiles Rust + launches app window)
bun tauri build    # production bundle
```

## Checks

```bash
bun check-types    # TypeScript type check
bun lint           # ESLint
cd src-tauri && cargo clippy --all-targets -- -D warnings
cd src-tauri && cargo test
```

## Architecture in one paragraph

Two processes, one boundary: the **Rust backend owns all OS access** (PTY spawn, filesystem, process lifecycle) and the **webview frontend never touches the shell or filesystem directly** — every host operation crosses the IPC boundary via `invoke()`/`Channel`. Terminal emulation is handled entirely by xterm.js in the webview; Rust only manages the `portable-pty` sessions and streams raw bytes. See [DESIGN.md](./DESIGN.md) for the PTY wiring pattern and the reasoning behind every stack decision.
