## 1. Rust PTY backend

- [x] 1.1 Add `portable-pty = "0.9"` to `src-tauri/Cargo.toml`
- [x] 1.2 Create `src-tauri/src/modules/mod.rs` with `pub mod pty;`
- [x] 1.3 Create `src-tauri/src/modules/pty/session.rs`: `Session` struct (Terax pattern — `Mutex<Box<dyn ChildKiller>>` for kill, `Mutex<Box<dyn MasterPty>>` for resize, `Arc<Mutex<Box<dyn Write>>>` for input, explicit field drop order), a pure `resolve_shell()` with platform-specific fallback (`$SHELL` if usable, else PowerShell on Windows, `/bin/zsh` on macOS, `/bin/bash` elsewhere), and `Session::spawn(id, cwd, size)` opening a PTY and spawning the resolved shell via `CommandBuilder`, plus `Session::spawn_io_threads()` starting reader and waiter threads
- [x] 1.4 Create `src-tauri/src/modules/pty/mod.rs`: `TerminalEvent` enum (Output/Exit, Serialize with tag/content), `PtyManager` session registry (Arc<RwLock<HashMap<u32, Arc<Session>>>> + AtomicU32), `pty_open`/`pty_write`/`pty_resize`/`pty_close` commands
- [x] 1.5 Register commands in `src-tauri/src/lib.rs` and initialize `PtyManager` via `manage()`
- [x] 1.6 Add unit tests: (a) `resolve_shell()` returns `$SHELL` when set and executable, platform default when unset or stale; (b) spawn `/bin/sh -c "echo pty-test-ok"` via `portable-pty`, verify output readable from master; (c) interactive shell (`$SHELL` with no args) stays alive for at least 500ms
- [x] 1.7 Verify `cargo check`, `cargo clippy --all-targets -- -D warnings`, and `cargo test` pass with no errors

## 2. Frontend terminal

- [x] 2.1 Create `src/modules/terminal/pty.ts`: typed `TerminalEvent` type, `ptyOpen`/`ptyWrite`/`ptyResize`/`ptyClose` wrappers using `Channel` and `invoke`
- [x] 2.2 Rewrite `src/modules/terminal/TerminalView.tsx`: live xterm instance via `useXTerm` with `FitAddon` + `WebglAddon` (stable references via `useMemo`), `onData` → `ptyWrite`, `onResize({cols,rows})` → `ptyResize`, channel `onmessage` → `instance.write(Uint8Array)` for output bytes
- [x] 2.3 Wire resize: `ResizeObserver` on the container → `fitAddon.fit()`, guard fit with `instance.element` null check (xterm must be open)
- [x] 2.4 Handle focus: `instance.focus()` on terminal area click to ensure keyboard input reaches xterm
- [x] 2.5 Handle StrictMode double-mount: cancelled-flag guard in `useEffect` cleanup so a spurious second PTY session is immediately closed
- [x] 2.6 Verify `pnpm check-types` and `pnpm lint` pass with no errors

## 3. End-to-end verification

- [x] 3.1 Launch `pnpm tauri dev` and verify the shell prompt renders in the terminal pane
- [x] 3.2 Verify typing is echoed and commands execute (e.g., `echo hello-overlook` in the terminal)
- [x] 3.3 Verify an interactive program works (e.g., open `vim`, confirm it renders, then `:q`)
- [x] 3.4 Verify terminal resizes correctly when the window is resized
- [x] 3.5 If the shell dies on spawn: read and log shell stderr from the PTY master (before exit), add error surfacing to the terminal pane
