//! Persistence of the tracked project list in the platform config directory
//! (`~/.config/overlook/projects.json` or the OS equivalent).

use std::fs;
use std::path::PathBuf;

/// `{config_dir}/overlook` — the app's config directory.
pub fn config_dir() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("overlook"))
}

fn projects_file() -> Option<PathBuf> {
    config_dir().map(|d| d.join("projects.json"))
}

/// Load the tracked project paths (canonical absolute paths). Missing or
/// corrupt files degrade to an empty list.
pub fn load_projects() -> Vec<String> {
    let Some(file) = projects_file() else {
        return Vec::new();
    };
    let Ok(content) = fs::read_to_string(file) else {
        return Vec::new();
    };
    serde_json::from_str::<Vec<String>>(&content).unwrap_or_default()
}

fn save_projects(projects: &[String]) -> Result<(), String> {
    let Some(file) = projects_file() else {
        return Err("no config directory available".to_string());
    };
    let dir = file.parent().ok_or("invalid config path")?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(projects).map_err(|e| e.to_string())?;
    fs::write(file, content).map_err(|e| e.to_string())
}

/// Validate that `path` is a directory and return its canonical form.
pub fn canonicalize(path: &str) -> Result<String, String> {
    let p = PathBuf::from(path);
    if !p.is_dir() {
        return Err(format!("not a directory: {path}"));
    }
    fs::canonicalize(&p)
        .map(|c| c.to_string_lossy().into_owned())
        .map_err(|e| e.to_string())
}

/// Add a project (deduplicated), persisting the canonical path.
pub fn add_project(path: &str) -> Result<String, String> {
    let canonical = canonicalize(path)?;
    let mut projects = load_projects();
    if !projects.contains(&canonical) {
        projects.push(canonical.clone());
        save_projects(&projects)?;
    }
    Ok(canonical)
}

/// Untrack a project. Its managed worktrees are left on disk.
pub fn remove_project(path: &str) -> Result<(), String> {
    let canonical = canonicalize(path)?;
    let mut projects = load_projects();
    projects.retain(|p| !same_directory(p, &canonical));
    save_projects(&projects)
}

/// Whether a stored project path refers to the same directory as the input's
/// canonical form. Canonicalizing both sides handles symlinked parents (macOS
/// `/tmp` → `/private/tmp`); a stored dir that vanished falls back to the raw
/// comparison rather than failing the removal.
fn same_directory(stored: &str, canonical: &str) -> bool {
    if stored == canonical {
        return true;
    }
    let stored_canonical = std::fs::canonicalize(stored)
        .map(|c| c.to_string_lossy().into_owned())
        .unwrap_or_else(|_| stored.to_string());
    stored_canonical == canonical
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A project stored under a symlinked parent (e.g. `/tmp` → `/private/tmp`
    /// on macOS) must still be removed when the input is the canonical form.
    #[test]
    fn same_directory_matches_symlinked_forms() {
        // /tmp is a symlink to /private/tmp on macOS; on other platforms it
        // may not be, so compare against whatever canonicalize produces.
        let input = "/tmp";
        let Ok(canonical) = canonicalize(input) else {
            return; // no /tmp here — nothing meaningful to assert
        };
        // stored as the non-canonical form, input as canonical (or vice versa)
        assert!(same_directory(input, &canonical));
        assert!(same_directory(&canonical, &canonical));
    }

    #[test]
    fn same_directory_rejects_different_dirs() {
        let a = canonicalize("/tmp").unwrap_or_else(|_| "/tmp".to_string());
        let b = canonicalize("/").unwrap_or_else(|_| "/".to_string());
        assert!(!same_directory(&a, &b));
    }
}
