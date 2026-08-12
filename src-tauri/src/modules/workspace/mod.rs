//! Workspace management: tracked projects, their default worktree (the project
//! directory), and git worktrees managed by the app in the platform cache.
//!
//! Rust owns all filesystem/git access (see DESIGN.md §4); the webview only
//! reads the serialized tree and issues commands.

mod projects;
mod worktrees;

use std::fs;
use std::path::PathBuf;

use serde::Serialize;
use tauri::Manager;

/// One selectable worktree: the project's default worktree (the directory
/// itself) or a managed git worktree.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeInfo {
    pub path: String,
    pub branch: Option<String>,
    pub is_default: bool,
}

/// A tracked project and its worktrees.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub path: String,
    /// Directory basename; the fallback when no display name is set.
    pub name: String,
    /// User-assigned display name (overrides `name` in the tree).
    pub display_name: Option<String>,
    pub favorite: bool,
    pub is_git: bool,
    /// Branch of the default worktree (git projects only).
    pub branch: Option<String>,
    pub worktrees: Vec<WorktreeInfo>,
}

/// Build a project's info. Returns None when the directory no longer exists
/// (stale config entries are silently dropped from the list).
fn project_info(entry: &projects::ProjectEntry) -> Option<ProjectInfo> {
    let path = entry.path().to_string();
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return None;
    }
    let name = dir.file_name()?.to_string_lossy().into_owned();
    let is_git = worktrees::is_git_repo(&dir);
    let branch = if is_git { worktrees::current_branch(&dir) } else { None };

    let mut worktrees: Vec<WorktreeInfo> = worktrees::discover_worktrees(&path, &name)
        .into_iter()
        .map(|w| WorktreeInfo {
            path: w.dir.to_string_lossy().into_owned(),
            branch: w.branch,
            is_default: false,
        })
        .collect();
    if is_git {
        worktrees::prune_worktrees(&dir);
    }
    // The default worktree (the directory itself) always comes first.
    worktrees.insert(
        0,
        WorktreeInfo {
            path: path.clone(),
            branch: branch.clone(),
            is_default: true,
        },
    );

    Some(ProjectInfo {
        path,
        name,
        display_name: entry.display_name().map(str::to_string),
        favorite: entry.favorite(),
        is_git,
        branch,
        worktrees,
    })
}

/// All tracked projects with their worktrees.
#[tauri::command]
pub fn workspace_list(app: tauri::AppHandle) -> Vec<ProjectInfo> {
    let Some(config_dir) = app_config_dir(&app) else {
        return Vec::new();
    };
    projects::load_projects(&config_dir)
        .iter()
        .filter_map(project_info)
        .collect()
}

/// Validate and add a project directory.
#[tauri::command]
pub fn workspace_add_project(app: tauri::AppHandle, path: String) -> Result<ProjectInfo, String> {
    let config_dir = app_config_dir(&app).ok_or("no config directory available")?;
    let canonical = projects::add_project(&config_dir, &path)?;
    let entry = projects::ProjectEntry::Path(canonical);
    project_info(&entry).ok_or_else(|| "failed to load project".to_string())
}

/// Untrack a project (its managed worktrees are left on disk).
#[tauri::command]
pub fn workspace_remove_project(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let config_dir = app_config_dir(&app).ok_or("no config directory available")?;
    projects::remove_project(&config_dir, &path)
}

/// Toggle a project's favorite flag.
#[tauri::command]
pub fn workspace_set_project_favorite(
    app: tauri::AppHandle,
    path: String,
    favorite: bool,
) -> Result<(), String> {
    let config_dir = app_config_dir(&app).ok_or("no config directory available")?;
    projects::set_favorite(&config_dir, &path, favorite)
}

/// Set a project's display name (empty string clears it).
#[tauri::command]
pub fn workspace_rename_project(
    app: tauri::AppHandle,
    path: String,
    display_name: String,
) -> Result<(), String> {
    let config_dir = app_config_dir(&app).ok_or("no config directory available")?;
    projects::rename(&config_dir, &path, &display_name)
}

/// The identifier-based app config directory, shared with the wallpaper store.
fn app_config_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().app_config_dir().ok()
}

/// Whether a branch exists in a project's repository.
#[tauri::command]
pub fn workspace_branch_exists(project: String, branch: String) -> Result<bool, String> {
    let dir = PathBuf::from(&project);
    if !dir.is_dir() {
        return Err("project directory not found".to_string());
    }
    Ok(worktrees::branch_exists(&dir, &branch))
}

/// Whether a managed worktree has uncommitted changes.
#[tauri::command]
pub fn workspace_worktree_is_dirty(
    _project: String,
    worktree_path: String,
) -> Result<bool, String> {
    let dir = PathBuf::from(&worktree_path);
    if !dir.is_dir() {
        return Err("worktree directory not found".to_string());
    }
    Ok(worktrees::is_dirty(&dir))
}

/// Remove a managed worktree, optionally forcing past uncommitted changes.
/// Validates the path lives under the app cache with the project's prefix.
#[tauri::command]
pub fn workspace_remove_worktree(
    project: String,
    worktree_path: String,
    force: bool,
) -> Result<(), String> {
    let project_dir = PathBuf::from(&project);
    let worktree_dir = PathBuf::from(&worktree_path);
    if !project_dir.is_dir() {
        return Err("project directory not found".to_string());
    }
    worktrees::remove_worktree(&project_dir, &worktree_dir, force)
}

/// Create a managed worktree for `branch` in the platform cache, forked from
/// the default worktree's HEAD. `allow_existing` attaches an existing branch
/// instead of creating a new one.
#[tauri::command]
pub fn workspace_fork(
    project: String,
    branch: String,
    allow_existing: bool,
) -> Result<WorktreeInfo, String> {
    let dir = PathBuf::from(&project);
    if !dir.is_dir() {
        return Err("project directory not found".to_string());
    }
    if !worktrees::is_git_repo(&dir) {
        return Err("not a git repository".to_string());
    }
    let cache = worktrees::cache_dir().ok_or("no cache directory available")?;
    fs::create_dir_all(&cache).map_err(|e| e.to_string())?;

    let project_name = dir
        .file_name()
        .ok_or("invalid project path")?
        .to_string_lossy()
        .into_owned();
    let checkout = worktrees::worktree_checkout_path(&cache, &project, &branch, &project_name);
    if checkout.exists() {
        return Err(format!(
            "a worktree already exists at {}",
            checkout.display()
        ));
    }

    worktrees::add_worktree(&dir, &branch, &checkout, allow_existing)?;
    Ok(WorktreeInfo {
        path: checkout.to_string_lossy().into_owned(),
        branch: worktrees::current_branch(&checkout),
        is_default: false,
    })
}
