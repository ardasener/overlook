//! Managed worktree mechanics: hashing/naming, the platform cache directory,
//! system-`git` operations, and cache-scan discovery.

use std::fs;
use std::path::{Path, PathBuf};

/// FNV-1a 64-bit hash of a project's absolute path, hex. Stable across
/// platforms and Rust versions (unlike `DefaultHasher`); backend-only.
pub fn path_hash(project_path: &str) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for b in project_path.as_bytes() {
        hash ^= *b as u64;
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    format!("{hash:016x}")
}

/// Map a branch name onto the filesystem: path-hostile characters (notably
/// `/` in `feat/x`) become `-` so the worktree is a single directory.
pub fn sanitize_branch(branch: &str) -> String {
    let mut out = String::with_capacity(branch.len());
    for c in branch.chars() {
        if c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.') {
            out.push(c);
        } else {
            out.push('-');
        }
    }
    out
}

/// Directory name for a managed worktree of a project on a branch.
pub fn worktree_dir_name(project_path: &str, branch: &str) -> String {
    format!("overlook-{}-{}", path_hash(project_path), sanitize_branch(branch))
}

/// The actual git checkout for a managed worktree: the cache holds
/// `<cache>/overlook-<hash>-<branch>/<project_name>`, so the checkout root
/// retains the project's folder name (tooling that keys on the folder name
/// keeps working inside worktrees).
pub fn worktree_checkout_path(
    cache: &Path,
    project_path: &str,
    branch: &str,
    project_name: &str,
) -> PathBuf {
    cache
        .join(worktree_dir_name(project_path, branch))
        .join(project_name)
}

/// Name prefix that identifies a project's managed worktrees in the cache.
pub fn worktree_prefix(project_path: &str) -> String {
    format!("overlook-{}-", path_hash(project_path))
}

/// `{cache_dir}/overlook` — where managed worktrees live.
pub fn cache_dir() -> Option<PathBuf> {
    dirs::cache_dir().map(|d| d.join("overlook"))
}

// ── System git ─────────────────────────────────────────────────────────────

fn git(args: &[&str], cwd: &Path) -> Result<String, String> {
    let out = std::process::Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| format!("git: {e}"))?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
        return Err(if err.is_empty() {
            "git command failed".to_string()
        } else {
            err
        });
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

pub fn is_git_repo(dir: &Path) -> bool {
    git(&["rev-parse", "--is-inside-work-tree"], dir)
        .map(|r| r == "true")
        .unwrap_or(false)
}

pub fn current_branch(dir: &Path) -> Option<String> {
    git(&["branch", "--show-current"], dir)
        .ok()
        .filter(|s| !s.is_empty())
}

pub fn branch_exists(project: &Path, branch: &str) -> bool {
    git(&["rev-parse", "--verify", "--quiet", &format!("refs/heads/{branch}")], project).is_ok()
}

/// Add a managed worktree. `existing` attaches an already-existing branch;
/// otherwise a new branch is created from the project's HEAD.
pub fn add_worktree(project: &Path, branch: &str, dir: &Path, existing: bool) -> Result<(), String> {
    let dir_str = dir.to_str().ok_or("worktree path is not valid UTF-8")?;
    if existing {
        git(&["worktree", "add", dir_str, branch], project)?;
    } else {
        git(&["worktree", "add", "-b", branch, dir_str], project)?;
    }
    Ok(())
}

/// Clean stale worktree metadata for a project.
pub fn prune_worktrees(project: &Path) {
    let _ = git(&["worktree", "prune"], project);
}

/// Whether a worktree checkout has uncommitted changes (non-empty porcelain
/// status). Untracked files count as dirty.
pub fn is_dirty(dir: &Path) -> bool {
    git(&["status", "--porcelain"], dir)
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
}

/// Remove a managed worktree: `git worktree remove [--force]` then delete the
/// app's cache sidecar dir. Validates that `dir` lives under the cache with
/// the project's prefix so the command can never touch arbitrary paths.
pub fn remove_worktree(project: &Path, dir: &Path, force: bool) -> Result<(), String> {
    let Some(cache) = cache_dir() else {
        return Err("no cache directory available".to_string());
    };
    let dir_str = dir.to_str().ok_or("worktree path is not valid UTF-8")?;
    // The checkout is `<cache>/overlook-<hash>-<branch>/<project_name>`; the
    // dir's PARENT must be inside the cache and carry the project's prefix.
    let parent = dir.parent().ok_or("worktree path has no parent")?;
    if !parent.starts_with(&cache) {
        return Err("worktree is not under the app cache".to_string());
    }
    let parent_name = parent.file_name().and_then(|n| n.to_str()).unwrap_or("");
    let prefix = worktree_prefix(project.to_str().ok_or("project path is not UTF-8")?);
    if !parent_name.starts_with(&prefix) {
        return Err("worktree does not belong to this project".to_string());
    }

    if force {
        git(&["worktree", "remove", "--force", dir_str], project)?;
    } else {
        git(&["worktree", "remove", dir_str], project)?;
    }
    // Remove the now-orphaned cache sidecar dir (git pruned its own metadata).
    fs::remove_dir_all(parent).map_err(|e| e.to_string())
}

// ── Discovery ──────────────────────────────────────────────────────────────

/// A managed worktree found by scanning the cache directory.
pub struct DiscoveredWorktree {
    pub dir: PathBuf,
    pub branch: Option<String>,
}

/// Scan the cache for a project's managed worktrees (`overlook-<hash>-*`).
/// Each checkout lives at `<outer>/<project_name>`; only existing checkouts
/// are returned (vanished ones are pruned by omission, and `git worktree
/// prune` clears their metadata). Adopts worktrees created by another app
/// instance or externally.
pub fn discover_worktrees(project_path: &str, project_name: &str) -> Vec<DiscoveredWorktree> {
    let Some(cache) = cache_dir() else {
        return Vec::new();
    };
    let Ok(entries) = fs::read_dir(&cache) else {
        return Vec::new();
    };
    let prefix = worktree_prefix(project_path);
    let mut found = Vec::new();
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.starts_with(&prefix) {
            let checkout = entry.path().join(project_name);
            if checkout.is_dir() {
                let branch = current_branch(&checkout);
                found.push(DiscoveredWorktree { dir: checkout, branch });
            }
        }
    }
    found
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn path_hash_is_deterministic() {
        let a = path_hash("/Users/me/projects/foo");
        let b = path_hash("/Users/me/projects/foo");
        let c = path_hash("/Users/me/projects/bar");
        assert_eq!(a, b);
        assert_ne!(a, c);
        assert_eq!(a.len(), 16, "16 hex chars");
    }

    #[test]
    fn sanitize_branch_handles_paths() {
        assert_eq!(sanitize_branch("main"), "main");
        assert_eq!(sanitize_branch("feat/x"), "feat-x");
        assert_eq!(sanitize_branch("feat/hello-world"), "feat-hello-world");
        assert_eq!(sanitize_branch("a b:c"), "a-b-c");
    }

    #[test]
    fn worktree_dir_name_is_prefixed() {
        let hash = path_hash("/tmp/demo");
        let name = worktree_dir_name("/tmp/demo", "feat/x");
        assert_eq!(name, format!("overlook-{hash}-feat-x"));
        assert!(name.starts_with(&worktree_prefix("/tmp/demo")));
        assert!(!worktree_prefix("/tmp/demo").is_empty());
    }

    #[test]
    fn is_dirty_detects_uncommitted_changes() {
        let tmp = std::env::temp_dir().join(format!("ol-dirty-{}", std::process::id()));
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();
        let _ = git(&["init", "-b", "main"], &tmp);
        // A brand-new repo with no commits has an empty porcelain status.
        assert!(!is_dirty(&tmp));
        fs::write(tmp.join("untracked.txt"), "x").unwrap();
        assert!(is_dirty(&tmp), "untracked files count as dirty");
        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn remove_worktree_rejects_out_of_cache_paths() {
        let tmp = std::env::temp_dir().join(format!("ol-outcache-{}", std::process::id()));
        let _ = fs::remove_dir_all(&tmp);
        fs::create_dir_all(&tmp).unwrap();
        let err = remove_worktree(&tmp, &tmp, false).unwrap_err();
        assert!(err.contains("not under the app cache"), "got: {err}");
        let _ = fs::remove_dir_all(&tmp);
    }
}
