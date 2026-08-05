## Why

Adding a project currently requires typing a path into a small popover input. A native macOS folder picker is the standard, faster, and less error-prone way to select a project directory.

## What Changes

- The sidebar's add-project `+` button opens the native folder selection dialog (`tauri-plugin-dialog`) instead of the path-input popover.
- Picking a directory adds it as a project through the existing `workspace_add_project` command. Non-git directories remain addable (they simply lack worktree functionality) — no git validation is added.
- The path-input popover and its state are removed; picker errors surface as a transient message.

## Capabilities

### New Capabilities
- `native-project-picker`: Add a project via the native folder dialog instead of a typed path.

### Modified Capabilities
<!-- None: the add-project command, project storage, and the sidebar tree are unchanged. -->

## Impact

- `src-tauri/Cargo.toml` + `src-tauri/src/lib.rs`: add and register `tauri-plugin-dialog`.
- `package.json` + `bun.lock`: add `@tauri-apps/plugin-dialog`.
- `src/components/WorkspaceSidebar.tsx`: replace the add-project popover with a native picker call.
- `src/components/WorkspaceSidebar.css`: remove dead add-popover styles if unused by the fork popover.
- No Rust command changes, no capabilities file changes (the dialog plugin's default permission set includes `allow-open`).
