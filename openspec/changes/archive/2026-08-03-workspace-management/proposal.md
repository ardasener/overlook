## Why

Workspace management is Overlook's core feature — the sidebar is currently a static placeholder and terminals all spawn in the process directory. This change makes the sidebar a real project/worktree manager and binds terminals to worktrees: each project (a directory) gets a tree entry with a default worktree (the directory itself) plus git worktrees managed by the app in its platform cache dir. Selecting a worktree makes it the active workspace: all terminals spawn there, and each worktree keeps its own tabs/split layout within the session, so the user can work across projects simultaneously.

## What Changes

- **Project/worktree tree** — the placeholder `WorkspaceSidebar` becomes a live tree: projects at the top level, worktrees nested, each project with a default worktree (the directory itself, also used for non-git projects).
- **Search + actions** — a live search bar filters by project path (shows the project with all its worktrees) or branch name (shows the project with only matching worktrees); a `+` adds a project (path input popover with validation); a `−` per project removes it (confirm popover, untracks only — cache worktrees are left in place); a fork button per git project creates worktrees.
- **Worktree management (Rust)** — managed worktrees live flat in the platform cache dir (`dirs::cache_dir()/overlook`) named `overlook-<project-path-hash>-<branch>`. Discovery scans the cache (adopting externally-created matching dirs), prunes vanished entries and runs `git worktree prune`. Fork creates the branch from the **default worktree's HEAD**: `git worktree add -b <branch> <dir>`, or attaches an existing branch when the user confirms.
- **Per-worktree session layouts** — `TerminalLayoutContext` becomes a map of worktree → layout (tabs, splits, focus). All tabs across all worktrees stay mounted (live PTY sessions persist); visibility = active worktree + in a slot. Switching worktrees swaps the tab bar and panes; switching back restores the exact layout. Session-only (no tab/layout persistence across restarts).
- **Terminal cwd binding** — each tab carries its worktree path; `pty_open(cwd)` spawns every new shell in its worktree's directory (the cwd plumbing already exists).
- **New dependency**: `dirs` crate (platform cache/config dirs).

## Capabilities

### New Capabilities
- `workspace-management`: Project/worktree tree with live search, add/remove project, worktree forking, active-worktree selection, and per-worktree session layouts bound to worktree directories.

### Modified Capabilities
<!-- None — terminal-layout behaviors (tabs, parking, splits) are preserved, now scoped per worktree. -->

## Impact

- **New code**: `src-tauri/src/modules/workspace/` (projects config, worktree scan/git, hash), `src/workspace/` (frontend context), real `WorkspaceSidebar`.
- **Modified code**: `TerminalLayoutContext` (per-worktree layouts), `TerminalHost` (cwd binding), `TerminalTabBar` (active-worktree tabs), `SplitLayout` (cross-worktree host visibility), `App.tsx`, `lib.rs` (new commands), `Cargo.toml` (dirs).
- **New dependency**: `dirs` (Rust crate). Git operations use the system `git` binary — no `git2`/libgit2 dependency.
- **None of this is breaking** — single-project users get the same behavior with a project pointing at their directory.
