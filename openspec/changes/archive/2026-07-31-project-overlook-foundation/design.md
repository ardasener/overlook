## Context

The repository is a greenfield Tauri project with only OpenSpec scaffolding present. The product vision (see `proposal.md`): a lightweight, terminal-first desktop workspace focused on project management — creating project workspaces and git worktrees and maintaining per-worktree terminal state — with heavy design inspiration from Terax (terminal-first Tauri app) and OpenChamber (git/worktree workflow polish), but no AI chrome, no built-in editor, and no telemetry.

This change only establishes the foundation: the design document, repo hygiene files, and a working boilerplate with a minimal end-to-end PTY proof. Feature work (worktrees, workspace state, tabs) happens in later changes.

**Verified stack (checked against current registries during exploration):**

| Layer | Choice | Verified version |
|---|---|---|
| Desktop shell | Tauri | 2.11.5 (Rust crate) |
| Frontend | React 19 + TypeScript + Vite | latest |
| UI chrome | Ant Design | 6.5.3 |
| Terminal emulation | `@xterm/xterm` | 5.5 (v6.0.0 exists; wrapper pins ^5.5) |
| WebGL addon | `@xterm/addon-webgl` | 0.19 |
| React wrapper | `react-xtermjs` | 1.0.12 (pins xterm ^5.5.0) |
| PTY | `portable-pty` | 0.9.0 |
| Package manager | pnpm | local toolchain ready |

## Goals / Non-Goals

**Goals:**
- Capture the product vision and architecture in `DESIGN.md` so later changes have a stable reference.
- Prove the full terminal dependency chain compiles and runs: `portable-pty` → Tauri command → `Channel` → `react-xtermjs` → WebGL.
- Provide repo hygiene files (`.gitignore`, `README.md`, `AGENTS.md`).
- Keep the app shell minimal but representative: workspace sidebar + terminal tab area with AntD.
- Use pnpm as the package manager (consistent with Terax's workflow).

**Non-Goals:**
- No git worktree creation/management features yet (later change).
- No workspace persistence, session restore, or multi-tab management (later change).
- No AI features, editor, file explorer, or web preview — explicitly out of product scope.
- No Windows/WSL support work in this change (design keeps the door open; `portable-pty` is cross-platform).
- No production packaging/signing (Tauri dev build only).
- No test suite yet (nothing but scaffolding to test; later changes add tests).

## Decisions

### D1: No Alacritty — xterm.js owns emulation, `portable-pty` owns the PTY

The core question was "can we use Alacritty to avoid spinning our own terminal?"

**No.** Alacritty is a complete terminal emulator with its own native windowing (winit) and GPU rendering (glow/skia). It cannot be embedded into a Tauri webview — the webview has no native surface to host it. Its library form (`alacritty_terminal` 0.26) provides the VT parser + terminal state, but adopting it means running **two emulators** (Rust parses, xterm.js renders) and serializing the entire screen grid + scrollback across IPC — huge complexity for zero user-visible gain.

The key insight: in a webview terminal, **xterm.js IS the VT implementation**. It is a complete, battle-tested VT emulator (parser, screen state, scrollback, selection) with a WebGL renderer. The genuinely hard part in Rust is **PTY lifecycle and byte streaming**, which is exactly what `portable-pty` (Wezterm's crate) solves: `forkpty`/`posix_openpt` on Unix, ConPTY on Windows.

This is also the exact architecture Terax (the main inspiration) uses, which de-risks the decision — it is proven at 8.8k stars.

**Alternatives considered:**
- `alacritty_terminal` as library → rejected: dual-emulation serialization problem above.
- `tokio-pty` / raw `nix::pty` → rejected: Unix-only, manual process-group and platform handling.
- `turbopty` → rejected for now: newer, smaller ecosystem; `portable-pty` has far more production usage (Wezterm, Terax).

### D2: Two-process security model

Following Terax's model: **Rust owns all OS access** (PTY spawn, filesystem, process lifecycle); the webview never touches the shell or PTY directly. Every host operation crosses the IPC boundary via `invoke()`/`Channel`.

Rationale: terminal escape sequences and arbitrary child output are untrusted input. Keeping the PTY master in Rust and only streaming raw bytes to the webview means a hostile sequence can corrupt xterm.js state at worst — it cannot touch the filesystem or spawn processes. This becomes the load-bearing security decision for all later features (workspaces, worktrees).

### D3: Stream PTY output over a Tauri `Channel`, not a web server

Output flows Rust → webview as `Channel<TerminalEvent>` events (confirmed current in Tauri 2.11); input flows webview → Rust via `invoke("pty_write")` with an id header. No WebSocket server, no extra port, inherits Tauri's capability/permission model.

Rationale: Terax uses this exact pattern. A WebSocket bridge would add a network server, an attack surface, and packaging complexity for no throughput benefit at our scale. If throughput ever becomes a problem, the later migration path is a raw socket/TCP bridge — the event/command API shape stays the same.

### D4: xterm 5.5, not 6.0

`react-xtermjs` 1.0.12 requires `@xterm/xterm ^5.5.0`; xterm 6.0.0 shipped recently and the wrapper has not caught up. Pin 5.5. We get the WebGL addon and all features we need (search, fit, links). A later change can migrate to xterm 6 once `react-xtermjs` (or a direct integration we write ourselves) supports it.

### D5: AntD v6 for chrome, xterm.js owns its own styling

Ant Design 6 provides the sidebar, tabs, and buttons. xterm.js gets its own CSS theme (we ship a default dark terminal theme matching the app chrome). Do not fight AntD to render the terminal canvas — xterm lives in a dedicated full-bleed container.

### D6: Default shell detection on spawn

Phase 1 targets macOS/Linux. Rust detects the default shell from `$SHELL` (falling back to `/bin/sh`), spawns it with `portable-pty` in the workspace directory. Windows/PowerShell support is deferred; `portable-pty` keeps the option open.

### D7: Repository layout

```
project-overlook/
├── DESIGN.md                  # product vision + architecture (the deliverable doc)
├── README.md / AGENTS.md / .gitignore
├── src/                       # React frontend (Vite)
│   └── modules/terminal/      # xterm wrapper, PTY IPC client
├── src-tauri/                 # Rust backend
│   ├── src/modules/pty/       # PtyManager, session, reader threads
│   ├── capabilities/          # Tauri permissions
│   └── tauri.conf.json
└── openspec/                  # change proposals & specs
```

This mirrors Terax's `src-tauri/src/modules/<area>/` organization so later features (git, workspace) slot in alongside `pty`.

## Risks / Trade-offs

- **`react-xtermjs` is a thin, slowly-maintained wrapper** → Pin the exact xterm version it supports; the wrapper surface is tiny (mount + callbacks), so a fork or direct `useRef` integration is a trivial fallback if it breaks.
- **Tauri webview vs. xterm WebGL on some Linux setups** → Documented Terax workaround exists (`WEBKIT_DISABLE_DMABUF_RENDERER=1`); WebGL addon can fall back to canvas/DOM renderer per terminal.
- **`portable-pty` on macOS spawns the shell with a leaked environment nuance** (non-login shell) → Phase 1 accepts default-shell behavior; shell integration (OSC 7/133, login-shell env) is a later change.
- **Orphaned child processes on kill** → Later change adopts Terax's Job Object (Windows) and process-group kill (Unix) hygiene; Phase 1 kills the immediate child.
- **AntD 6 + React 19 peer dependencies** → Verify install with pnpm early; the boilerplate build is precisely the smoke test for this.

## Open Questions

- Theme system: when do we invest in user-configurable themes (Terax-style presets)? Not needed for foundation; deferred.
- Project state storage format (JSON in `~/.config/overlook/` vs SQLite) — must be decided before the workspace-management change, not now.
- Whether to vendor a replacement for `react-xtermjs` early — only if it becomes a problem during the boilerplate.
