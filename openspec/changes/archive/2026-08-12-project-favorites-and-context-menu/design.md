## Context

The workspace tree (`WorkspaceSidebar.tsx`) currently renders inline action buttons on every row: fork (Popover with branch input) + remove (Popconfirm) on projects, delete (Popconfirm) on non-default worktrees. Projects are persisted in `projects.json` as a flat `Vec<String>` of absolute paths (`projects.rs`). `ProjectInfo` (IPC payload) carries `path`, `name` (directory basename, derived in Rust), `isGit`, `branch`, `worktrees`. The tree already truncates via CSS ellipsis but only at row width. There is no clipboard plugin installed; the app uses `tauri-plugin-dialog` as the existing plugin pattern.

## Goals / Non-Goals

**Goals:**
- Star-favorite projects; favorites sort above the rest, each group alphabetical by display name.
- Right-click context menus on project and worktree rows with all destructive/creation actions.
- Custom display names for projects (clear to revert), truncated to 20 chars with `…`.
- Copy-path to clipboard from the context menu.
- Zero-loss migration: existing string-only `projects.json` files keep working.

**Non-Goals:**
- Favorites on worktrees (projects only for now).
- Reordering via drag or manual sort (alphabetical only).
- Renaming actual directories — display name is a UI label only.
- Truncation of worktree branch labels (keep flexible ellipsis).
- Keyboard-triggered context menus (mouse right-click only, matching AntD's `contextMenu` trigger).

## Decisions

### 1. Structured `projects.json` with untagged serde enum
- Storage becomes `Vec<ProjectEntry>` where `ProjectEntry = String | { path, favorite, displayName }`, deserialized via `#[serde(untagged)]`.
- **Why**: backward-compatible with zero migration — old files are plain strings, new files carry metadata; serde tries the string form first. No copy/rename step like the legacy-dir migration.
- **Alternative**: keep `Vec<String>` + a parallel metadata file — rejected: two files that can drift, and the atomic rewrite already handles both concerns in one place.

### 2. Sort in the frontend (`WorkspaceContext.filtered`)
- `filtered` stable-sorts: favorites first, then alphabetical by display name within each group.
- **Why**: sorting is display concern; Rust stays the source of truth for the list, frontend owns presentation. Keeps IPC minimal.
- **Note**: favorites sort by display name (fallback to dir basename), so the visible order matches what the user reads.

### 3. Context menus via AntD `Dropdown trigger="contextMenu"`
- Project rows: `Fork worktree…`, `Rename…`, `Copy path`, `Remove project`.
- Worktree rows (non-default only): `Copy path`, `Delete worktree`.
- `onMouseDown` on the menu trigger stops propagation so right-click doesn't also select/expand the node (same pattern as today's inline buttons).
- **Why**: AntD Dropdown with `contextMenu` trigger is the idiomatic path; the tree rows already use AntD primitives heavily.

### 4. Fork + Rename as modals
- AntD menu items cannot contain inputs, so the fork popover becomes a `Modal` reusing the exact branch-name + branch-exists → attach/cancel logic currently in `WorkspaceSidebar`. Rename is a new prefilled modal; empty submit clears the display name.
- **Why**: preserves all existing fork behavior (branch-exists confirm, error display) with minimal logic churn; menus stay simple items.

### 5. Clipboard plugin
- `tauri-plugin-clipboard-manager` (cargo 2.x) + `@tauri-apps/plugin-clipboard-manager` (npm), registered in `lib.rs`, permission `clipboard-manager:allow-write-text` in `capabilities/default.json` (nothing enabled by default per docs — explicit grant required).
- **Why**: webview `navigator.clipboard` is unreliable under Tauri's custom protocol; the plugin is the documented, capability-gated path and matches the dialog-plugin pattern.

### 6. Display names in UI
- `ProjectInfo.name` stays the directory basename (used for fallback sort/label); `displayName: Option<String>` overrides it in the tree and CleanupModal. Empty/None → basename.
- New commands: `workspace_set_project_favorite(path, favorite)`, `workspace_rename_project(path, display_name)` — both persist through `projects.rs` and re-read the list.

### 7. 20-char truncation in the frontend
- A small `truncateName(name, 20)` helper (JS: `name.length > 20 ? name.slice(0, 17) + "…" : name`), applied to the display name; `title` attr keeps the full path for hover.
- **Why**: exact character budget as requested; CSS `20ch` is font-dependent and imprecise.

## Risks / Trade-offs

- **Untagged enum ambiguity** → serde tries `String` first, then the object; a path that happens to look like an object is impossible (paths are strings). Low risk.
- **Menu items lose the one-click delete affordance** → popconfirms still confirm on click; deletion requires two interactions (open menu, click item, confirm). Accepted: it's the requested UX trade for a cleaner tree.
- **Sort reordering on every favorite toggle** → tree remounts via the existing `key={paths.join("|")}`; favorite toggling re-sorts, which may visibly move rows. Expected behavior, not a bug.
- **Clipboard plugin surface** → write-only permission granted; read is not enabled (least privilege).
- **CleanupModal consistency** → it reads `project.name`; must switch to the display-name helper or favorites/renames won't show there.

## Migration Plan

1. Deploy the change. Existing `projects.json` (string array) deserializes as `ProjectEntry::String` entries; first save rewrites the file as structured entries. No data loss.
2. Rollback: revert the serde type to `Vec<String>`; the structured file from a new-version run would fail to load as strings → degrades to empty list. Acceptable for a pre-1.0 app; alternatively keep a tolerant parser.
