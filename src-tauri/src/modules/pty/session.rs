//! A single PTY session: portable-pty handles, the reader/waiter threads, and
//! platform-aware shell resolution.
//!
//! Modeled on Terax's proven pattern: the kill handle (`ChildKiller`) is split
//! from the child handle — the waiter thread owns the child and blocks in
//! `wait()`, while `pty_close` kills through the killer without touching the
//! child, avoiding deadlock.

use std::collections::HashMap;
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
    /// PID of the spawned shell, captured at spawn (the child handle itself
    /// moves into the waiter thread). Used for foreground-process resolution.
    pub shell_pid: Option<u32>,
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

/// Shell command names that may wrap the actual command (`sh -c 'npm …'`).
/// The walk descends through these to find the process the user launched.
fn is_shell_comm(comm: &str) -> bool {
    matches!(
        comm,
        "sh" | "bash" | "zsh" | "fish" | "dash" | "ksh" | "tcsh" | "csh"
    )
}

/// Resolve the name of the foreground process of `shell_pid` from raw `ps`
/// output lines (one "pid ppid comm" per line, no header). Returns the first
/// non-shell descendant (the process the user launched), or `None` when the
/// shell is idle (no descendants).
///
/// Descending only through shell wrappers — never through the launched
/// process's own children (e.g. vim's language servers) — keeps titles as the
/// main process name. The lowest-pid child wins at each level.
///
/// The shell pid's OWN comm is checked first: when a command was launched via
/// `zsh -c "<cmd>"`, the shell `exec`s the command and `shell_pid` IS the
/// command (e.g. `btop`), with no children — so the command name comes from
/// the pid itself rather than a child walk.
pub fn parse_ps_output(ps_lines: &str, shell_pid: u32) -> Option<String> {
    let mut children: HashMap<u32, Vec<(u32, String)>> = HashMap::new();
    let mut own_comm: Option<String> = None;
    for line in ps_lines.lines() {
        let mut fields = line.split_whitespace();
        let (Some(pid), Some(ppid)) = (fields.next(), fields.next()) else {
            continue;
        };
        let (Ok(pid), Ok(ppid)) = (pid.parse::<u32>(), ppid.parse::<u32>()) else {
            continue;
        };
        let comm = fields.collect::<Vec<_>>().join(" ");
        // macOS `ps` may report a full executable path in comm; titles and
        // shell-wrapper detection want the basename. Titles are always
        // lowercase.
        let comm = std::path::Path::new(&comm)
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or(comm)
            .to_lowercase();
        if pid == shell_pid {
            own_comm = Some(comm.clone());
        }
        children.entry(ppid).or_default().push((pid, comm));
    }
    for kids in children.values_mut() {
        kids.sort_by_key(|(pid, _)| *pid);
    }

    // The shell pid's own name is the command when the shell exec'd it
    // (e.g. `zsh -c "btop"` becomes btop). Only trust it when it's NOT a
    // shell; otherwise fall through to the child walk.
    if let Some(comm) = own_comm {
        if !is_shell_comm(&comm) {
            return Some(comm);
        }
    }

    let mut current = shell_pid;
    while let Some(kids) = children.get(&current) {
        let (child_pid, comm) = kids.first()?;
        if is_shell_comm(comm) {
            // Shell wrapper — descend into it.
            current = *child_pid;
            continue;
        }
        // First non-shell descendant is the foreground process.
        return Some(comm.clone());
    }
    None
}

/// Resolve the name of the process running in the foreground of `shell_pid`'s
/// tree by asking `ps`. Unix-only; returns `None` elsewhere.
#[cfg(unix)]
pub fn foreground_process(shell_pid: u32) -> Option<String> {
    let output = std::process::Command::new("ps")
        .args(["-axo", "pid=,ppid=,comm="])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    parse_ps_output(&String::from_utf8_lossy(&output.stdout), shell_pid)
}

#[cfg(not(unix))]
pub fn foreground_process(_shell_pid: u32) -> Option<String> {
    None
}

/// Open a PTY, spawn the shell (or run a command through it) in the PTY, and
/// start the io threads. Returns the session; the caller registers it with
/// the manager.
pub fn spawn_session(
    id: u32,
    cwd: Option<String>,
    size: PtySize,
    on_event: Channel<TerminalEvent>,
    manager: PtyManager,
    command: Option<String>,
) -> Result<Arc<Session>, String> {
    let pty_system = native_pty_system();
    let pair = pty_system.openpty(size).map_err(|e| e.to_string())?;

    let mut cmd = match command {
        // Runnable app: run the command through the interactive shell so
        // functions/aliases and the shell's environment are available. `-c`
        // makes the shell exit when the command finishes, preserving
        // close-on-exit.
        Some(command) => {
            let mut builder = CommandBuilder::new(resolve_shell());
            builder.args(["-i", "-c", &command]);
            builder
        }
        None => CommandBuilder::new(resolve_shell()),
    };
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    }
    // Advertise a capable terminal so CLI apps enable truecolor and (where
    // supported) transparency instead of falling back to a solid background
    // color that hides the wallpaper. Matches what other terminal apps set.
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");
    cmd.env("OVERLOOK_TERMINAL", "1");
    // rxvt-family convention: foreground index;background. "default" signals
    // a transparent/default background so TUIs don't paint a solid one.
    cmd.env("COLORFGBG", "15;default");
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
        shell_pid: child.process_id(),
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

        let session = spawn_session(1, None, PtySize::default(), channel, manager.clone(), None).unwrap();

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

    /// A command session (runnable apps) must run the command through the
    /// interactive shell and stream its output through the Channel.
    #[test]
    fn command_session_executes_through_shell() {
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

        let command = "echo run-test-ok".to_string();
        let session =
            spawn_session(2, None, PtySize::default(), channel, manager.clone(), Some(command)).unwrap();

        let deadline = std::time::Instant::now() + Duration::from_secs(5);
        let mut saw_output = false;
        while std::time::Instant::now() < deadline {
            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(TerminalEvent::Output { data, .. }) => {
                    if String::from_utf8_lossy(&data).contains("run-test-ok") {
                        saw_output = true;
                        break;
                    }
                }
                Ok(TerminalEvent::Exit { .. }) => break,
                Err(_) => break,
            }
        }
        assert!(saw_output, "command output never arrived through the channel");

        session.kill();
        manager.remove(2);
    }

    /// The shell is the leaf → idle terminal → no process name.
    #[test]
    fn ps_parser_shell_leaf_is_none() {
        let ps = "  100  1  zsh\n  50   1  launchd\n";
        assert_eq!(parse_ps_output(ps, 100), None);
    }

    /// The shell pid's own comm is a non-shell command (the shell exec'd the
    /// command, e.g. `zsh -c "btop"` becomes btop) → that is the foreground
    /// process, with no child walk needed.
    #[test]
    fn ps_parser_exec_command_is_the_foreground_process() {
        let ps = "  100  1  btop\n  50   1  launchd\n";
        assert_eq!(parse_ps_output(ps, 100).as_deref(), Some("btop"));
    }

    /// One direct child → its name is the foreground process.
    #[test]
    fn ps_parser_direct_child() {
        let ps = "  100  1  zsh\n  101  100 vim\n";
        assert_eq!(parse_ps_output(ps, 100).as_deref(), Some("vim"));
    }

    /// Deep nesting: descends through shell wrappers but stops at the first
    /// non-shell process (the launched command, not its children).
    #[test]
    fn ps_parser_first_non_shell_descendant() {
        let ps = "  100  1  zsh\n  101  100 sh\n  102  101 npm\n  103  102 node\n";
        assert_eq!(parse_ps_output(ps, 100).as_deref(), Some("npm"));
    }

    /// A process with its own children (e.g. vim → language server) stops at
    /// the main process, not the subprocess.
    #[test]
    fn ps_parser_stops_at_main_process_not_subprocess() {
        let ps = "  100  1  zsh\n  101  100 vim\n  102  101 node\n  103  102 copilot-lsp\n";
        assert_eq!(parse_ps_output(ps, 100).as_deref(), Some("vim"));
    }

    /// Lowest-pid child wins at each level.
    #[test]
    fn ps_parser_prefers_lowest_pid_child() {
        let ps = "  100  1  zsh\n  102  100 node\n  101  100 vim\n";
        assert_eq!(parse_ps_output(ps, 100).as_deref(), Some("vim"));
    }

    /// Full executable paths in comm are reduced to their basename (and paths
    /// on shell wrappers still descend correctly).
    #[test]
    fn ps_parser_reduces_paths_to_basename() {
        let ps = "  100  1  zsh\n  101  100 /opt/homebrew/bin/vim\n";
        assert_eq!(parse_ps_output(ps, 100).as_deref(), Some("vim"));

        let ps2 = "  100  1  zsh\n  101  100 /bin/sh\n  102  101 /usr/bin/npm\n";
        assert_eq!(parse_ps_output(ps2, 100).as_deref(), Some("npm"));
    }

    /// Titles are always lowercase.
    #[test]
    fn ps_parser_lowercases_comm() {
        let ps = "  100  1  zsh\n  101  100 Vim\n";
        assert_eq!(parse_ps_output(ps, 100).as_deref(), Some("vim"));
    }

    /// Malformed lines are skipped; empty input yields None.
    #[test]
    fn ps_parser_tolerates_garbage() {
        let ps = "garbage line\n  100  1  zsh\n\n  notpid  100 vim\n  101  100 ls\n";
        assert_eq!(parse_ps_output(ps, 100).as_deref(), Some("ls"));
        assert_eq!(parse_ps_output("", 100), None);
        assert_eq!(parse_ps_output("  onlyone  1  field\n", 100), None);
    }
}
