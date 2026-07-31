## Why

Project Overlook is a lightweight, terminal-first desktop workspace built on Tauri + React. It is inspired by Terax's architecture (xterm.js + `portable-pty` on a Tauri 2 backend) and OpenChamber's project/git-worktree workflows, but deliberately excludes AI chrome, built-in editors, and other clutter. The repository is currently an empty OpenSpec scaffold — this change establishes the foundation: a design document that captures the vision and the key technical decisions (including why we do not embed Alacritty), the standard repo files, and a React + Tauri boilerplate that verifies the declared stack dependencies build correctly.

## What Changes

- **DESIGN.md** — new design document capturing the product vision, design principles, UI layout, the two-process architecture, the Alacritty decision with rationale, and the verified technology stack with versions.
- **README.md** — project overview, quick start (dev/build commands), and link to DESIGN.md.
- **AGENTS.md** — project-local agentic workflow guidelines (stack, commands, conventions).
- **.gitignore** — ignores Node, Rust/Tauri, and OS artifacts (node_modules, target/, dist/, .DS_Store, etc.).
- **React + Tauri boilerplate** — Tauri 2 + React 19 + TypeScript + Vite + Ant Design v6 skeleton, package-managed with pnpm, with the app shell (workspace sidebar + terminal area layout) wired to AntD. The declared stack dependencies (including xterm.js + react-xtermjs) are installed so resolution and build can be verified. No live terminal wiring in this change.

## Capabilities

### New Capabilities
- `project-docs`: Repository contains the authoritative design document, README, AGENTS, and gitignore with specified content.
- `dev-skeleton`: The Tauri + React + AntD boilerplate builds and launches in development mode with all dependencies resolved.

### Modified Capabilities
<!-- None — no existing specs yet. -->

## Impact

- **New code**: `src/` (React frontend), `src-tauri/` (Rust backend, `tauri.conf.json`, capabilities), root config files (`package.json`, `vite.config.ts`, `tsconfig.json`).
- **New dependencies**: `tauri` 2.11.x, React 19, `@xterm/xterm` 5.5, `@xterm/addon-webgl` 0.19, `react-xtermjs` 1.0.12, `antd` 6.x, Vite, pnpm. (`portable-pty` is documented in DESIGN.md but not yet a dependency.)
- **None of this is breaking** — greenfield repository, no existing code or users.
