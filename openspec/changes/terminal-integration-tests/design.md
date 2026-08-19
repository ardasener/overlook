## Context

Overlook's terminal spans two processes and a third-party emulator: a Rust backend owns the PTY (`portable-pty` in `src-tauri/src/modules/pty/`), the webview runs xterm.js (`@xterm/xterm@6.0.0` + WebGL/Fit/Unicode11 addons), and the two communicate over a Tauri `Channel` + `#[tauri::command]` IPC boundary. The AGENTS.md architecture boundary is load-bearing: Rust owns all OS access; the webview never touches the PTY directly.

Today there is no test coverage on this boundary:
- Rust has only unit tests (`resolve_shell`, `parse_ps_output`, a one-shot `echo` round-trip) — none spawn an interactive shell through `spawn_session` and assert on prompt bytes.
- The frontend has **no test runner at all** (no vitest/jest in `devDependencies`).
- There is no CI test job (`.github/workflows/` has only `release.yml` tag-triggered and `site.yml`).

This gap was exposed by a real bug: zsh's `bira` RPROMPT (`127 ↵` after a failed command) landed the cursor on the `$` prompt symbol. Root cause (confirmed by reproduction): `spawn_session` never sets `LANG`/`LC_ALL`, so the shell — launched from the macOS GUI/launchd environment, which has no locale — ran in the C locale. In C locale, zsh's `wcwidth` counts the 3-byte `↵` (U+21B5) as 3 columns, making the RPROMPT 7 wide instead of 5, so zsh's cursor-back sequence returned 2 columns short. With `LANG=en_US.UTF-8`, the width is correctly 5.

## Goals / Non-Goals

**Goals:**
- Lock in the locale fix and prevent prompt/cursor regressions via a Rust integration test that goes through `spawn_session`'s real path.
- Add a headless frontend suite (vitest + `@xterm/headless`) for the glue we own: output filtering, key handling, and byte→buffer correctness.
- Wire both layers into a `ci.yml`.

**Non-Goals:**
- E2E emulator-compliance/benchmark suites (esctest/termbench) — esctest is Python 2-only and unmaintained upstream (no py3 migration, cannot run on macOS/CI), and vendoring C++ fixtures for termbench adds little over the byte-level L2/L3 coverage. Dropped during implementation; can be revisited if a maintained, py3-compatible compliance suite appears.
- vttest (interactive, not automatable).
- Certifying xterm.js's own parser compliance — upstream already tests that.
- Windows/WSL coverage — platform-specific test logic stays `#[cfg(unix)]`/`#[cfg(windows)]`; CI runs on macOS for the shell-dependent tests.
- Golden screenshot/pixel-diff tests of the WebGL renderer (separate concern; the headless layer asserts buffer state, not pixels).

## Decisions

### D1. Two test layers, each owning a distinct seam
- **L2 (Rust integration)** — `cargo test` under `src-tauri/`, spawning real shells via a new `#[cfg(test)]` helper that reuses `spawn_session`'s env/PTY construction. Asserts on raw bytes (RPROMPT width math, UTF-8 integrity, winsize). Highest ROI; no new runner.
- **L3 (frontend headless)** — `vitest` + `@xterm/headless@6.0.0` (matches `@xterm/xterm@^6.0.0`). Replays recorded byte fixtures and asserts `buffer.active.cursorX/Y` + cell contents. Also unit-tests `stripBackgroundCodes`, the shift-enter handler, and `xtermOptions`.

*Rationale:* each layer tests a different failure mode. The RPROMPT bug lived at L2 (env/locale); frontend filter/key regressions at L3. `@xterm/headless` exists specifically for this (Node, no DOM).

**Traceability for the motivating bug:** the RPROMPT cursor bug was byte-level (locale → wrong RPROMPT width), not renderer-level — proven by replaying the app's bytes through headless xterm (no renderer) and observing the wrong buffer cursor. It is therefore caught by **L2** (spawn the real shell, assert the bytes), which is the primary net for this bug class. L3 guards the complementary side (xterm config parses correct prompt bytes to the correct cursor).

*Alternatives considered:*
- **tauri-driver/WebDriver for full GUI E2E** — most faithful but heavy and brittle, and requires a window server; rejected because it cannot run headlessly on a developer machine.
- **Vendored esctest/termbench E2E layer** — esctest is Python 2 only (dead on macOS/CI), termbench adds a C++ build + vendored fixtures for marginal signal over L2/L3's byte-level assertions. Rejected; revisit only if a maintained py3-compatible compliance suite appears.

### D2. Locale fix in `spawn_session`
Set `LANG` (and `LC_ALL` as belt-and-suspenders) to a UTF-8 locale **only when the inherited environment lacks one**. Detection: if `LANG`/`LC_ALL`/`LC_CTYPE` are all unset, set `LANG=en_US.UTF-8` (macOS-safe default); otherwise leave the inherited locale untouched. Platform-scoped: `#[cfg(unix)]` sets the locale; Windows is out of scope.

*Rationale:* matches "existing locale preserved" spec requirement and avoids overriding a user's explicit locale.

### D3. Fixture strategy — recorded, not just hand-authored
Seed the L3 suite with **captured** byte streams from a real shell (the `127 ↵` failure bytes, a git-prompt redraw, a resize sequence) *plus* hand-authored deterministic escape sequences for parser edge cases. Captured fixtures catch real-world byte patterns; hand-authored ones pin down specific escape-sequence semantics.

*Rationale:* the bug's bytes (`\x1b[K\x1b[59C...127 ↵...\x1b[66D`) were only observable from a real capture. Hand-authored sequences alone wouldn't have reproduced it.

### D4. Local-parity commands
Each layer has a single command that works identically locally and in CI, with no GUI, driver, or manual step:
- **L2**: `cd src-tauri && cargo test`
- **L3**: `bun run test` (vitest, headless, no DOM)

The `ci.yml` workflow invokes exactly these commands.

*Rationale:* manual and CI-only paths are rejected; every layer must be a one-command local check. There is no window server or WebDriver anywhere in the test path.

### D5. Extract pure functions for testability
`stripBackgroundCodes` (already pure in `pty.ts`) and the shift-enter predicate/`isShiftEnter` + the xterm option builder get minimal refactors so they can be imported by vitest without mounting React. No behavior change.

## Risks / Trade-offs

- **[zsh-dependent tests are locale/env sensitive]** → the L2 locale test sets its own env explicitly; do not rely on the developer machine's locale.
- **[L3 fixtures can drift from real shell output]** → fixtures are captured from the app's real pipeline; when the shell/theme changes the bytes, re-capture. The hand-authored edge-case tests pin escape-sequence semantics independent of any shell.
- **[Two-process IPC boundary not covered by an E2E harness]** → accepted trade-off: the Rust reader→channel path is exercised by L2, and the frontend channel→xterm path by L3; the IPC serialization itself is thin, generated code. A full GUI E2E (tauri-driver) was rejected as non-headless.

## Open Questions

- ~~Should the E2E layer gate CI immediately, or report-only until a baseline is established?~~ (Resolved: no E2E layer; CI gates on cargo + vitest.)
- ~~Where should termbench JSON artifacts live?~~ (Resolved: dropped with the E2E layer.)
- `@xterm/headless` vs `@xterm/xterm` in a `jsdom` environment — `@xterm/headless` is preferred; confirm it exposes `buffer.active` identically (it does, per its typings; verified at implementation).
