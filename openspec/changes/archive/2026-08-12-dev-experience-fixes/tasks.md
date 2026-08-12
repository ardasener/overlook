## 1. Shift+Enter handling

- [x] 1.1 Add `isShiftEnter` helper (Enter + shift, no alt/ctrl/meta) to `src/modules/terminal/TerminalHost.tsx`
- [x] 1.2 Wire `terminal.attachCustomKeyEventHandler` in the terminal effect: on Shift+Enter, `preventDefault()` and write `\x1b\r` to the PTY (via the existing session-id write path); return `false`; return `true` for all other keys
- [x] 1.3 Verify plain Enter, Alt+Enter, Ctrl+Enter, Meta+Enter pass through unchanged (xterm default)

## 2. Dev config isolation

- [x] 2.1 Create `src-tauri/tauri.dev.conf.json` merging `identifier` = `com.overlook.app.dev`
- [x] 2.2 Add `"tauri:dev": "tauri dev --config src-tauri/tauri.dev.conf.json"` to `package.json`
- [x] 2.3 Change `projects.rs` to take an `app_config_dir` path (from `AppHandle`) instead of `dirs::config_dir()/overlook`; update `workspace/mod.rs` commands to pass it
- [x] 2.4 Implement legacy migration in `load_projects`: if new file absent and legacy `{config_dir}/overlook/projects.json` exists, copy contents once (never delete legacy)
- [x] 2.5 Update README and AGENTS.md: dev launches via `bun run tauri:dev`; document the dev/prod identifier split

## 3. Verification

- [x] 3.1 `bun check-types`, `bun run build`, `cargo test`, `cargo clippy --all-targets -- -D warnings`
- [x] 3.2 Run dev build: confirm config lands in `~/Library/Application Support/com.overlook.app.dev/` and legacy projects.json migrates
- [x] 3.3 Run the installed/prod build: confirm config lands in `com.overlook.app/`
- [x] 3.4 In dev build, run opencode in a terminal: Enter submits, Shift+Enter inserts a newline; plain Enter unaffected in a shell
