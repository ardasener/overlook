## 1. Install and register the dialog plugin

- [x] 1.1 `cargo add tauri-plugin-dialog` in `src-tauri` and add `.plugin(tauri_plugin_dialog::init())` to the builder in `src-tauri/src/lib.rs`
- [x] 1.2 `bun add @tauri-apps/plugin-dialog` (updates `package.json` + `bun.lock`)
- [x] 1.3 Add `dialog:default` to `permissions` in `src-tauri/capabilities/default.json` (Tauri 2 requires an explicit per-window grant for the plugin's commands)
- [x] 1.4 Verify the plugin compiles: `cargo check` in `src-tauri`

## 2. Replace the popover with the native picker

- [x] 2.1 In `WorkspaceSidebar.tsx`, remove `addOpen`, `addPath`, `addError`, and `submitAdd`
- [x] 2.2 Make the `+` button's click handler `await open({ multiple: false, directory: true })` and call `addProject(picked)` on a non-null result, surfacing failures via `message.error`
- [x] 2.3 Remove the `Popover` wrapper and the `workspace-popover`/`workspace-popover-error` content; remove unused imports

## 3. CSS cleanup

- [x] 3.1 Check whether `.workspace-popover` is still used by the fork popover; delete only the dead add-popover styles

## 4. Verification

- [x] 4.1 `bun check-types` and `bun lint` pass; `cargo test` and `cargo clippy --all-targets -- -D warnings` pass
- [x] 4.2 Manual: clicking `+` opens the native folder dialog; picking a directory adds it; canceling does nothing; adding a non-git directory succeeds without error and shows no worktrees
