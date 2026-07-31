# Overlook — Design

A lightweight, terminal-first desktop workspace for project management.

Overlook helps developers organize their work into **project workspaces**, create **git worktrees** for parallel work, and keep per-worktree terminal sessions and state in order. It takes heavy design inspiration from [Terax](https://github.com/crynta/terax-ai) (a terminal-first Tauri 2 app) and [OpenChamber](https://github.com/openchamber/openchamber) (polished git/worktree workflows), but deliberately strips out the AI chrome, built-in editor, and other clutter those apps carry.

> **Status**: Foundation phase. This document captures the vision and architecture. Feature work (worktrees, workspace state, multi-tab) builds on it in later changes.

---

## 1. Vision

> A base of operations for your development work — terminal-first, project-centric, and quiet.

- **Terminals, not AI.** You can happily run OpenCode, Codex, or any TUI inside Overlook's terminals. Overlook itself does not clutter the interface with AI tools.
- **Projects, not files.** Overlook is organized around project workspaces and git worktrees. The app's job is creating them, keeping their state, and dropping you into a shell where the work happens.
- **Lean by default.** No built-in editor (open vim or micro), no file explorer you have to learn, no web preview. If a feature isn't about the terminal or project state, it doesn't belong.

### Positioning

Terax is "terminal-first **AI-native** dev workspace." Overlook is "terminal-first **project-management** workspace." OpenChamber is a GUI for an AI agent; Overlook is a GUI for your git worktrees.

### Non-features (explicitly out of scope)

- AI side-panel, agent tools, BYOK providers, model settings
- Built-in code editor (CodeMirror, Monaco, etc.)
- Web preview pane
- File explorer with editing (a project picker is fine; a file browser is not, for now)
- Windows/WSL support (deferred; architecture keeps the door open)

---

## 2. Design principles

1. **Terminal-first.** The terminal is the hero. Everything else — sidebar, tabs, status — is chrome that serves it. The terminal canvas gets the space.
2. **Quiet by default.** No telemetry, no accounts, no onboarding tours, no notifications. Open → work → close.
3. **Project-centric.** The unit of organization is the workspace (a repo) and its worktrees. State (open terminals, cwd, branch) lives per-worktree.
4. **Fast and light.** Target: single-digit MB binary, instant launch, no Electron-sized tax. Every dependency is justified.
5. **Boring where it counts.** Battle-tested components over novel ones: xterm.js for emulation, `portable-pty` for PTYs, Ant Design for chrome, Tauri's native IPC for transport.
6. **Keyboard-friendly.** Terminal users live in the keyboard; the chrome must never fight it.

---

## 3. UI layout (target)

```
┌───────────────────────────────────────────────────────────┐
│  ╔══════════════╗  ┌─────────┬─────────┬────────────────┐  │
│  ║  Workspaces  ║  │ Tab 1   │ Tab 2   │        +       │  │
│  ║              ║  ├─────────────────────────────────────┤  │
│  ║ ▼ repo-a     ║  │                                     │  │
│  ║   main       ║  │      xterm.js (WebGL)              │  │
│  ║   feat/x     ║  │      — the hero —                  │  │
│  ║   + worktree ║  │                                     │  │
│  ║              ║  │                                     │  │
│  ║   repo-b     ║  │                                     │  │
│  ║              ║  └─────────────────────────────────────┘  │
│  ╚══════════════╝     ┌─────────────────────────────────┐  │
│                        │ status: branch · dirty files   │  │
│                        └─────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

- **Left**: workspace sidebar — the repo tree, one entry per workspace, expandable into its worktrees (each shows its branch).
- **Center**: tabbed terminal area. Each tab is one PTY session bound to a specific workspace/worktree directory.
- **Bottom**: minimal status bar (cwd, branch, dirty state) fed by OSC 7 / git status in later phases.

---

## 4. Architecture

### 4.1 Two-process model (load-bearing)

Inherited from Terax. Two processes, one boundary:

- **Rust owns all OS access**: PTY spawn, filesystem, process lifecycle, shell spawn.
- **The webview never touches the PTY, filesystem, or processes directly.** Every host operation goes through a `#[tauri::command]` invoked from the frontend (`invoke()` / `Channel`).
- Untrusted input (terminal escape sequences, child output) is parsed in Rust or in scoped frontend code — never executed by the renderer.

This boundary is the security model's root: a hostile escape sequence can corrupt xterm.js state at worst; it cannot touch the filesystem or spawn processes. **New commands must not bypass this boundary.** Commands are registered in `src-tauri/src/lib.rs` and gated by capabilities in `src-tauri/capabilities/default.json`.

```
┌────────────────────────────────────────────────┐
│           WebView — React frontend            │
│  ┌──────────────────────────────────────────┐  │
│  │  AntD chrome: sidebar · tabs · status    │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │  xterm.js (WebGL) per session tab  │  │  │
│  │  └────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────┘
                       │ invoke("pty_*") / Channel<TerminalEvent>
┌──────────────────────▼─────────────────────────┐
│              Rust — Tauri backend              │
│  ┌──────────────────────────────────────────┐  │
│  │  PtyManager: id → Session registry      │  │
│  │  Session  = portable-pty master + child │  │
│  │  reader thread → Channel events         │  │
│  └──────────────────────────────────────────┘  │
│  (future: git / workspace modules sit here)    │
└────────────────────────────────────────────────┘
```

### 4.2 The terminal stack decision (D1) — why not Alacritty

> **Decision: no Alacritty.** xterm.js owns emulation in the webview; `portable-pty` owns the PTY in Rust. **We never spin our own VT emulator — xterm.js already is one.**

Alacritty is a complete terminal emulator with its own native windowing (winit) and GPU rendering (glow/skia). It cannot be embedded into a Tauri webview — the webview has no native surface to host it. Its library form (`alacritty_terminal`) exposes the VT parser + terminal state, but adopting it would mean running **two emulators** (Rust parses, xterm.js renders) and serializing the entire screen grid + scrollback across IPC — enormous complexity for zero user-visible gain.

The insight: in a webview terminal, **xterm.js IS the VT implementation** — a complete, battle-tested parser + screen state + scrollback + selection, with a WebGL renderer. The genuinely hard part in Rust is **PTY lifecycle and byte streaming**, which is what `portable-pty` (Wezterm's crate) solves: `forkpty`/`posix_openpt` on Unix, ConPTY on Windows.

This is also the exact architecture Terax (our main inspiration) uses — proven at 8.8k stars.

**Alternatives considered**: `alacritty_terminal` as library (rejected: dual-emulation serialization); `tokio-pty`/raw `nix::pty` (rejected: Unix-only, manual process-group handling); `turbopty` (rejected for now: smaller ecosystem).

### 4.3 Module layout

```
src/                          # React frontend (Vite)
└── modules/
    ├── terminal/             # xterm component, PTY IPC client (future)
    └── (future: workspaces, worktrees, git)
src-tauri/                    # Rust backend
└── src/
    └── modules/
        ├── pty/              # PtyManager, Session, reader thread (future)
        ├── (future: git/, workspace/)
```

---

## 5. Technology stack (verified)

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Desktop shell | Tauri | 2.11.x | `Channel` IPC confirmed current |
| Frontend | React 19 + TS + Vite | latest | — |
| UI chrome | Ant Design | 6.x | v6 current |
| Terminal | `@xterm/xterm` | **6.0.0** | our own `useTerminal` wrapper, no react-xtermjs |
| WebGL addon | `@xterm/addon-webgl` | 0.20.0-beta.291 | pairing with xterm 6 is load-bearing (see below) |
| Fit addon | `@xterm/addon-fit` | 0.12.0-beta.5 | — |
| PTY *(planned)* | `portable-pty` | 0.9 | Wezterm's crate — not yet a dependency |
| Package manager | pnpm | — | never mix lockfiles |

**Why xterm 6.0.0, not 5.5 (D4):** the WebGL addon's dispose guard reads `core._store._isDisposed`. That structure (`Disposable` → `_store` = `DisposableStore`) only exists in the 6.0 refactor — with 5.5.0 + addon 0.19.0, disposing any terminal with WebGL loaded throws `TypeError: ... _core._store._isDisposed` and blanks the app. The addon 0.19.0 was built against the in-progress core refactor but shipped against the 5.5 release — an upstream release-coordination mismatch. We use xterm 6.0.0 directly through our own thin `useTerminal` hook (`src/modules/terminal/useTerminal.ts`); react-xtermjs was removed because it pins xterm to ^5.5 and its dispose path surfaced the same crash.

**Why `Channel`, not WebSocket (D3):** No extra network server or attack surface at our scale. If throughput ever demands it, the migration path is a raw socket bridge — the command/event API shape stays the same.

---

## 6. Risks & trade-offs

| Risk | Mitigation |
|---|---|
| xterm addon betas (0.20/0.12) shift under us | Pairings pinned exactly; dispose guard is the load-bearing constraint documented in AGENTS.md |
| Linux webview WebGL quirks | Known Terax workaround: `WEBKIT_DISABLE_DMABUF_RENDERER=1`; WebGL addon falls back to canvas/DOM renderer |
| Non-login shell env on spawn | Phase 1 accepts default-shell behavior; shell init injection (OSC 7/133) is a later change |
| Orphaned children on kill | Phase 1 kills the immediate child; adopt process-group kill / Job Objects later |
| AntD 6 + React 19 peer deps | Boilerplate install is the smoke test |

---

## 7. Open questions

- **State storage**: JSON config under `~/.config/overlook/` vs SQLite — decide before the workspace-management change.
- **Theme system**: user-configurable themes (Terax-style) — not needed for foundation.
- **Naming**: project name may be revisited before first release.
