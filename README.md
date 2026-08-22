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

Prerequisites: [Rust](https://rustup.rs), [Node 20+](https://nodejs.org), [Python 3](https://www.python.org), and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```bash
bun install          # install frontend deps
bun run tauri:dev    # development (isolated dev config; compiles Rust + launches app window)
bun tauri build      # production bundle
```

Dev and installed builds use separate config (dev identifier `com.overlook.app.dev` via `src-tauri/tauri.dev.conf.json`), so daily development state — tracked projects, wallpaper — never collides with the installed app. `bun tauri dev` (raw) is equivalent but uses the prod identifier.

### Known Linux graphics issue

On some NVIDIA + KDE/Wayland systems, WebKitGTK can deliver terminal frames inconsistently under continuous terminal redraws. This can make typed characters appear late even when the machine is otherwise responsive. Enabling dynamic/hybrid graphics in firmware, so the integrated GPU handles display composition, may avoid the issue. The problem is renderer-independent and currently remains an upstream WebKitGTK/compositor limitation under investigation.

### Terminal fonts (Nerd Fonts)

The terminal fonts are Nerd Fonts (Mono variants), fetched and converted at build time by `bun run fonts:fetch` (runs automatically before `dev`/`build`).

- **Python 3 is required**: the fetch step creates a gitignored venv (`.fonts-venv/`) and installs `fontTools` + `brotli` into it to convert TTFs to woff2. Nothing is installed system-wide.
- **Bumping the Nerd Fonts version**: edit `VERSION` and the `sha256` checksums in `scripts/fetch-nerd-fonts.ts`, then run `bun run fonts:fetch --force`. Checksums pin the upstream files — a mismatch fails the build instead of shipping a mutated font.
- Helpful flags: `--check` fails fast when fonts are missing/stale; `--force` re-downloads and re-converts everything.

## Checks

```bash
bun check-types    # TypeScript type check
bun lint           # ESLint
bun run test       # frontend headless tests (vitest + @xterm/headless, no DOM)
cd src-tauri && cargo clippy --all-targets -- -D warnings
cd src-tauri && cargo test
```

CI (`.github/workflows/ci.yml`) runs all of these on push to main and pull requests. The Rust test suite spawns real shells through `spawn_session`'s actual code path; the frontend suite drives xterm headlessly — no GUI or window server is involved anywhere in the test path.

## Architecture in one paragraph

Two processes, one boundary: the **Rust backend owns all OS access** (PTY spawn, filesystem, process lifecycle) and the **webview frontend never touches the shell or filesystem directly** — every host operation crosses the IPC boundary via `invoke()`/`Channel`. Terminal emulation is handled entirely by xterm.js in the webview; Rust only manages the `portable-pty` sessions and streams raw bytes. See [DESIGN.md](./DESIGN.md) for the PTY wiring pattern and the reasoning behind every stack decision.
