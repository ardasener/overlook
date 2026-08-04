## ADDED Requirements

### Requirement: Runnable launcher button
The application SHALL display a run button next to the new-terminal button in the tab bar. Clicking it SHALL open a popover with a search input and the list of runnables.

#### Scenario: Run button opens the launcher
- **WHEN** the user clicks the run button
- **THEN** a popover SHALL open showing a search input and the list of runnables

#### Scenario: Launcher filters by name
- **WHEN** the user types in the search input
- **THEN** the list SHALL filter to runnables whose name contains the query (case-insensitive)

#### Scenario: Runnable row shows its commands
- **WHEN** a runnable is listed
- **THEN** its row SHALL show the runnable's name and its commands as a subtitle

#### Scenario: Launch from the launcher
- **WHEN** the user clicks a runnable row (or presses Enter on the highlighted first match)
- **THEN** the runnable SHALL launch and the popover SHALL close

### Requirement: Runnable launch behavior
Launching a runnable SHALL create one tab per command in the runnable's command list, in the active worktree. The first tab SHALL be shown in the focused slot; additional tabs SHALL be parked in the tab bar. Each command SHALL be direct-executed (no shell wrapper) with its argv derived from a plain whitespace split.

#### Scenario: Single-command runnable opens one tab
- **WHEN** the user launches a runnable with one command
- **THEN** one tab SHALL open in the focused slot running that command in the active worktree's directory

#### Scenario: Multi-command runnable opens parked tabs
- **WHEN** the user launches a runnable with multiple commands
- **THEN** one tab SHALL open in the focused slot and the remaining tabs SHALL appear parked in the tab bar, all running in the active worktree's directory

#### Scenario: Launch target is the active worktree
- **WHEN** a runnable launches
- **THEN** every spawned command SHALL run with its working directory set to the active worktree's path

#### Scenario: Runnable tab title is the executable name
- **WHEN** a runnable tab is created
- **THEN** its title SHALL be the executable basename of its command (e.g. `btop`, `micro`, `opencode`), set deterministically at creation, and SHALL NOT be changed by the foreground-process auto-naming

#### Scenario: Runnable tab closes on process exit
- **WHEN** a runnable's process exits
- **THEN** its tab SHALL be removed from the layout

#### Scenario: Spawn failure shows an inline error
- **WHEN** a runnable command cannot be spawned (e.g. the executable is not installed)
- **THEN** the tab SHALL show an inline error message instead of a terminal

### Requirement: Runnable configuration
The settings modal SHALL include a "Runnables" section where the user can add, edit, and delete runnables. Each runnable SHALL have a name and a list of commands. The settings SHALL persist across restarts and SHALL be seeded with the defaults AI (`opencode`), Editor (`micro`), Monitor (`btop`), and Dev (`opencode`, `micro`, `btop`).

#### Scenario: Defaults on first launch
- **WHEN** the application runs for the first time
- **THEN** the runnables SHALL be AI, Editor, Monitor, and Dev with their default commands

#### Scenario: Add a runnable
- **WHEN** the user adds a runnable with a name and at least one command
- **THEN** it SHALL appear in the launcher list and persist across restarts

#### Scenario: Edit a runnable
- **WHEN** the user edits a runnable's name or commands
- **THEN** the launcher list SHALL reflect the changes and they SHALL persist

#### Scenario: Delete a runnable
- **WHEN** the user deletes a runnable
- **THEN** it SHALL be removed from the launcher list and stay removed across restarts

#### Scenario: Defaults are editable
- **WHEN** the user edits or deletes a seeded default runnable
- **THEN** the change SHALL be respected with no restore-defaults behavior
