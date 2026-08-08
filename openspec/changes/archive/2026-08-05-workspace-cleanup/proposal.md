## Why

Long-running sessions accumulate open terminals in many worktrees, holding memory for worktrees that haven't been used in a while. There is no bulk way to reclaim that — each terminal must be closed individually. A cleanup action lets the user close terminals (and optionally remove unused cache worktrees) in one shot.

## What Changes

- The tab bar gains a left action group (workspace toggle, settings, cleanup — in that order) before the tab strip on all platforms; macOS additionally reserves space for the traffic lights before it. A cleanup icon opens the cleanup modal.
- The cleanup icon opens a modal with a checkbox tree of every worktree, mirroring the workspace sidebar (no add/fork/delete buttons). By default all worktrees are checked except the active one.
- The modal offers two actions: **Close terminals** (kills sessions in checked worktrees, keeps everything) and **Delete** (also removes checked cache worktrees via `workspace_remove_worktree`), with a disclaimer that deletion is not recoverable and project directories are never touched.
- Default worktrees (project roots) are never removed by this feature — terminal closure applies, deletion ignores them.
- The active worktree is excluded from the default selection and disabled.

## Capabilities

### New Capabilities
- `workspace-cleanup`: Bulk-close terminals and remove unused cache worktrees from a checkbox modal.

### Modified Capabilities
- `tag-tab-strip`: the tab bar action layout gains the cleanup button (macOS left group).

## Impact

- `src/layout/TerminalLayoutContext.tsx`: expose the per-worktree tab counts and a bulk `closeWorktreeTabs(path)` (clears a worktree's layout, closing all its tabs).
- `src/workspace/WorkspaceContext.tsx`: expose worktrees with their default/cache classification for the tree.
- `src/components/CleanupModal.tsx` (new): checkbox tree, select-all/none, action buttons, disclaimer.
- `src/components/TerminalTabBar.tsx` + CSS: left action group (workspace toggle, settings, cleanup) before the tab strip on all platforms.
- `src/App.tsx`: hold cleanup modal open state.
- No Rust changes (reuses `workspace_remove_worktree`).
