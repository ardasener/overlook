## Context

`TerminalLayoutContext` holds `layouts: Record<worktreePath, WorktreeLayout>` — every worktree with open terminals has a live entry (tabs + slots). `closeTab(tabId)` exists but there's no bulk close. `WorkspaceContext` provides `projects` with `worktrees` (each has `path`, `isDefault`, `branch`). The sidebar renders a tree from these; the cleanup modal reuses that data. `workspace_remove_worktree` (Rust) validates the path is under the cache with the project prefix before `git worktree remove` + cache-dir cleanup — so project roots are rejected by construction. The tab bar has a right action group (`.tabbar-actions`) and on macOS the container has `paddingLeft: 80` for traffic lights.

## Goals / Non-Goals

**Goals:**
- Bulk close terminals across selected worktrees.
- Bulk delete selected cache worktrees (with confirmation).
- macOS left action group placement for the new button.
- Default worktrees are never removed by this feature.

**Non-Goals:**
- Removing projects (stays in the sidebar via trash icons).
- Persisting selection or any state.
- Per-worktree access timestamps (the earlier filter-based design is dropped — the user chose checkboxes).
- Rust changes (reuses `workspace_remove_worktree`).

## Decisions

### Cleanup button placement
A left action group `.tabbar-actions-left` (workspace toggle, settings, cleanup — in that order) rendered before the tab strip on ALL platforms. On macOS, the existing `paddingLeft: 80` on the tab bar container already reserves the traffic-light space before the group.
- **Why**: matches the clarified layout; the macOS padding already exists, so only the group order/location changes on non-macOS (moving these three buttons out of the right group).

### Modal: checkbox tree
`CleanupModal` builds `TreeDataNode`s from `projects` (same shape as the sidebar): project nodes (non-checkable, for grouping) with worktree children each carrying a checkbox. Checkbox state is local to the modal (a `Set<string>` of checked worktree paths). Default: all worktrees except the active one. Select-all/none buttons operate on selectable worktrees.
- **Why**: AntD `Tree` with `checkable` gives the hierarchy + checkboxes for free; local state keeps the modal self-contained.

### Active worktree excluded + disabled
The active worktree is not checked by default and its checkbox is disabled. Select-all skips it.
- **Why**: never kill/delete the session in use.

### Close terminals
`closeWorktreeTabs(path)` added to `TerminalLayoutContext`: removes the worktree's layout from `layouts`, which unmounts every host and runs each tab's cleanup (session kill via the existing unmount path). Applied to every checked worktree.
- **Why**: reuses the existing teardown; no new session logic.

### Delete
For each checked worktree: close its terminals (as above), then if `!isDefault`, call the existing `removeWorktree` from `WorkspaceContext` (which invokes `workspace_remove_worktree` and refreshes). Default worktrees are skipped for the removal step. Confirmation via AntD `Modal.confirm` before running.
- **Why**: reuses the validated Rust command; default worktrees can't be deleted even if a caller misbehaves.

### Disclaimer
A short message above the action buttons: deletion is not recoverable; project directories are never removed — remove projects via the sidebar trash icons.
- **Why**: the user explicitly requested this wording.

## Risks / Trade-offs

- [Closing the active worktree is prevented] → active checkbox disabled; intentional.
- [Delete of a worktree with uncommitted changes fails] → `workspace_remove_worktree` with `force=false` errors; surfaced via `message.error` and that worktree stays. Acceptable (user can force-remove manually).
- [Bulk close unmounts many hosts at once] → each host's cleanup is per-tab; React batches; fine for typical counts.

## Migration Plan

Frontend-only; no data migration. Rollback: remove the modal + button + layout/context helpers.
