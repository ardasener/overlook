## 1. Layout context: bulk close

- [x] 1.1 Add `closeWorktreeTabs(path: string): void` to `TerminalLayoutContext` — removes the worktree's layout from `layouts` (unmounting hosts and killing their sessions)
- [x] 1.2 Expose it in the context interface + value

## 2. Workspace context: deletion helper

- [x] 2.1 Ensure `removeWorktree(project, path, force)` is already exposed (added in worktree-deletion); no change expected, verify signature

## 3. Cleanup modal

- [x] 3.1 Create `src/components/CleanupModal.tsx`: checkbox tree from `projects` (project group nodes non-checkable, worktree children checkable), active worktree checked-disabled, default = all checked except active
- [x] 3.2 Select-all / select-none buttons (skip the active worktree)
- [x] 3.3 "Close terminals" button → `closeWorktreeTabs` for each checked worktree, close modal
- [x] 3.4 "Delete" button → `Modal.confirm` with the disclaimer, then close + remove checked non-default worktrees via `removeWorktree`, refresh
- [x] 3.5 Disclaimer message above the buttons: deletion not recoverable; project directories never removed (use sidebar trash icons to remove projects)
- [x] 3.6 Style the modal in `SettingsModal.css` or a new `CleanupModal.css`

## 4. Tab bar button + placement

- [x] 4.1 Add the cleanup button (`ClearOutlined` or similar) to `TerminalTabBar`
- [x] 4.2 Move the workspace toggle, settings, and cleanup into a left `.tabbar-actions-left` group before the tab strip (all platforms, in that order); macOS keeps its traffic-light padding before the group
- [x] 4.3 Remove those three buttons from the right `.tabbar-actions` group
- [x] 4.4 Wire the button to open the modal; add `.tabbar-actions-left` CSS

## 5. App shell wiring

- [x] 5.1 Hold `cleanupOpen` state in `AppShell`; render `CleanupModal`; pass the opener to `TerminalTabBar`

## 6. Verification

- [x] 6.1 `bun check-types` and `bun lint` pass
- [x] 6.2 Manual: open terminals in several worktrees; cleanup modal lists them (defaults checked except active, active disabled); Close terminals clears them and keeps everything; Delete (after confirm) removes cache worktrees and never touches default worktrees or project directories; the left action group (workspace toggle, settings, cleanup) sits before the tab strip on all platforms, with macOS traffic-light space before it
