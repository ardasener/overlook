## 1. Rust workspace module

- [x] 1.1 Add `dirs` to `Cargo.toml`; create `src-tauri/src/modules/workspace/mod.rs` with `ProjectInfo`/`WorktreeInfo` serde types and command stubs
- [x] 1.2 Implement project config persistence (`projects.json` under `dirs::config_dir()/overlook`): read, write, canonicalize paths
- [x] 1.3 Implement path hashing (FNV-1a 64-bit, hex) and branch-name sanitization (`/` and path-hostile chars → `-`); unit tests for both
- [x] 1.4 Implement git helpers (system `git` via `Command`): detect repo (`rev-parse --is-inside-work-tree`), current branch (`branch --show-current`), branch exists (`rev-parse --verify refs/heads/<b>`), worktree add (new branch / existing branch variants), `worktree prune`
- [x] 1.5 Implement `workspace_list`: config → per-project: existence check, git detect, default branch, cache scan for `overlook-<hash>-*` dirs, per-worktree branch resolution, prune vanished dirs + `git worktree prune`
- [x] 1.6 Implement `workspace_add_project` (validate dir, persist, return ProjectInfo), `workspace_remove_project` (untrack only), `workspace_branch_exists`, `workspace_fork(project, branch, allow_existing)` (run in the default worktree, create/attach branch, return WorktreeInfo)
- [x] 1.7 Register all workspace commands in `lib.rs`; verify `cargo clippy` and `cargo test` pass (hash/sanitize tests)

## 2. Per-worktree layout refactor

- [x] 2.1 Refactor `TerminalLayoutContext`: `layouts: Record<worktreePath, WorktreeLayout>` + `activeWorktree`; `WorktreeLayout` = existing LayoutState fields; all actions scoped to the active layout; `TerminalTab` gains `worktree: string`
- [x] 2.2 Fresh-worktree default layout (one tab); activation of a worktree with no layout creates it; `setActiveWorktree(path)` action
- [x] 2.3 `SplitLayout`: render hosts for ALL tabs across worktrees; visibility = tab's worktree is active AND in a slot; tab bar renders the active worktree's tabs
- [x] 2.4 `TerminalHost`: spawn session with `cwd = tab.worktree`
- [x] 2.5 Verify `pnpm check-types` and `pnpm lint` pass

## 3. Workspace sidebar UI

- [x] 3.1 Create `src/workspace/WorkspaceContext.tsx`: fetch `workspace_list` on mount, expose `projects`, `activeWorktree`, search query, and actions (add/remove/fork/setActive/refresh); refresh after mutations
- [x] 3.2 Rebuild `WorkspaceSidebar`: search input + `+` button; tree with projects (default worktree + managed worktrees), branch names as labels, active-worktree highlight, `−` per project, fork button per git project
- [x] 3.3 Search filtering per D8 (project-path match → all worktrees; branch match → only matching)
- [x] 3.4 Add-project popover (path input, inline error, submit) and remove-confirm popover
- [x] 3.5 Fork popover (branch input → branch-exists check → inline confirm → fork → refresh + activate new worktree)
- [x] 3.6 Wire `activeWorktree` between `WorkspaceContext` and `TerminalLayoutContext` (App.tsx); sidebar click → `setActiveWorktree`
- [x] 3.7 Verify `pnpm check-types` and `pnpm lint` pass

## 4. Verification

- [x] 4.1 `cargo clippy --all-targets -- -D warnings` and `cargo test` (hash/sanitize) pass
- [x] 4.2 `pnpm check-types` and `pnpm lint` pass
- [x] 4.3 Manual: add a git project → tree shows default worktree + branch; add a non-git project → default worktree only, no fork button
- [x] 4.4 Manual: click worktrees → layouts switch, sessions keep running, switch back restores tabs/splits; new terminals spawn in the worktree directory (`pwd`)
- [x] 4.5 Manual: fork a new branch → worktree appears in cache, becomes active, terminal opens in it; fork an existing branch → confirm flow
- [x] 4.6 Manual: search by project path (all worktrees shown) and by branch name (only matching); add invalid path → error; remove project with confirm → untracked, cache worktrees remain
- [x] 4.7 Manual: restart → projects persist, layouts reset to a single tab in the first project's default worktree
