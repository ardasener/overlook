## 1. Locale fix in spawn_session

- [x] 1.1 In `src-tauri/src/modules/pty/session.rs`, set `LANG`/`LC_ALL` to a UTF-8 locale (`en_US.UTF-8`) on the child shell only when the inherited env lacks `LANG`/`LC_ALL`/`LC_CTYPE`, behind `#[cfg(unix)]`
- [x] 1.2 Add a unit test proving the env is set when absent and preserved when present
- [x] 1.3 Verify `cargo clippy --all-targets -- -D warnings` passes

## 2. Rust PTY integration tests (L2)

- [x] 2.1 Extract a `#[cfg(test)]` helper that spawns an interactive zsh through `spawn_session`'s real path (env + PTY construction) and returns the raw output bytes
- [x] 2.2 Add test: RPROMPT width is locale-correct (failing command → `127 ↵` encodes width 5, not 7)
- [x] 2.3 Add test: multi-byte UTF-8 output survives the bridge intact (no replacement chars)
- [x] 2.4 Add test: resize propagates to kernel winsize
- [x] 2.5 Remove the old `pty_resize_probe`/`pty_resize_after_spawn` probe tests once superseded by 2.2–2.4
- [x] 2.6 Run `cargo test` and confirm all L2 tests pass

## 3. Frontend headless test setup (L3)

- [x] 3.1 Add `vitest` and `@xterm/headless@6.0.0` to devDependencies
- [x] 3.2 Add `vitest.config.ts` (or extend `vite.config.ts`) and a `test` script in `package.json`
- [x] 3.3 Confirm `@xterm/headless` exposes `buffer.active.cursorX/Y` and `getLine().translateToString()` in a smoke test

## 4. Frontend headless tests (L3)

- [x] 4.1 Add byte-replay fixture test: recorded RPROMPT redraw lands cursor at column 4 (after `╰─$ `), not column 2
- [x] 4.2 Add unit test for `stripBackgroundCodes` (background codes removed, foreground + multibyte preserved)
- [x] 4.3 Add unit test for shift-enter handler (keydown-only, single `\x1b\r`)
- [x] 4.4 Extract `isShiftEnter` and the xterm option builder into importable pure modules if needed (no behavior change)
- [x] 4.5 Add a hand-authored escape-sequence edge-case test (e.g. cursor-up/back arithmetic)
- [x] 4.6 Run `bun run test` and `bun check-types` and confirm green

## 5. CI workflow

- [x] 5.1 Add `.github/workflows/ci.yml` on push (main) + pull_request with jobs that invoke the exact local commands: `cargo test` + clippy and `bun run test`
- [ ] 5.2 Verify CI triggers on a test commit and reports green (or surfaces a real failure)

## 6. Cleanup and docs

- [x] 6.1 Remove all TEMP-DIAG/TEMP-TEST instrumentation from the cursor-bug investigation (`pty_probe_size`, `pty_dbg_log`, `RPROMPT-chunk`/`RAW-RPROMPT-chunk` logging, `probeDone`, Unicode11 `activeVersion` forcing, `test-plain` font, `ol:renderer` toggle) and restore the Nerd-Fonts default
- [x] 6.2 Update `AGENTS.md` with the new test commands and CI expectations
- [x] 6.3 Update `README.md` if it documents build/test commands
