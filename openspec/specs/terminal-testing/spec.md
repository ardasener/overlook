# terminal-testing Specification

## Purpose
Defines the automated test layers guarding the two-process terminal boundary — the Rust PTY bridge and the frontend xterm glue — and the CI contract that keeps them running on every push.

## Requirements

### Requirement: Rust PTY bridge integration tests
The system SHALL provide automated integration tests that spawn real shells through `spawn_session`'s actual code path and assert on the raw PTY output bytes.

#### Scenario: Prompt width math is locale-correct
- **WHEN** an integration test spawns an interactive zsh through `spawn_session` with a UTF-8 locale set, runs a failing command, and reads the raw output
- **THEN** the shell's RPROMPT cursor-forward/back sequences SHALL encode a RPROMPT width equal to the rendered glyph width (5 for `127 ↵`), not the C-locale byte count (7)

#### Scenario: Raw bytes are not corrupted by the bridge
- **WHEN** an integration test writes a command whose output contains multi-byte UTF-8 characters (e.g. `echo "╰─$ ↵"`) and reads the PTY output back
- **THEN** the returned bytes SHALL contain the original multi-byte sequences intact (no replacement characters, no split/corrupted sequences)

#### Scenario: Resize is reflected in kernel winsize
- **WHEN** an integration test spawns a session, resizes the PTY, and probes the kernel winsize
- **THEN** the kernel's reported columns and rows SHALL match the requested size

### Requirement: Frontend headless terminal tests
The system SHALL provide a `vitest`-based headless test suite that drives xterm.js (`@xterm/headless`) without a DOM and asserts on buffer state.

#### Scenario: Replayed prompt bytes land the cursor correctly
- **WHEN** a test writes a recorded RPROMPT redraw byte stream (e.g. `\x1b[K\x1b[59C\x1b[1m\x1b[31m127 ↵\x1b[00m\x1b[0m\x1b[66D`) into a headless terminal at the matching width
- **THEN** the buffer's cursor SHALL be at the column after the prompt (`╰─$ ` = column 4), not on the `$` (column 2)

#### Scenario: Background-strip filter preserves foreground and multibyte bytes
- **WHEN** `stripBackgroundCodes` is applied to a chunk containing background SGR codes, foreground SGR codes, and multi-byte UTF-8
- **THEN** background codes SHALL be removed and all other bytes (including multi-byte sequences) SHALL be preserved byte-for-byte

#### Scenario: Shift-enter emits ESC+CR on keydown only
- **WHEN** the custom key handler receives a shift+enter keydown followed by a keyup
- **THEN** exactly one `\x1b\r` sequence SHALL be written (not two)

### Requirement: E2E terminal compliance and benchmark suite
The system SHALL NOT rely on vendored emulator-compliance or benchmark fixtures (esctest/termbench) for its test layers. esctest is Python 2-only and unmaintained upstream, so it cannot run on macOS or CI; the coverage that an E2E layer would provide is instead asserted at the byte level by the Rust integration tests and the headless frontend suite.

#### Scenario: Test layers require no vendored fixtures
- **WHEN** a developer runs the L2 (`cargo test`) and L3 (`bun run test`) suites
- **THEN** neither suite SHALL require cloned external repositories, compiled C++ fixtures, or Python 2 interpreters

### Requirement: Every test layer runs locally and in CI via the same command
The system SHALL make each test layer runnable with a single command that works identically on a developer machine and in CI. No layer SHALL require manual steps, a GUI, or CI-only configuration.

#### Scenario: Rust integration tests run locally
- **WHEN** a developer runs `cargo test` in `src-tauri/`
- **THEN** the L2 Rust PTY integration tests SHALL execute and report results locally, without any CI or GUI dependency

#### Scenario: Frontend headless tests run locally
- **WHEN** a developer runs the frontend test command (`bun run test`)
- **THEN** the L3 headless xterm tests SHALL execute and report results locally, without a DOM, app, or CI

### Requirement: CI runs the terminal test suites
The system SHALL run the terminal test suites in CI on push and pull request, using the same commands a developer runs locally.

#### Scenario: Tests run in CI
- **WHEN** a commit is pushed or a PR is opened
- **THEN** `cargo test` and the frontend headless tests SHALL execute via the same commands documented for local use, and a failure SHALL fail the CI run
