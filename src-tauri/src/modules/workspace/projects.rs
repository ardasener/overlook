//! Persistence of the tracked project list in the app's config directory
//! (`~/Library/Application Support/com.overlook.app/projects.json` or the OS
//! equivalent). The directory is identifier-based (Tauri's `app_config_dir`),
//! so dev and installed builds keep separate state.

use std::fs;
use std::path::{Path, PathBuf};

/// The projects file lives in the given (identifier-based) config directory.
fn projects_file(config_dir: &Path) -> PathBuf {
    config_dir.join("projects.json")
}

/// Legacy pre-identifier location: `{config_dir}/overlook/projects.json`.
fn legacy_projects_file() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("overlook").join("projects.json"))
}

/// Load the tracked project paths (canonical absolute paths). Missing or
/// corrupt files degrade to an empty list. On first load, a legacy projects
/// file from the pre-identifier location is copied into the new one.
pub fn load_projects(config_dir: &Path) -> Vec<String> {
    let file = projects_file(config_dir);
    let Ok(content) = fs::read_to_string(&file) else {
        return migrate_legacy(config_dir, &file);
    };
    serde_json::from_str::<Vec<String>>(&content).unwrap_or_default()
}

/// One-time migration: if the new identifier-based file is absent and a legacy
/// `{config_dir}/overlook/projects.json` exists, copy its contents into the
/// new location. The legacy file is never deleted. Returns the migrated list.
fn migrate_legacy(config_dir: &Path, file: &Path) -> Vec<String> {
    migrate_from(config_dir, file, legacy_projects_file().as_deref())
}

/// Migration core, parameterized over the legacy file so tests can point it at
/// a temp dir instead of the real `{config_dir}/overlook`.
fn migrate_from(config_dir: &Path, file: &Path, legacy: Option<&Path>) -> Vec<String> {
    if file.exists() {
        return Vec::new();
    }
    let Some(legacy) = legacy else {
        return Vec::new();
    };
    let Ok(content) = fs::read_to_string(legacy) else {
        return Vec::new();
    };
    let Ok(projects) = serde_json::from_str::<Vec<String>>(&content) else {
        return Vec::new();
    };
    let _ = save_projects(config_dir, &projects);
    projects
}

fn save_projects(config_dir: &Path, projects: &[String]) -> Result<(), String> {
    fs::create_dir_all(config_dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(projects).map_err(|e| e.to_string())?;
    fs::write(projects_file(config_dir), content).map_err(|e| e.to_string())
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
pub fn add_project(config_dir: &Path, path: &str) -> Result<String, String> {
    let canonical = canonicalize(path)?;
    let mut projects = load_projects(config_dir);
    if !projects.contains(&canonical) {
        projects.push(canonical.clone());
        save_projects(config_dir, &projects)?;
    }
    Ok(canonical)
}

/// Untrack a project. Its managed worktrees are left on disk.
pub fn remove_project(config_dir: &Path, path: &str) -> Result<(), String> {
    let canonical = canonicalize(path)?;
    let mut projects = load_projects(config_dir);
    projects.retain(|p| !same_directory(p, &canonical));
    save_projects(config_dir, &projects)
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

    /// load_projects migrates a legacy file into the new dir exactly once,
    /// preserving the legacy file, and new data wins afterwards.
    #[test]
    fn legacy_file_migrates_once_and_new_wins() {
        let base = std::env::temp_dir().join(format!("overlook-test-{}", std::process::id()));
        let legacy_dir = base.join("overlook");
        let new_dir = base.join("com.overlook.app");
        fs::create_dir_all(&legacy_dir).unwrap();
        let legacy = legacy_dir.join("projects.json");
        fs::write(&legacy, r#"["/tmp/alpha"]"#).unwrap();

        // First load migrates the legacy content into the new location.
        let new_file = projects_file(&new_dir);
        assert_eq!(
            migrate_from(&new_dir, &new_file, Some(&legacy)),
            vec!["/tmp/alpha"]
        );
        assert!(new_file.exists());
        assert!(legacy.exists(), "legacy file must be preserved");

        // New file takes precedence over legacy from now on.
        fs::write(&new_file, r#"["/tmp/beta"]"#).unwrap();
        assert_eq!(
            migrate_from(&new_dir, &new_file, Some(&legacy)),
            Vec::<String>::new()
        );
        assert_eq!(load_projects(&new_dir), vec!["/tmp/beta"]);

        fs::remove_dir_all(&base).ok();
    }
}
