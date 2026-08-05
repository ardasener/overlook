## Why

Two workspace-management defects:

1. **Removed projects resurrect.** `workspace_remove_project` canonicalizes the input path but compares it against raw stored paths. On macOS `/tmp` is a symlink to `/private/tmp`, so a project stored as `/tmp/ol-test-repo` never matches its canonical form `/private/tmp/ol-test-repo` — removal silently no-ops while the frontend hides it locally. The next `refresh()` (e.g. after forking a worktree) reloads the stale entry and the project comes back.
2. **Worktrees cannot be deleted individually.** The only way to remove a managed worktree is to delete the whole project. Users should be able to delete a worktree while keeping the project.

## What Changes

- `projects::remove_project` compares canonical forms on both sides so symlinked paths are removed correctly.
- A delete button appears on non-default worktree rows. Clean worktrees remove immediately; dirty ones prompt with Force remove / Cancel.
- Two new Rust commands: `workspace_worktree_is_dirty` and `workspace_remove_worktree` (validates the path lives under the app cache with the project's prefix, runs `git worktree remove [--force]`, and cleans up the orphaned cache directory).

## Capabilities

### New Capabilities
- `worktree-deletion`: Delete a managed worktree without removing the project (with dirty-tree force handling).

### Modified Capabilities
- `workspace-management`: Project removal now reliably removes symlinked paths (canonical-form comparison).

## Impact

- `src-tauri/src/modules/workspace/projects.rs`: canonical-form comparison in `remove_project`.
- `src-tauri/src/modules/workspace/worktrees.rs`: `is_dirty` + `remove_worktree` helpers.
- `src-tauri/src/modules/workspace/mod.rs`: two new commands + registration in `lib.rs`.
- `src/components/WorkspaceSidebar.tsx`: delete button on non-default worktree rows; dirty confirm popover; `refresh()` after removal.
- `src/workspace/WorkspaceContext.tsx`: `worktreeIsDirty` + `removeWorktree` wrappers.
- No capability file changes (same window, existing command patterns).
