## MODIFIED Requirements

### Requirement: Shell PTY spawn on app launch
The system SHALL spawn the user's default shell in a pseudo-terminal when the application starts, and display the running shell in the terminal pane. The spawned shell SHALL be given a UTF-8 locale when the inherited environment does not provide one.

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

#### Scenario: Shell is spawned with a UTF-8 locale
- **WHEN** the application is launched from an environment without a locale set (e.g. the macOS GUI/launchd environment)
- **THEN** `spawn_session` SHALL set a UTF-8 locale (`LANG` and/or `LC_ALL`) on the child shell so that shell prompt-width accounting (`wcwidth`) matches xterm's rendering

#### Scenario: Existing locale is preserved
- **WHEN** the application is launched from an environment that already has a UTF-8 locale set
- **THEN** `spawn_session` SHALL NOT override it
