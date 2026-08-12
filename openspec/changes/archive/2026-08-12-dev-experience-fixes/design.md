## Context

Two independent fixes:

1. **Shift+Enter**: xterm 6.0.0's keyboard handler maps Enter (keyCode 13) to `\r` with no shift branch (`case 13:o.key=e.altKey?s.C0.ESC+s.C0.CR:s.C0.CR`). It has no kitty keyboard protocol or modifyOtherKeys support (verified: zero references in the shipped bundle). opencode (open-tui) expects `\x1b\r` (ESC+CR) as the modified-enter convention and maps it to `alt+return`, which is one of its `input_newline` keybinds.
2. **Config collision**: `projects.json` is hardcoded to `dirs::config_dir()/overlook`; wallpaper lives in `app.path().app_config_dir()` (identifier-based). Dev builds and installed builds share both. Frontend has no hardcoded paths — everything resolves through Tauri's `app_config_dir()` and the `$APPCONFIG/**` asset scope, both identifier-driven.

## Goals / Non-Goals

**Goals:**
- Shift+Enter inserts a newline in opencode (and any app honoring the `\x1b\r` convention) while plain Enter keeps submitting.
- Dev builds read/write config under `com.overlook.app.dev`; installed builds under `com.overlook.app`.
- One-time, lossless migration of the existing tracked-projects list.
- Zero frontend churn: the identifier switch must flow through Tauri's own path APIs.

**Non-Goals:**
- Full kitty keyboard protocol / modifyOtherKeys support (Terax pattern covers shift+enter without it).
- Handling other modified keys (ctrl+enter, alt+enter already work via xterm's alt branch).
- Splitting local storage explicitly (already isolated by webview origin: `localhost:1420` dev vs `tauri://localhost` prod).
- Changing the installed-app identifier (`com.overlook.app` stays for real users).

## Decisions

### 1. `attachCustomKeyEventHandler` for shift+enter (Terax pattern)
- xterm's built-in custom key handler runs before its default handling; returning `false` prevents the key from reaching xterm's default path (no `\r` emitted), and we write `\x1b\r` to the PTY ourselves.
- **Why**: xterm 6.0.0 cannot express shift+enter any other way (no protocol support). Terax ships this exact implementation in production.
- **Alternatives considered**: kitty protocol upgrade (xterm master has partial support but 6.0.0 doesn't; addon pairing constraints per AGENTS.md make upgrades risky); parsing PTY output for `\x1b[>4;2m` to gate behavior (unnecessary — `\x1b\r` is a convention that's safe unconditionally).

### 2. Unconditional shift+enter rewrite
- Always intercept Shift+Enter (with `shiftKey`, without alt/ctrl/meta). Plain Enter, and all modified combinations, pass through unchanged.
- **Why**: matches Terax, no state to track, harmless to shells/apps that don't interpret `\x1b\r` (they see ESC then CR, same as a user pressing Escape+Enter).
- **Risk note**: an app that treats ESC specially could see an ESC prefix — but that's the documented shift+enter convention across terminal emulators.

### 3. Identifier split via `--config` (Option A)
- `src-tauri/tauri.dev.conf.json`: `{ "identifier": "com.overlook.app.dev" }`, passed as `tauri dev --config`. JSON merge patch — only the identifier changes; everything else (windows, bundle, build commands) stays from the base config.
- **Why**: the identifier is Tauri's single source of truth for config paths. `app_config_dir()` = `${configDir}/${identifier}`, `$APPCONFIG/**` scope and `convertFileSrc` follow it automatically — zero frontend changes.
- **Alternatives considered**: `cfg!(debug_assertions)` dir suffix (Option B) — rejected: release-mode local builds would silently share prod config; identifier split is the documented, explicit mechanism.
- **Dev script**: `"tauri:dev": "tauri dev --config src-tauri/tauri.dev.conf.json"` so daily dev stays a single command; `bun tauri dev` (raw) still works and uses prod identity.

### 4. projects.json → app_config_dir() + legacy migration
- `projects.rs` gains an `app_config_dir` parameter (threaded from `AppHandle` via the workspace commands) and reads/writes `${app_config_dir}/projects.json`.
- Migration: on `load_projects`, if the new file is absent and the legacy `dirs::config_dir()/overlook/projects.json` exists, copy it once. Applies identically in dev (`.dev` dir) and prod.
- **Why**: keeps the file alongside the wallpaper under the identifier dir; migration is a one-time copy, never destructive.

## Risks / Trade-offs

- **[Terminal apps that choke on `\x1b\r`]** → none known; ESC+CR is the standard shift+enter encoding used by Terax and multiple emulators. Plain Enter is untouched.
- **[Shortcut conflicts]** → xterm's custom handler runs before our capture-phase shortcut hook (which already exempts `.xterm` targets); Shift+Enter is not bound to any shortcut. Verified no overlap.
- **[Dev builds accidentally use prod config]** → `bun tauri dev` (raw) uses prod identity; only `bun run tauri:dev` is isolated. Documented clearly in README/AGENTS.md. The trade-off is accepted so CI and release tooling need zero changes.
- **[Migration edge cases]** → if both legacy and new files exist, legacy is ignored (new wins — same as current behavior). Corrupt legacy file degrades to empty list (existing behavior).
- **[Identifier change side effects]** → dev window/webview data namespace changes too (WebKit data dir); this is desired (full isolation), and dev has no user data worth preserving beyond projects.json.

## Migration Plan

1. Ship the change. On next dev launch: legacy `~/Library/Application Support/overlook/projects.json` (if present) is copied to `~/Library/Application Support/com.overlook.app.dev/projects.json`. On next installed launch, same copy to `com.overlook.app/`.
2. Legacy file is never deleted — the copy is one-way; both dirs are now under the identifier.
3. Rollback: revert the `--config` usage + path change; projects file remains readable at the legacy path only if the copy hasn't overwritten anything (it never deletes).
