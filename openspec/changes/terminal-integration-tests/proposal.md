## Why

The terminal is the core of Overlook, but the code that makes it work — the Rust PTY bridge (`spawn_session`, resize sync, byte transport) and the frontend glue (xterm config, output filters, key handling) — has effectively zero automated coverage. A single integration bug (zsh's RPROMPT redraw landing the cursor on the prompt symbol after a failed command) took days to isolate, precisely because no test exercised the boundary between our code and the shell/xterm it drives. We need automated tests that catch regressions in *our* config and IPC code before users do.

## What Changes

- **Add a Rust integration test suite** (runs under `cargo test`) that spawns real shells through `spawn_session`'s actual code path and asserts on the raw bytes: locale-correct prompt width math, byte integrity across resize, and no multi-byte corruption. This directly locks in the LANG/locale fix.
- **Add a frontend headless test harness** using `vitest` + `@xterm/headless` that replays recorded byte streams (real shell captures) and asserts buffer/cursor state, plus unit tests for `stripBackgroundCodes`, the shift-enter key handler, and xterm option construction.
- **Add a `ci.yml` workflow** (push/PR) that runs `cargo test` and the frontend tests.
- **Fix `spawn_session` locale** so the shell inherits a UTF-8 locale (`LANG`/`LC_ALL`) instead of the GUI-launch environment's unset locale — the root cause of the RPROMPT cursor bug.

> Note: the original proposal also scoped an E2E compliance/benchmark layer (esctest + termbench as foreground processes of a headless session). That layer was dropped during implementation: esctest is Python 2-only and unmaintained upstream (no py3 migration, so it cannot run on macOS or CI), and termbench would require vendoring C++ fixtures for marginal signal over L2/L3. The change now covers the two layers that run on a stock developer machine with no vendored code: L2 (Rust integration) and L3 (frontend headless).

## Capabilities

### New Capabilities
- `terminal-testing`: The automated test suites covering the Rust PTY bridge and frontend xterm glue. Specifies what each layer must assert and the CI contract for running them.

### Modified Capabilities
- `terminal-session`: `spawn_session` must set a UTF-8 locale (`LANG`/`LC_ALL`) on the spawned shell when the inherited environment lacks one, so shell prompt-width accounting (zsh `wcwidth`) matches xterm's rendering.

## Impact

- `src-tauri/src/modules/pty/session.rs` — locale fix in `spawn_session`; likely a `#[cfg(test)]`-gated helper or reuse of the reader path for integration tests.
- `src-tauri/src/modules/pty/mod.rs` — no command changes expected.
- New dev deps: `vitest`, `@xterm/headless@6.0.0`.
- New `.github/workflows/ci.yml`.
- Existing `src/modules/terminal/pty.ts` (`stripBackgroundCodes`) and `TerminalHost.tsx` (key handler) become directly unit-testable — may require extracting pure functions from the React components.
