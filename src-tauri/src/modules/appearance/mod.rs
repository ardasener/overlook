use std::fs;
use std::path::PathBuf;

use tauri::Manager;

/// Tauri's app config dir — the SAME directory the frontend's `appConfigDir()`
/// resolves and the `$APPCONFIG` asset-protocol scope maps to, so the stored
/// wallpaper is served by `convertFileSrc` without scope mismatches.
fn wallpaper_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| e.to_string())
}

/// Copy the picked image into the app's config dir so the wallpaper survives
/// moves/deletes of the source file. Each upload gets a UNIQUE timestamped
/// filename so the stored path (and thus the asset URL) changes — otherwise
/// overwriting the same `background.png` keeps the old cached image until
/// restart. Old wallpaper files are removed. Returns the full absolute path.
#[tauri::command]
pub fn appearance_set_background(
    app: tauri::AppHandle,
    path: String,
) -> Result<String, String> {
    let src = PathBuf::from(&path);
    if !src.is_file() {
        return Err(format!("not a file: {path}"));
    }
    let dir = wallpaper_dir(&app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    // Drop previous wallpaper files so only the new one remains on disk.
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            if name.to_string_lossy().starts_with("background") {
                let _ = fs::remove_file(entry.path());
            }
        }
    }

    // Keep the extension so the webview renders the image correctly. A
    // timestamp suffix makes the filename (and asset URL) unique per upload.
    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{e}"))
        .unwrap_or_default();
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let dest = dir.join(format!("background-{stamp}{ext}"));

    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().into_owned())
}

/// Delete the stored background image. Missing files are not an error.
#[tauri::command]
pub fn appearance_clear_background(app: tauri::AppHandle) -> Result<(), String> {
    let dir = wallpaper_dir(&app)?;
    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            if name.to_string_lossy().starts_with("background") {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The wallpaper keeps its extension when copied into the app config dir.
    #[test]
    fn wallpaper_dest_keeps_extension() {
        let src = PathBuf::from("/tmp/fake-wallpaper.png");
        let ext = src
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{e}"))
            .unwrap_or_default();
        assert_eq!(ext, ".png");
        let dest_name = format!("background-123456{ext}");
        assert!(dest_name.starts_with("background"));
    }
}
