## 1. Fix project removal for symlinked paths

- [x] 1.1 In `projects.rs`, update `remove_project` to canonicalize each stored entry (falling back to the raw path) and compare against the input's canonical form during `retain`
- [x] 1.2 Add a Rust unit test: removing a project whose stored path is the non-canonical (symlinked) form of the input removes it

## 2. Worktree removal helpers

- [x] 2.1 In `worktrees.rs`, add `is_dirty(dir)` running `git status --porcelain` (non-empty output = dirty)
- [x] 2.2 Add `remove_worktree(project, dir, force)`: validate `dir` is under the cache with the project's prefix, run `git worktree remove [--force]`, then remove the cache parent dir
- [x] 2.3 Unit tests: `is_dirty` on a clean repo is false; path validation rejects out-of-cache paths

## 3. Commands + registration

- [x] 3.1 Add `workspace_worktree_is_dirty(project, worktree_path) -> Result<bool, String>` in `mod.rs`
- [x] 3.2 Add `workspace_remove_worktree(project, worktree_path, force) -> Result<(), String>` in `mod.rs`
- [x] 3.3 Register both in the `generate_handler!` list in `lib.rs`

## 4. Frontend

- [x] 4.1 In `WorkspaceContext.tsx`, add `worktreeIsDirty` and `removeWorktree` wrappers (with `refresh()` after removal)
- [x] 4.2 In `WorkspaceSidebar.tsx`, add a `DeleteOutlined` button to non-default worktree titles; click → dirty check → immediate remove or Force/Cancel Popconfirm
- [x] 4.3 Ensure the button's `onMouseDown` stops propagation so it doesn't select/activate the worktree

## 5. Verification

- [x] 5.1 `bun check-types` and `bun lint` pass; `cargo test` and `cargo clippy --all-targets -- -D warnings` pass
- [x] 5.2 Manual: removing a project whose path resolves through a symlink stays removed after a fork-triggered refresh; deleting a clean worktree removes it and refreshes; deleting a dirty worktree prompts and Force removes; the default worktree shows no delete button
