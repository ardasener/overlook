//! PTY session management: spawn shells via `portable-pty` and stream bytes
//! between the Rust backend and the webview over a Tauri `Channel`.
//!
//! The webview never touches the PTY directly — every operation goes through
//! the commands in this module (see DESIGN.md §4).

mod session;

use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, RwLock};

use portable_pty::PtySize;
use serde::Serialize;
use tauri::ipc::Channel;
use tauri::State;

use session::{Session, spawn_session};

/// Events streamed from Rust to the frontend for a PTY session.
#[derive(Clone, Serialize, serde::Deserialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum TerminalEvent {
    /// Raw bytes read from the PTY master.
    Output { session_id: u32, data: Vec<u8> },
    /// The child shell exited.
    Exit { session_id: u32, code: u32 },
}

#[derive(Default)]
struct PtyManagerInner {
    sessions: RwLock<HashMap<u32, Arc<Session>>>,
    next_id: AtomicU32,
}

/// Registry of live PTY sessions. Cloneable so the waiter thread can remove a
/// session after natural child exit.
#[derive(Clone, Default)]
pub struct PtyManager(Arc<PtyManagerInner>);

impl PtyManager {
    /// Allocate a session id. Ids start at 1, increase monotonically, and are
    /// never reused, so the frontend can treat `0` as "no session".
    fn allocate_id(&self) -> u32 {
        self.0.next_id.fetch_add(1, Ordering::Relaxed) + 1
    }

    fn insert(&self, session: Arc<Session>) {
        self.0.sessions.write().unwrap().insert(session.id, session);
    }

    fn get(&self, session_id: u32) -> Option<Arc<Session>> {
        self.0.sessions.read().unwrap().get(&session_id).cloned()
    }

    fn remove(&self, session_id: u32) -> Option<Arc<Session>> {
        self.0.sessions.write().unwrap().remove(&session_id)
    }
}

/// Spawn a new shell PTY session and stream its output to `on_event`.
/// When `command` is provided, that argv is direct-executed instead of the
/// shell (used by runnable apps); the session otherwise behaves identically.
/// `cols`/`rows` seed the PTY at the terminal's fitted size so TUIs never
/// start at the 80x24 default and get resized mid-init.
#[tauri::command]
pub fn pty_open(
    manager: State<PtyManager>,
    on_event: Channel<TerminalEvent>,
    cwd: Option<String>,
    command: Option<Vec<String>>,
    cols: u16,
    rows: u16,
) -> Result<u32, String> {
    eprintln!(
        "[pty] open cols={cols} rows={rows} cwd={cwd:?} cmd={command:?} (debug)"
    );
    let id = manager.allocate_id();
    let session = spawn_session(
        id,
        cwd,
        PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        },
        on_event,
        manager.inner().clone(),
        command,
    )?;
    manager.insert(session.clone());
    // Reap a shell that died before it was registered.
    if session.has_exited() {
        manager.remove(id);
    }
    Ok(id)
}

/// Write raw input bytes to the PTY of a session.
#[tauri::command]
pub fn pty_write(
    manager: State<PtyManager>,
    session_id: u32,
    data: Vec<u8>,
) -> Result<(), String> {
    let session = manager
        .get(session_id)
        .ok_or_else(|| format!("no such session: {session_id}"))?;
    session.write(&data).map_err(|e| e.to_string())
}

/// Resize the PTY of a session to the given columns/rows.
#[tauri::command]
pub fn pty_resize(
    manager: State<PtyManager>,
    session_id: u32,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let session = manager
        .get(session_id)
        .ok_or_else(|| format!("no such session: {session_id}"))?;
    eprintln!("[pty] resize session={session_id} cols={cols} rows={rows} (debug)");
    session
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

/// Kill the shell of a session and remove it from the registry.
#[tauri::command]
pub fn pty_close(manager: State<PtyManager>, session_id: u32) -> Result<(), String> {
    if let Some(session) = manager.remove(session_id) {
        session.kill();
    }
    Ok(())
}

/// Resolve the name of the process running in the foreground of a session's
/// shell (deepest live descendant). Empty string when the terminal is idle.
#[tauri::command]
pub fn pty_foreground_process(
    manager: State<PtyManager>,
    session_id: u32,
) -> Result<String, String> {
    let session = manager
        .get(session_id)
        .ok_or_else(|| format!("no such session: {session_id}"))?;
    let Some(shell_pid) = session.shell_pid else {
        return Ok(String::new());
    };
    Ok(session::foreground_process(shell_pid).unwrap_or_default())
}

/// Basename of the resolved default shell (e.g. "zsh", "bash"), lowercased —
/// used as the initial tab title.
#[tauri::command]
pub fn pty_shell_name() -> String {
    session::resolve_shell()
        .rsplit('/')
        .next()
        .unwrap_or("sh")
        .to_lowercase()
}
