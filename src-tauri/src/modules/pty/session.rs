//! A single PTY session: portable-pty handles, the reader/waiter threads, and
//! platform-aware shell resolution.
//!
//! Modeled on Terax's proven pattern: the kill handle (`ChildKiller`) is split
//! from the child handle — the waiter thread owns the child and blocks in
//! `wait()`, while `pty_close` kills through the killer without touching the
//! child, avoiding deadlock.

use std::io::{Read, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

use portable_pty::{native_pty_system, ChildKiller, CommandBuilder, MasterPty, PtySize};
use tauri::ipc::Channel;

use super::{PtyManager, TerminalEvent};

/// Read chunk size for the PTY master.
const READ_BUF: usize = 8 * 1024;

/// Resolve the shell to spawn: `$SHELL` when it points at an existing
/// executable, otherwise the platform default (PowerShell on Windows, zsh on
/// macOS, bash elsewhere).
pub fn resolve_shell() -> String {
    if let Ok(shell) = std::env::var("SHELL") {
        if is_usable_shell(&shell) {
            return shell;
        }
    }
    default_shell()
}

#[cfg(unix)]
fn is_usable_shell(path: &str) -> bool {
    use std::os::unix::fs::PermissionsExt;
    std::fs::metadata(path)
        .map(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

#[cfg(windows)]
fn is_usable_shell(path: &str) -> bool {
    std::fs::metadata(path).map(|m| m.is_file()).unwrap_or(false)
}

#[cfg(target_os = "macos")]
fn default_shell() -> String {
    "/bin/zsh".to_string()
}

#[cfg(all(unix, not(target_os = "macos")))]
fn default_shell() -> String {
    "/bin/bash".to_string()
}

#[cfg(windows)]
fn default_shell() -> String {
    // PowerShell 7 (`pwsh`) preferred, then Windows PowerShell.
    let path = std::env::var("PATH").unwrap_or_default();
    for name in ["pwsh.exe", "powershell.exe"] {
        for dir in path.split(';') {
            let candidate = format!("{}\\{}", dir.trim_end_matches('\\'), name);
            if is_usable_shell(&candidate) {
                return candidate;
            }
        }
    }
    "powershell.exe".to_string()
}

/// Temporary guard that kills the child if any step of PTY setup after spawn
/// fails, so a half-initialized session can't leak a shell.
struct ChildKillGuard {
    killer: Option<Box<dyn ChildKiller + Send + Sync>>,
}

impl ChildKillGuard {
    fn new(killer: Box<dyn ChildKiller + Send + Sync>) -> Self {
        Self {
            killer: Some(killer),
        }
    }

    fn disarm(&mut self) {
        self.killer = None;
    }
}

impl Drop for ChildKillGuard {
    fn drop(&mut self) {
        if let Some(mut killer) = self.killer.take() {
            let _ = killer.kill();
        }
    }
}

/// One live PTY session. Field drop order is intentional (Rust drops
/// top-to-bottom): the killer runs first so the child dies before the master
/// closes, then the writer (input side), then the master last.
pub struct Session {
    pub id: u32,
    killer: Mutex<Box<dyn ChildKiller + Send + Sync>>,
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Mutex<Box<dyn MasterPty + Send>>,
    /// Set by the waiter once the child exits, so `pty_open` can reap a shell
    /// that died before it was registered.
    exited: Arc<AtomicBool>,
}

impl Session {
    /// Write raw input bytes to the PTY.
    pub fn write(&self, data: &[u8]) -> std::io::Result<()> {
        let mut writer = self.writer.lock().unwrap();
        writer.write_all(data)?;
        writer.flush()
    }

    /// Inform the kernel (and thus the child) of a new window size.
    pub fn resize(&self, size: PtySize) -> Result<(), Box<dyn std::error::Error>> {
        let master = self.master.lock().unwrap();
        Ok(master.resize(size)?)
    }

    /// Kill the child shell.
    pub fn kill(&self) {
        if let Ok(mut killer) = self.killer.lock() {
            let _ = killer.kill();
        }
    }

    pub fn has_exited(&self) -> bool {
        self.exited.load(Ordering::Acquire)
    }
}

impl Drop for Session {
    fn drop(&mut self) {
        // Last Arc dropped (session deregistered) without an explicit close —
        // kill the child so the reader thread hits EOF and unwinds.
        if let Ok(mut killer) = self.killer.lock() {
            let _ = killer.kill();
        }
    }
}

/// Open a PTY, spawn the resolved shell in it, and start the io threads.
/// Returns the session; the caller registers it with the manager.
pub fn spawn_session(
    id: u32,
    cwd: Option<String>,
    size: PtySize,
    on_event: Channel<TerminalEvent>,
    manager: PtyManager,
) -> Result<Arc<Session>, String> {
    let pty_system = native_pty_system();
    let pair = pty_system.openpty(size).map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(resolve_shell());
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }
    let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    // Dropping the slave closes our copy of the slave end, so the reader sees
    // EOF when the child exits.
    drop(pair.slave);

    // Kill the child if any pipe setup below fails.
    let mut guard = ChildKillGuard::new(child.clone_killer());
    let killer = child.clone_killer();
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = Arc::new(Mutex::new(
        pair.master.take_writer().map_err(|e| e.to_string())?,
    ));
    guard.disarm();

    let exited = Arc::new(AtomicBool::new(false));
    let session = Arc::new(Session {
        id,
        killer: Mutex::new(killer),
        writer: writer.clone(),
        master: Mutex::new(pair.master),
        exited: exited.clone(),
    });

    // Reader: pump PTY output to the frontend.
    let reader_tx = on_event.clone();
    thread::Builder::new()
        .name(format!("pty-reader-{id}"))
        .spawn(move || {
            let mut buf = [0u8; READ_BUF];
            loop {
                match reader.read(&mut buf) {
                    // EOF: the slave end closed (child exited or PTY torn down).
                    Ok(0) => break,
                    Ok(n) => {
                        let event = TerminalEvent::Output {
                            session_id: id,
                            data: buf[..n].to_vec(),
                        };
                        if reader_tx.send(event).is_err() {
                            // Frontend dropped the channel; stop pumping.
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        })
        .map_err(|e| e.to_string())?;

    // Waiter: block until the child exits, then report it and deregister.
    let waiter_tx = on_event;
    thread::Builder::new()
        .name(format!("pty-waiter-{id}"))
        .spawn(move || {
            let code = match child.wait() {
                Ok(status) => status.exit_code(),
                Err(_) => 1,
            };
            exited.store(true, Ordering::Release);
            let _ = waiter_tx.send(TerminalEvent::Exit { session_id: id, code });
            manager.remove(id);
        })
        .map_err(|e| e.to_string())?;

    Ok(session)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    /// How long a shell must survive spawn before we consider it stable.
    const STABLE_ALIVE: Duration = Duration::from_millis(500);

    /// Env mutation is global, so all `$SHELL` scenarios live in one test to
    /// avoid parallel-test races.
    #[test]
    fn resolve_shell_env_handling() {
        let original = std::env::var("SHELL").ok();

        // Usable $SHELL wins.
        if let Some(value) = &original {
            assert_eq!(resolve_shell(), *value);
        }

        // Stale $SHELL is ignored.
        std::env::set_var("SHELL", "/nonexistent/shell");
        assert_ne!(
            resolve_shell(),
            "/nonexistent/shell",
            "stale $SHELL must be ignored"
        );

        // Unset $SHELL falls back to the platform default.
        std::env::remove_var("SHELL");
        let shell = resolve_shell();
        #[cfg(target_os = "macos")]
        assert_eq!(shell, "/bin/zsh");
        #[cfg(all(unix, not(target_os = "macos")))]
        assert_eq!(shell, "/bin/bash");
        #[cfg(windows)]
        assert!(shell.ends_with("powershell.exe"));
        assert!(is_usable_shell(&shell), "default {shell} must be usable");

        // Restore.
        match original {
            Some(value) => std::env::set_var("SHELL", value),
            None => std::env::remove_var("SHELL"),
        }
    }

    /// A one-shot shell through the same portable-pty path the app uses must
    /// have its output readable from the master end.
    #[test]
    fn shell_output_is_readable_from_master() {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .unwrap();

        let mut cmd = CommandBuilder::new("/bin/sh");
        cmd.args(["-c", "echo pty-test-ok"]);
        let mut child = pair.slave.spawn_command(cmd).unwrap();
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader().unwrap();
        let mut output = Vec::new();
        let mut buf = [0u8; 1024];
        let deadline = std::time::Instant::now() + Duration::from_secs(5);
        loop {
            assert!(
                std::time::Instant::now() < deadline,
                "timed out waiting for shell output"
            );
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => output.extend_from_slice(&buf[..n]),
                Err(_) => break,
            }
        }

        assert!(String::from_utf8_lossy(&output).contains("pty-test-ok"));
        let _ = child.wait();
    }

    /// An interactive shell (no args, like the app spawns) must stay alive
    /// past the stability window — it must not exit on its own.
    #[test]
    fn interactive_shell_stays_alive() {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows: 24,
                cols: 80,
                pixel_width: 0,
                pixel_height: 0,
            })
            .unwrap();

        let cmd = CommandBuilder::new(resolve_shell());
        let mut child = pair.slave.spawn_command(cmd).unwrap();
        drop(pair.slave);

        // The shell should produce a prompt before it does anything else.
        let mut reader = pair.master.try_clone_reader().unwrap();
        let mut buf = [0u8; 4096];
        let mut output = Vec::new();
        let deadline = std::time::Instant::now() + Duration::from_secs(2);
        while std::time::Instant::now() < deadline {
            if let Ok(n) = reader.read(&mut buf) {
                if n == 0 {
                    break;
                }
                output.extend_from_slice(&buf[..n]);
                if !output.is_empty() {
                    break;
                }
            }
        }
        eprintln!(
            "interactive shell produced: {:?}",
            String::from_utf8_lossy(&output)
        );

        std::thread::sleep(STABLE_ALIVE);
        assert!(
            child.try_wait().unwrap().is_none(),
            "interactive shell exited on its own"
        );

        let _ = child.kill();
        let _ = child.wait();
    }

    /// Full-module roundtrip: spawn a session through `spawn_session`, write
    /// input to the PTY, and expect the shell's echo to arrive back through
    /// the Channel. Exercises the exact code path the app uses.
    #[test]
    fn session_roundtrip_echoes_input() {
        use std::sync::mpsc;
        use tauri::ipc::InvokeResponseBody;

        let manager = PtyManager::default();
        let (tx, rx) = mpsc::channel::<TerminalEvent>();
        let channel = Channel::new(move |body| {
            let json = match &body {
                InvokeResponseBody::Json(s) => s.clone(),
                InvokeResponseBody::Raw(v) => String::from_utf8_lossy(v).into_owned(),
            };
            let event: TerminalEvent = serde_json::from_str(&json).expect("valid event json");
            let _ = tx.send(event);
            Ok(())
        });

        let session = spawn_session(1, None, PtySize::default(), channel, manager.clone()).unwrap();

        session.write(b"echo roundtrip-ok\r\n").unwrap();

        let deadline = std::time::Instant::now() + Duration::from_secs(5);
        let mut echoed = false;
        while std::time::Instant::now() < deadline {
            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(TerminalEvent::Output { data, .. }) => {
                    if String::from_utf8_lossy(&data).contains("roundtrip-ok") {
                        echoed = true;
                        break;
                    }
                }
                Ok(TerminalEvent::Exit { .. }) => break,
                Err(_) => break,
            }
        }
        assert!(echoed, "shell echo never arrived through the channel");

        session.kill();
        manager.remove(1);
    }
}
