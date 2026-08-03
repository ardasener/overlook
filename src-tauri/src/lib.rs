mod modules;

use modules::pty::{self, PtyManager};
use modules::workspace::{self};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PtyManager::default())
        .invoke_handler(tauri::generate_handler![
            pty::pty_open,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_close,
            pty::pty_foreground_process,
            pty::pty_shell_name,
            workspace::workspace_list,
            workspace::workspace_add_project,
            workspace::workspace_remove_project,
            workspace::workspace_branch_exists,
            workspace::workspace_fork,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
