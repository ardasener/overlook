## 1. Rust persistence schema

- [x] 1.1 Change `projects.rs` from `Vec<String>` to `Vec<ProjectEntry>` with `#[serde(untagged)]` `String | ProjectEntry`; `ProjectEntry { path, favorite: bool, display_name: Option<String> }`
- [x] 1.2 Update `load_projects`/`add_project`/`remove_project`/`save_projects` for the new type; keep the legacy-dir migration working
- [x] 1.3 Add `favorite: bool` + `display_name: Option<String>` to `ProjectInfo` in `workspace/mod.rs`, populated from the stored entries
- [x] 1.4 Add commands `workspace_set_project_favorite(path, favorite)` and `workspace_rename_project(path, display_name)` (empty string clears), persisting through `projects.rs`
- [x] 1.5 Register the two new commands in `lib.rs`
- [x] 1.6 Update/add Rust tests: legacy string file loads, structured round-trip, favorite+rename commands

## 2. Clipboard plugin

- [x] 2.1 Add `tauri-plugin-clipboard-manager = "2"` to `Cargo.toml` and `@tauri-apps/plugin-clipboard-manager` to `package.json`
- [x] 2.2 Register `.plugin(tauri_plugin_clipboard_manager::init())` in `lib.rs`
- [x] 2.3 Add `clipboard-manager:allow-write-text` to `capabilities/default.json`

## 3. Frontend context + sorting

- [x] 3.1 Update `WorkspaceContext.tsx`: `ProjectInfo` gains `favorite`/`displayName`; `filtered` sorts favorites-first then alphabetical by display name
- [x] 3.2 Add `setProjectFavorite(path, favorite)` and `renameProject(path, displayName)` helpers to the context; add `copyPathToClipboard(path)` using the clipboard plugin
- [x] 3.3 Add a `truncateName` helper (20 chars, 17 + `…`)

## 4. WorkspaceSidebar UI

- [x] 4.1 Replace inline fork/remove/delete buttons with an AntD `Dropdown trigger="contextMenu"` on project rows (Fork…, Rename…, Copy path, Remove) and worktree rows (Copy path, Delete for non-default)
- [x] 4.2 Add the star toggle button (`StarOutlined` ↔ `StarFilled`) to project rows
- [x] 4.3 Convert the fork popover into a modal reusing the branch-name + branch-exists logic
- [x] 4.4 Add the rename modal (prefilled with current display name; empty clears)
- [x] 4.5 Apply `truncateName` to project display names with `title` showing the full path
- [x] 4.6 Update `CleanupModal.tsx` to use the display name

## 5. Verification

- [x] 5.1 `bun check-types`, `bun run build`, `cargo test`, `cargo clippy --all-targets -- -D warnings`
- [x] 5.2 Manual: star a project → moves above non-favorites alphabetically; restart → still favorited
- [x] 5.3 Manual: rename a project → tree + cleanup modal show the name; clear → basename; long name truncates at 20 chars with `…` and hover shows full path
- [x] 5.4 Manual: right-click project → fork modal works (incl. branch-exists confirm), copy path pastes full path, remove confirms; right-click worktree → copy path + delete (non-default only, dirty-check intact)
