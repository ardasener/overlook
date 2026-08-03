## Context

The sidebar is a placeholder AntD tree; the terminal layout is a single global `LayoutState` in `TerminalLayoutContext`; `pty_open` already accepts a `cwd` but the frontend passes `null`. The backend has no git or filesystem state beyond the PTY sessions. This change delivers the core product feature: projects → worktrees → terminals bound to directories.

Established patterns this builds on:
- **Two-process boundary**: Rust owns all FS/git/process access; webview talks via `invoke`.
- **Hosts outlive panels** (terminal-layout D1): every tab's `TerminalHost` stays mounted and CSS-positioned, so PTY sessions survive visibility changes. This extends naturally to per-worktree layouts.
- **Tab drag, zoom, auto-titles** (`tab-interactions`): all operate per tab; they survive the layout refactor unchanged in spirit.

## Goals / Non-Goals

**Goals:**
- A live project/worktree tree with search, add/remove, and fork.
- Managed worktrees in the platform cache dir, named `overlook-<hash>-<branch>`, discovered by scan (adopts externally-created ones) and pruned.
- Selecting a worktree makes it active; new terminals spawn in its directory.
- Per-worktree tabs/splits preserved within the session; switching worktrees swaps the layout without killing sessions.
- Fork from the default worktree's HEAD, with existing-branch confirmation.

**Non-Goals:**
- Persisting tab/layouts across app restarts (only the project list persists).
- Deleting worktrees (removing a project untracks it only; worktrees may hold uncommitted work).
- Native directory-picker dialog (path-input popover for now; a picker is a future enhancement).
- Deleting/pruning worktrees by the user in this change.
- Windows/WSL support.
- `git2`/libgit2 — system `git` binary only.

## Decisions

### D1: Backend owns everything filesystem/git; system `git` binary

New `src-tauri/src/modules/workspace/` with `dirs` for platform dirs:
- `dirs::cache_dir()/overlook` → worktrees (Linux `~/.cache/overlook`, macOS `~/Library/Caches/overlook`).
- `dirs::config_dir()/overlook/projects.json` → `["/abs/path", …]`.
- Git operations run the system `git` binary via `std::process::Command` (leaning on the already-required `git` presence for the feature; no libgit2 dependency).

### D2: Worktree naming & hashing

`overlook-<hash>-<branch>` where `<hash>` = FNV-1a 64-bit of the project's canonical absolute path, hex (stable across platforms/versions, dependency-free, ~10 lines). The hash is backend-only — the UI never shows it.

Branch names are **sanitized for the filesystem** when forming the directory name (`/` and other path-hostile characters → `-`), because branches like `feat/x` would otherwise create subdirectories. The **displayed branch name is read back from git** (`git -C <dir> branch --show-current`), never parsed from the directory name — the dir name is just a stable location.

### D3: Discovery by cache scan + prune

`workspace_list`:
1. Read `projects.json`.
2. For each project: verify the directory exists (drop if gone); detect git (`git -C <path> rev-parse --is-inside-work-tree`); get the default worktree's branch (`git -C <path> branch --show-current`); scan `cache_dir/overlook` for entries whose name starts with `overlook-<hash-of-this-project>-` → these are managed worktrees; resolve each one's branch via git; prune entries whose directory vanished (and `git worktree prune` to clean git metadata).
3. Adopts worktrees created by another app instance / externally, as long as the name matches a known project's hash prefix.

### D4: Per-worktree session layouts (the core refactor)

`TerminalLayoutContext` changes shape:

```ts
interface WorktreeLayout {
  tabs: TerminalTab[];          // each tab carries its worktree path
  slots: (string | null)[];     // slot → tab id (the existing model)
  focusedSlot: number;
  vertical: boolean;
  bottom: boolean;
}
// context state:
layouts: Record<worktreePath, WorktreeLayout>
activeWorktree: worktreePath | null
```

- **All tabs across all worktrees stay mounted** in `SplitLayout`; a tab is visible when its worktree is the active one AND it sits in a slot of that layout. Hosts for inactive worktrees get the `host-hidden` treatment (session alive, CSS-hidden).
- The **tab bar renders the active worktree's tabs**; the split controls apply to the active layout.
- All existing actions (`newTab`, `closeTab`, `selectTab`, `dropTabOnSlot`, `zoomTab`, `renameTab`, split toggles) operate on the active worktree's layout. Tabs are looked up globally (their id is unique) but mutate their owning layout.
- **Fresh worktree** (first activation): a new `WorktreeLayout` with one tab (spawns a shell in that worktree's directory). Session-only: nothing persists across restarts; on relaunch the first project's default worktree is active with one tab.

### D5: Terminal cwd binding

`TerminalTab` gains `worktree: string` (its worktree's directory path). `TerminalHost` spawns its session with `ptyOpen(cwd = tab.worktree, …)` instead of `null`. Terminal titles (process-based), zoom, drag, and dimming are unchanged.

### D6: Fork flow

1. Fork button (per git project) opens a popover with a branch-name input.
2. Submit → `workspace_branch_exists(project, branch)`.
3. Branch exists → inline confirm ("Branch already exists — attach the new worktree to it?"); continue → fork with `allow_existing: true`; cancel → abort.
4. Branch new → fork with `allow_existing: false`.
5. `workspace_fork(project, branch, allow_existing)` runs **in the default worktree** (cwd = project path, so the new branch forks from its HEAD):
   - new branch: `git worktree add -b <branch> <cache_dir/overlook-<hash>-<sanitized>>`
   - existing: `git worktree add <dir> <branch>`
6. On success: refresh the tree, set the new worktree **active** (fresh layout → terminal spawns there).

### D7: Remove project = untrack only

`workspace_remove_project` removes the path from `projects.json` only. Its cache worktrees remain (possibly with uncommitted work); they are simply no longer listed. Confirmation is a frontend popover.

### D8: Search semantics

Live, case-insensitive substring over:
- **Project path matches** → show the project with all its worktrees.
- **Branch name matches** → show the project with only the matching worktrees.
- Neither → hidden. Empty query → everything.

### D9: Add project

`+` opens a popover with a path input; submit → `workspace_add_project(path)` validates it exists and is a directory, adds to `projects.json`, refreshes. Invalid paths surface an inline error.

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Layout refactor breaks tab/zoom/drag behavior | Actions preserved 1:1, now scoped to the active layout; `tab-interactions` behaviors are per-tab and unchanged |
| Many worktrees → many mounted hosts (hidden) | Same economics as parked tabs today; sessions are cheap; revisit if counts grow |
| Sanitized branch dir names collide | Sanitization maps distinct branch names to distinct dir suffixes (`/`→`-`); hash prefix scopes per project |
| `git` not installed | Git is a hard requirement of the feature; errors surface in the UI on fork/list |
| Search over large project lists | Client-side filtering over an in-memory list; fine at this scale |
| Orphaned worktrees after project removal | Accepted (D7); worktrees are never deleted |

## Open Questions

None — the exploration settled cache location, flat layout, removal semantics (untrack only), titles (unchanged), fork source (default worktree), and discovery/pruning.
