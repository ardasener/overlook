## Context

The sidebar header's add-project `+` button opens an AntD `Popover` with a path `Input`, an error line, and an Add button (`WorkspaceSidebar.tsx`). On submit it calls `addProject(path)` from `WorkspaceContext`, which invokes `workspace_add_project` (Rust `projects::add_project` — canonicalizes and dedupes only; no git requirement). The dialog plugin (`tauri-plugin-dialog`) is not installed.

## Goals / Non-Goals

**Goals:**
- Replace the path-input popover with the native folder picker.
- Keep the existing add-project command and validation untouched.
- Keep non-git directories addable (no git validation added).

**Non-Goals:**
- Changing `workspace_add_project` or project storage.
- Multi-directory selection.
- Custom dialog appearance (native only).

## Decisions

### Use `tauri-plugin-dialog` with `open({ directory: true })`
Install `tauri-plugin-dialog` (Rust) and `@tauri-apps/plugin-dialog` (JS); register `.plugin(tauri_plugin_dialog::init())` in `lib.rs`. The frontend calls `open({ multiple: false, directory: true })` which resolves to a path string or `null` on cancel.
- **Why**: official plugin, native look, macOS directory mode supported.
- **Note**: Tauri 2 requires per-window capability grants — `dialog:default` (which includes `dialog:allow-open`) must be added to `src-tauri/capabilities/default.json` alongside `core:default`; the plugin's default permission set is not auto-applied.

### Picker result → existing `addProject`
On a non-null result, call `addProject(picked)` and surface any error via `message.error` (transient). No inline error row — the picker makes invalid paths practically impossible, and non-git dirs are valid.
- **Why**: minimal diff; the transient message covers the rare canonicalize failure.

### Remove popover state and dead styles
Delete `addOpen`, `addPath`, `addError`, and `submitAdd` from `WorkspaceSidebar`; the button becomes a plain click handler. Check `.workspace-popover`/`.workspace-popover-error` usage — the fork popover may share `.workspace-popover`, so only remove truly dead rules.
- **Why**: the typed-path flow no longer exists.

## Risks / Trade-offs

- [Native dialog is modal and blocks the UI] → expected for pickers; brief.
- [The dialog plugin needs an explicit capability grant (`dialog:default`)] → required by Tauri 2's per-window permissions; the plugin's default set is not auto-applied. Added to `capabilities/default.json` during implementation.
- [Path from the dialog is already absolute and valid] → canonicalize still runs server-side as the single source of truth.

## Migration Plan

Frontend + plugin registration in the same cycle; no schema/data migration. Rollback: remove the plugin registration and restore the popover block.
