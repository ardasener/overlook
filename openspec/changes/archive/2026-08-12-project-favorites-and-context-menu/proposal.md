## Why

The projects bar is the daily-driver surface and its actions are undiscoverable and cluttered: delete/fork buttons crowd every row, there's no way to pin important projects, long directory names push actions off-screen, and there's no quick way to copy a project/worktree path. A context menu + favorites + display names makes the tree scannable and keyboard/mouse friendly.

## What Changes

- **Favorites**: a star button on project rows toggles favorite state; favorited projects sort above non-favorites, each group alphabetical by display name. Star renders empty (☆) unfavorited, filled (★) favorited.
- **Context menu** (right-click) on project and worktree rows, replacing the inline delete/fork buttons:
  - project: Fork worktree…, Rename…, Copy path, Remove project
  - worktree (non-default): Copy path, Delete worktree
- **Fork + Rename become modals** (AntD menus can't hold inputs): fork modal reuses the existing branch-name + branch-exists logic; rename modal prefilled with the current display name (empty clears back to the directory basename).
- **Copy path**: copies the full absolute path of the project/worktree to the clipboard (new clipboard plugin).
- **Truncation**: project display names are truncated to 20 characters total with a trailing `…` (full name on hover). Worktree branch labels keep flexible-width ellipsis.
- **Storage schema**: `projects.json` entries become `{ path, favorite, displayName }`, backward-compatible with the current string-only file via an untagged serde enum (no migration step).

## Capabilities

### New Capabilities
- `project-favorites`: starring projects, favorite sort order, and the persistence of the favorite flag in `projects.json`.
- `project-display-names`: custom display names for projects, rename/clear behavior, 20-char truncation, and use of the display name in the tree and cleanup modal.
- `workspace-context-menu`: right-click menus on project and worktree rows with fork/rename/copy/remove/delete actions; copy-path clipboard behavior.

### Modified Capabilities
- `workspace-management`: the tracked-projects file schema changes from string paths to structured entries (add favorite + displayName), the sidebar tree actions move from inline buttons to the context menu, and the tree gains the copy-path action.

## Impact

- **Rust**: `modules/workspace/projects.rs` — `Vec<String>` → untagged `String | ProjectEntry` persistence, `load/add/remove` updated; `modules/workspace/mod.rs` — `ProjectInfo` gains `favorite` + `display_name`, new commands `workspace_set_project_favorite` and `workspace_rename_project`.
- **Frontend**: `WorkspaceContext.tsx` — new `favorite`/`displayName` fields, sorted `filtered` output, toggle-favorite/rename/copy-path helpers; `WorkspaceSidebar.tsx` — star button, context-menu dropdowns, fork/rename modals, copy-path handler, 20-char truncation; `WorkspaceSidebar.css` — context-menu/star styles; `CleanupModal.tsx` — uses display name.
- **Dependencies**: `tauri-plugin-clipboard-manager` (cargo) + `@tauri-apps/plugin-clipboard-manager` (npm), registered in `lib.rs`, `clipboard-manager:allow-write-text` added to `capabilities/default.json`.
- **Not affected**: PTY/session layer, terminal layout, settings, release pipeline.
