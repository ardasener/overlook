## Why

Two developer-experience fixes, both discovered by daily-driving the app to develop itself:

1. **Shift+Enter is broken for TUIs**: opencode (and other terminal apps) distinguish Enter (submit) from Shift+Enter (newline), but xterm 6.0.0 sends `\r` for both — no shift branch, no kitty/modifyOtherKeys support. Terax solved this exact problem; the fix is proven and verified against opencode's input parser.
2. **Dev and installed builds share config**: `projects.json` lives in a hardcoded `dirs::config_dir()/overlook` and the wallpaper dir follows `com.overlook.app`, so the daily `tauri dev` build and the installed app collide on the same state. Since the app is now used to develop itself, dev state must be isolated.

## What Changes

- **Shift+Enter → `\x1b\r`**: intercept keydown via xterm's `attachCustomKeyEventHandler`; when Shift+Enter (no alt/ctrl/meta) is pressed, `preventDefault()` and write `\x1b\r` (ESC + CR) to the PTY instead of xterm's `\r`. opencode's parser maps `\x1b\r` → `return` + `meta`, matching its `input_newline` `alt+return` arm. Unconditional (Terax pattern) — `\x1b\r` is the established shift+enter convention and harmless elsewhere.
- **Dev config isolation via identifier split**: new `src-tauri/tauri.dev.conf.json` overrides `identifier` → `com.overlook.app.dev`; dev runs `tauri dev --config src-tauri/tauri.dev.conf.json` (new `tauri:dev` script). `app_config_dir()` (projects.json, wallpaper, `$APPCONFIG` scope, webview data) all follow the identifier automatically.
- **projects.json migration**: `projects.rs` moves from `dirs::config_dir()/overlook` to the identifier-based `app_config_dir()`; on first load, if the legacy file exists and the new one doesn't, copy it over (one-time, both dev and prod).

## Capabilities

### New Capabilities
- `terminal-key-handling`: shift+enter newline semantics in the terminal — the interception rule, the `\x1b\r` sequence, and what must NOT be affected (plain Enter, alt/ctrl/meta-modified keys, other shortcuts).
- `dev-config-isolation`: dev builds use a separate bundle identifier and config directory — what splits (projects.json, wallpaper, webview data), how dev is launched, and the legacy projects.json migration.

### Modified Capabilities
- `workspace-management`: the tracked-projects file moves from the hardcoded `{config}/overlook` dir to the identifier-based `app_config_dir()`, with a one-time migration from the legacy location.

## Impact

- **Frontend**: `src/modules/terminal/TerminalHost.tsx` (attachCustomKeyEventHandler + `\x1b\r` write); no other frontend files (wallpaper `convertFileSrc` follows `$APPCONFIG` scope automatically).
- **Rust**: `src-tauri/src/modules/workspace/projects.rs` (app_config_dir-based path + legacy migration), `workspace/mod.rs` commands gain `AppHandle` access.
- **Config/build**: new `src-tauri/tauri.dev.conf.json`; `package.json` `tauri:dev` script; README + AGENTS.md document the dev invocation.
- **CI**: release builds unchanged (prod identifier, tauri-action reads tauri.conf.json).
- **Not affected**: PTY/Rust session layer, shortcut system (xterm custom handler runs first and returns before shortcuts), capabilities file (window label `main` unchanged).
