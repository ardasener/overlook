## ADDED Requirements

### Requirement: Shell execution of runnables
Runnable commands SHALL execute through the interactive shell rather than being direct-executed, so shell functions, aliases, and environment from the shell's startup files are available.

#### Scenario: Command string runs through the interactive shell
- **WHEN** a runnable is launched
- **THEN** each command SHALL be executed as `<resolved-shell> -i -c "<command>"`
- **AND** the command string SHALL be passed whole (not split into argv)

#### Scenario: Shell functions and aliases work
- **WHEN** a runnable's command is a shell function or alias defined in the shell startup files (e.g. `op`)
- **THEN** it SHALL execute successfully

#### Scenario: Close-on-exit still applies
- **WHEN** the executed command finishes
- **THEN** the shell SHALL exit and the tab SHALL close

### Requirement: Auto-titling for runnable tabs
Runnable tabs SHALL use the same foreground-process auto-titling as shell tabs; the title SHALL reflect the process actually running in the tab.

#### Scenario: Runnable tab titled by foreground process
- **WHEN** a runnable tab is shown and its command is running
- **THEN** the tab title SHALL be the foreground process name (e.g. `op` or `opencode`), updated as the foreground process changes

#### Scenario: Deterministic exe-name titles removed
- **WHEN** a runnable tab is created
- **THEN** its title SHALL NOT be a fixed executable basename derived from the command; it SHALL be managed by the auto-title poller like shell tabs
