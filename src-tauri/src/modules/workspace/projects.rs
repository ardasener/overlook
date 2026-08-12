//! Persistence of the tracked project list in the app's config directory
//! (`~/Library/Application Support/com.overlook.app/projects.json` or the OS
//! equivalent). The directory is identifier-based (Tauri's `app_config_dir`),
//! so dev and installed builds keep separate state.
//!
//! Entries are either plain path strings (legacy format) or structured objects
//! carrying the path plus favorite/display-name metadata; the untagged serde
//! enum loads both transparently with no migration step.

use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

/// A stored project: either a bare path string (legacy) or an object with
/// favorite/display-name metadata.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ProjectEntry {
    Path(String),
    Meta {
        path: String,
        #[serde(default)]
        favorite: bool,
        #[serde(default, rename = "displayName")]
        display_name: Option<String>,
    },
}

impl ProjectEntry {
    /// The project's absolute path.
    pub fn path(&self) -> &str {
        match self {
            ProjectEntry::Path(p) => p,
            ProjectEntry::Meta { path, .. } => path,
        }
    }

    pub fn favorite(&self) -> bool {
        match self {
            ProjectEntry::Path(_) => false,
            ProjectEntry::Meta { favorite, .. } => *favorite,
        }
    }

    pub fn display_name(&self) -> Option<&str> {
        match self {
            ProjectEntry::Path(_) => None,
            ProjectEntry::Meta { display_name, .. } => display_name.as_deref(),
        }
    }

    fn with_favorite(&self, favorite: bool) -> ProjectEntry {
        ProjectEntry::Meta {
            path: self.path().to_string(),
            favorite,
            display_name: self.display_name().map(str::to_string),
        }
    }

    fn with_display_name(&self, display_name: Option<String>) -> ProjectEntry {
        ProjectEntry::Meta {
            path: self.path().to_string(),
            favorite: self.favorite(),
            display_name,
        }
    }
}

/// The projects file lives in the given (identifier-based) config directory.
fn projects_file(config_dir: &Path) -> PathBuf {
    config_dir.join("projects.json")
}

/// Legacy pre-identifier location: `{config_dir}/overlook/projects.json`.
fn legacy_projects_file() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("overlook").join("projects.json"))
}

/// Load the tracked projects. Missing or corrupt files degrade to an empty
/// list. On first load, a legacy projects file from the pre-identifier
/// location is copied into the new one.
pub fn load_projects(config_dir: &Path) -> Vec<ProjectEntry> {
    let file = projects_file(config_dir);
    let Ok(content) = fs::read_to_string(&file) else {
        return migrate_legacy(config_dir, &file);
    };
    serde_json::from_str::<Vec<ProjectEntry>>(&content).unwrap_or_default()
}

/// One-time migration: if the new identifier-based file is absent and a legacy
/// `{config_dir}/overlook/projects.json` exists, copy its contents into the
/// new location. The legacy file is never deleted. Returns the migrated list.
fn migrate_legacy(config_dir: &Path, file: &Path) -> Vec<ProjectEntry> {
    migrate_from(config_dir, file, legacy_projects_file().as_deref())
}

/// Migration core, parameterized over the legacy file so tests can point it at
/// a temp dir instead of the real `{config_dir}/overlook`.
fn migrate_from(
    config_dir: &Path,
    file: &Path,
    legacy: Option<&Path>,
) -> Vec<ProjectEntry> {
    if file.exists() {
        return Vec::new();
    }
    let Some(legacy) = legacy else {
        return Vec::new();
    };
    let Ok(content) = fs::read_to_string(legacy) else {
        return Vec::new();
    };
    let Ok(projects) = serde_json::from_str::<Vec<ProjectEntry>>(&content) else {
        return Vec::new();
    };
    let _ = save_projects(config_dir, &projects);
    projects
}

fn save_projects(config_dir: &Path, projects: &[ProjectEntry]) -> Result<(), String> {
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
    if !projects.iter().any(|p| p.path() == canonical) {
        projects.push(ProjectEntry::Path(canonical.clone()));
        save_projects(config_dir, &projects)?;
    }
    Ok(canonical)
}

/// Untrack a project. Its managed worktrees are left on disk.
pub fn remove_project(config_dir: &Path, path: &str) -> Result<(), String> {
    let canonical = canonicalize(path)?;
    let mut projects = load_projects(config_dir);
    projects.retain(|p| !same_directory(p.path(), &canonical));
    save_projects(config_dir, &projects)
}

/// Set a project's favorite flag, persisting the updated entry.
pub fn set_favorite(config_dir: &Path, path: &str, favorite: bool) -> Result<(), String> {
    let canonical = canonicalize(path)?;
    let mut projects = load_projects(config_dir);
    for entry in &mut projects {
        if same_directory(entry.path(), &canonical) {
            *entry = entry.with_favorite(favorite);
            return save_projects(config_dir, &projects);
        }
    }
    Err("project not found".to_string())
}

/// Set a project's display name (None/empty clears it), persisting the entry.
pub fn rename(config_dir: &Path, path: &str, display_name: &str) -> Result<(), String> {
    let canonical = canonicalize(path)?;
    let display_name = display_name.trim();
    let display_name = if display_name.is_empty() {
        None
    } else {
        Some(display_name.to_string())
    };
    let mut projects = load_projects(config_dir);
    for entry in &mut projects {
        if same_directory(entry.path(), &canonical) {
            *entry = entry.with_display_name(display_name);
            return save_projects(config_dir, &projects);
        }
    }
    Err("project not found".to_string())
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
            migrate_from(&new_dir, &new_file, Some(&legacy))
                .iter()
                .map(ProjectEntry::path)
                .collect::<Vec<_>>(),
            vec!["/tmp/alpha"]
        );
        assert!(new_file.exists());
        assert!(legacy.exists(), "legacy file must be preserved");

        // New file takes precedence over legacy from now on.
        fs::write(&new_file, r#"["/tmp/beta"]"#).unwrap();
        assert!(
            migrate_from(&new_dir, &new_file, Some(&legacy)).is_empty()
        );
        assert_eq!(
            load_projects(&new_dir)
                .iter()
                .map(ProjectEntry::path)
                .collect::<Vec<_>>(),
            vec!["/tmp/beta"]
        );

        fs::remove_dir_all(&base).ok();
    }

    /// A legacy string-only file deserializes as plain entries.
    #[test]
    fn legacy_string_entries_load() {
        let entries: Vec<ProjectEntry> = serde_json::from_str(r#"["/a", "/b"]"#).unwrap();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].path(), "/a");
        assert!(!entries[0].favorite());
        assert_eq!(entries[0].display_name(), None);
    }

    /// Structured entries round-trip through serialization.
    #[test]
    fn structured_entries_round_trip() {
        let entries: Vec<ProjectEntry> = serde_json::from_str(
            r#"[{"path":"/a","favorite":true,"displayName":"Alpha"}]"#,
        )
        .unwrap();
        assert!(entries[0].favorite());
        assert_eq!(entries[0].display_name(), Some("Alpha"));

        let json = serde_json::to_string(&entries).unwrap();
        let back: Vec<ProjectEntry> = serde_json::from_str(&json).unwrap();
        assert_eq!(back[0].path(), "/a");
        assert!(back[0].favorite());
        assert_eq!(back[0].display_name(), Some("Alpha"));
    }

    /// Missing metadata fields default to false/None.
    #[test]
    fn structured_entry_defaults() {
        let entries: Vec<ProjectEntry> =
            serde_json::from_str(r#"[{"path":"/a"}]"#).unwrap();
        assert!(!entries[0].favorite());
        assert_eq!(entries[0].display_name(), None);
    }

    /// with_favorite preserves the display name; with_display_name preserves
    /// the favorite flag.
    #[test]
    fn metadata_mutations_are_lossless() {
        let e: ProjectEntry = serde_json::from_str(
            r#"{"path":"/a","favorite":true,"displayName":"Alpha"}"#,
        )
        .unwrap();
        assert!(!e.with_favorite(false).favorite());
        assert_eq!(e.with_favorite(false).display_name(), Some("Alpha"));
        assert!(e.with_display_name(None).favorite());
        assert_eq!(e.with_display_name(None).display_name(), None);
    }

    /// set_favorite and rename persist through save/load.
    #[test]
    fn favorite_and_rename_persist() {
        let base = std::env::temp_dir().join(format!("overlook-meta-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).unwrap();
        let dir = base.join("proj");
        fs::create_dir_all(&dir).unwrap();

        // Seed an empty projects file so the legacy migration (which reads the
        // real `{config_dir}/overlook/projects.json`) never fires in tests.
        fs::write(projects_file(&base), "[]").unwrap();

        add_project(&base, dir.to_str().unwrap()).unwrap();
        set_favorite(&base, dir.to_str().unwrap(), true).unwrap();
        rename(&base, dir.to_str().unwrap(), "My Project").unwrap();

        let loaded = load_projects(&base);
        assert_eq!(loaded.len(), 1);
        assert!(loaded[0].favorite());
        assert_eq!(loaded[0].display_name(), Some("My Project"));

        // Clearing the display name reverts to None.
        rename(&base, dir.to_str().unwrap(), "  ").unwrap();
        assert_eq!(load_projects(&base)[0].display_name(), None);

        fs::remove_dir_all(&base).ok();
    }
}
