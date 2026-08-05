## Context

`projects::remove_project` (projects.rs) canonicalizes the input and `retain`s entries that differ from the canonical form — but the stored entries are raw, so a stored `/tmp/...` path never equals its canonical `/private/tmp/...`. `worktrees.rs` has discovery/creation helpers but nothing for removal. Worktree tree rows (`w:<path>` keys) currently render as plain titles with no actions.

## Goals / Non-Goals

**Goals:**
- Fix project removal for symlinked paths.
- Add per-worktree deletion with a dirty-tree force-confirm flow.

**Non-Goals:**
- Deleting the default worktree as a worktree (that stays project removal).
- Deleting the underlying git branch (the worktree's branch stays in the repo).
- Confirming clean removals (dirty-only prompt, per decision).

## Decisions

### Canonical-form comparison in `remove_project`
Compare each stored entry's canonical form against the input's canonical form during `retain`; fall back to the raw comparison when canonicalization fails.
- **Why**: removes the symlink mismatch while staying resilient if a stored dir vanished.
- **Implementation**: `projects.retain(|p| canonicalize_matches(p, &canonical) == false)` where the helper canonicalizes `p` (falling back to `p` itself on error) and compares.

### Two commands: `workspace_worktree_is_dirty` + `workspace_remove_worktree`
The frontend first asks `is_dirty`; only when dirty does it show the confirm. `remove_worktree(project, worktree_path, force)` validates the path, runs `git worktree remove [--force]`, and removes the cache dir.
- **Why**: avoids error-string matching on the frontend (`git worktree remove` fails with a human string we shouldn't parse); keeps the force decision explicit.

### Path validation in `remove_worktree`
Reject unless `worktree_path` is inside `cache_dir()` AND its dir name starts with `worktree_prefix(project)`.
- **Why**: the command accepts a path string; never let it touch anything outside the app's cache for that project.
- **Note**: `discover_worktrees` uses `<cache>/overlook-<hash>-<branch>/<project_name>`, so the check is: parent dir name has the prefix, path is under the cache.

### Cache dir cleanup
After a successful `git worktree remove`, delete the worktree's cache parent dir (`<cache>/overlook-<hash>-<branch>`).
- **Why**: the app's sidecar layout; git's own metadata is pruned by `git worktree remove`.

### Frontend: trash button on non-default worktrees
Worktree title nodes get a `DeleteOutlined` button (matching project action styling). Click → `worktreeIsDirty`: clean → `removeWorktree(force=false)` + `refresh()`; dirty → Popconfirm with Force remove / Cancel. Default worktrees (`wt.isDefault`) render no button.
- **Why**: matches existing project-row action patterns; the dirty prompt is the only confirm (clean removal is deliberate and low-stakes).

## Risks / Trade-offs

- [`--force` discards uncommitted changes] → gated behind an explicit user confirm; Cancel is the default path.
- [Canonicalize of a vanished stored dir fails] → helper falls back to the raw path, preserving current behavior for that edge.
- [Branch stays behind after worktree removal] → intended; deleting branches is out of scope.
- [Cache dir might hold the project folder only] → the layout is one checkout per `<hash>-<branch>` dir, so removing the parent is safe; re-discovered worktrees rebuild it.

## Migration Plan

Backend + frontend in one cycle; no data migration (existing `projects.json` keeps working — removals now succeed). Rollback: revert the projects.rs comparison and the two new commands.
