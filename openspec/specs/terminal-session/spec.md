## ADDED Requirements

### Requirement: Shell PTY spawn on app launch
The system SHALL spawn the user's default shell in a pseudo-terminal when the application starts, and display the running shell in the terminal pane.

#### Scenario: Default shell is spawned
- **WHEN** the application window opens
- **THEN** an interactive shell process SHALL be running in a PTY and its output SHALL appear in the terminal pane

#### Scenario: Shell resolved from environment when usable
- **WHEN** the `SHELL` environment variable is set and points to an existing, executable shell binary
- **THEN** that shell SHALL be used

#### Scenario: Platform default used when SHELL is unset or unusable
- **WHEN** `SHELL` is unset, or is set but does not point to an existing executable
- **THEN** the platform default SHALL be used: PowerShell (`pwsh.exe` then `powershell.exe`) on Windows, `/bin/zsh` on macOS, and `/bin/bash` elsewhere

#### Scenario: Shell is interactive
- **WHEN** the shell is spawned
- **THEN** it SHALL be attached to a real PTY (not a pipe), so interactive programs and TUIs work correctly

### Requirement: Shell output renders in the terminal
The system SHALL stream shell output from the PTY to the xterm.js instance, rendering it as text in the terminal pane.

#### Scenario: Command output appears
- **WHEN** the user runs a command in the terminal (e.g., typing `echo hello` and pressing Enter)
- **THEN** the command's output SHALL appear in the xterm.js terminal

#### Scenario: Prompt renders on launch
- **WHEN** the shell finishes its startup
- **THEN** the shell's prompt SHALL be visible in the terminal pane

### Requirement: Keyboard input reaches the shell
The system SHALL forward keyboard input from the terminal pane to the shell's PTY.

#### Scenario: Typing is echoed
- **WHEN** the user types characters in the terminal
- **THEN** those characters SHALL be delivered to the shell and echoed back (visible in the terminal)

#### Scenario: Enter executes a command
- **WHEN** the user presses Enter after typing a command
- **THEN** the command SHALL be executed by the shell

### Requirement: Terminal resize propagates to the PTY
When the terminal pane is resized, the system SHALL inform the kernel (and thus the shell) of the new dimensions.

#### Scenario: Window resize updates shell dimensions
- **WHEN** the application window is resized
- **THEN** the PTY's column and row count SHALL be updated to match the new terminal dimensions within the pane

### Requirement: Session teardown on close
When the terminal is closed (app exit or explicit session close), the system SHALL terminate the shell process.

#### Scenario: Shell is killed on app close
- **WHEN** the application exits or the terminal session is explicitly closed
- **THEN** the shell child process SHALL be terminated and the session removed from the backend registry
