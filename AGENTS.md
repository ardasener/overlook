# AGENTS.md

Project-local workflow guidelines for agentic coding tools.

## Project

Overlook — a lightweight, terminal-first desktop workspace for project management (workspaces + git worktrees). Tauri 2 + React 19 + Ant Design 6 + xterm.js + `portable-pty`.

## Architecture boundary (load-bearing)

Two-process security model, inherited from Terax:

- **Rust owns all OS access**: PTY spawn, filesystem, process lifecycle, shell spawn.
- **The webview never touches the PTY, filesystem, or processes directly.** Every host operation goes through a `#[tauri::command]` invoked from the frontend (`invoke()` / `Channel`).
- Untrusted input (terminal escape sequences, child output) must be parsed in Rust or in scoped frontend code — never executed by the renderer.

Do not add new commands that bypass this boundary. New commands must be registered in `src-tauri/src/lib.rs` and gated by capabilities in `src-tauri/capabilities/default.json`.

## Stack & commands

- Package manager: **bun** (never mix in pnpm/npm/yarn lockfiles).
- Frontend: React 19 + TypeScript + Vite in `src/`. Ant Design 6 for chrome, xterm.js owns its own styling.
- Terminal: `@xterm/xterm@6.0.0` + our `useTerminal` hook (see "Dependencies to not fix").
- Backend: Rust in `src-tauri/`, modules under `src-tauri/src/modules/<area>/`.
- PTY: `portable-pty`. Do not attempt to embed Alacritty (see DESIGN.md D1).

### Commands

```bash
bun install
bun run tauri:dev        # dev app (isolated dev config, identifier com.overlook.app.dev)
bun tauri build          # production bundle
bun check-types          # TypeScript type check
bun lint                 # ESLint
bun run test             # frontend headless tests (vitest + @xterm/headless, no DOM)
bun run provision         # fetch/cache generated Base16 themes and bundled fonts
cd src-tauri && cargo clippy --all-targets -- -D warnings
cd src-tauri && cargo test
```

CI (`.github/workflows/ci.yml`) runs an ubuntu + macOS matrix on push to main + pull requests — both run the full suite (Windows is deferred: the shell-dependent PTY tests are `#[cfg(unix)]` and the `ps`-poller helpers aren't cleanly cross-platform yet). The commands invoked are exactly the local ones: `cargo clippy --all-targets -- -D warnings`, `cargo test`, `bun run test`, `bun check-types`, `bun lint`. There is no GUI/WebDriver-based test layer; the Rust PTY tests spawn real shells via `spawn_session`'s path (see `pty_integration` in `src-tauri/src/modules/pty/session.rs`).

## Conventions

- Prefer small, single-purpose modules with clear boundaries (`modules/pty/`, `modules/git/`, `modules/workspace/`).
- IPC commands: `pty_open`, `pty_write`, `pty_resize`, `pty_close` naming style — snake_case, typed frontend wrappers.
- Theme data is generated from the pinned Tinted Theming Base16 catalog by `bun run themes:fetch`; generated theme assets are gitignored.
- System font discovery belongs in Rust via `fontdb`; the webview must use the registered command and never inspect font files directly. UI font choices include all discovered families; terminal choices must be monospaced.
- Keep comments minimal; document intent, not implementation.
- Domain-driven names over generic ones.
- Windows/WSL support is explicitly deferred; keep platform-specific logic in `#[cfg(unix)]`/`#[cfg(windows)]` arms.
- **WKWebView has no working HTML5 drag-and-drop for custom dataTransfer.** The drag ghost starts, but `dragover`/`drop` events are never delivered to webview elements. Tab drag-and-drop is implemented with a pointer-based drag (`TerminalLayoutContext`'s `drag` state + hit-testing via `elementFromPoint`); do not reintroduce `draggable`/`dragstart` for it.

## Dependencies to not "fix"

- **Terminal: `@xterm/xterm@6.0.0` with addons `@xterm/addon-webgl@0.20.0-beta.291` and `@xterm/addon-fit@0.12.0-beta.5`.** These pairings matter: the addon's dispose guard reads `core._store._isDisposed`, which only exists in the 6.0 refactor (`Disposable` → `_store` = DisposableStore). With 5.5.0 + addon 0.19.0, disposing any terminal with WebGL loaded throws `TypeError: ... _core._store._isDisposed` and blanks the app. Do not downgrade xterm or the addons without checking that guard. The terminal is wrapped by our own `useTerminal` hook (`src/modules/terminal/useTerminal.ts`) — **do not reintroduce `react-xtermjs`**; it was removed because its dispose path surfaced the same crash and it pins xterm to ^5.5.

## OpenSpec

Changes are managed as OpenSpec changes under `openspec/changes/`; specs live in `openspec/specs/`. Update specs when behavior changes, not just implementation. See the OpenSpec docs for the change workflow (propose → apply → archive).
