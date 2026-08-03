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
    projects.retain(|p| p != &canonical);
    save_projects(&projects)
}
