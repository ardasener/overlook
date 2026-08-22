## Purpose

Offers a one-click sweep that closes leftover sessions and cleans managed worktree state.

## Requirements

### Requirement: Cleanup action in the tab bar
The tab bar SHALL include a left action group before the tab strip on all platforms, containing (in order) the workspace toggle, settings, and a cleanup button. On macOS, space SHALL additionally be reserved before the group for the window traffic lights. The cleanup button SHALL open the workspace cleanup modal.

#### Scenario: Left action group on all platforms
- **WHEN** the tab bar is shown
- **THEN** the workspace toggle, settings, and cleanup buttons SHALL appear in a left action group before the tab strip

#### Scenario: macOS traffic-light space
- **WHEN** the app runs on macOS
- **THEN** space SHALL be reserved before the left action group for the traffic lights

#### Scenario: Clicking opens the modal
- **WHEN** the user clicks the cleanup button
- **THEN** the cleanup modal SHALL open

### Requirement: Cleanup modal with worktree checkboxes
The cleanup modal SHALL show a tree of every worktree (projects with their worktrees), mirroring the workspace sidebar without the add/fork/delete buttons. Each worktree SHALL have a checkbox. Select-all and select-none buttons SHALL be provided. By default every worktree SHALL be checked except the active worktree.

#### Scenario: Worktrees are listed with checkboxes
- **WHEN** the cleanup modal is open
- **THEN** each worktree SHALL appear with a checkbox, grouped under its project

#### Scenario: Default selection excludes the active worktree
- **WHEN** the cleanup modal is open
- **THEN** all worktrees SHALL be checked except the active worktree

#### Scenario: Active worktree cannot be selected
- **WHEN** the user attempts to check the active worktree
- **THEN** it SHALL remain unchecked

#### Scenario: Select all / none
- **WHEN** the user clicks the select-all button
- **THEN** all selectable worktrees SHALL be checked; select-none SHALL uncheck them

### Requirement: Close terminals action
The modal SHALL provide a "Close terminals" action that closes all open terminals in the checked worktrees, keeping the worktrees themselves.

#### Scenario: Close terminals clears checked worktrees
- **WHEN** the user clicks Close terminals
- **THEN** every open terminal in the checked worktrees SHALL be closed
- **AND** the worktrees SHALL remain (nothing removed from disk or the app)

#### Scenario: Applies to default worktrees too
- **WHEN** a checked worktree is a default worktree (project root)
- **THEN** its terminals SHALL also be closed

### Requirement: Delete worktrees action
The modal SHALL provide a "Delete" action that closes the checked worktrees' terminals and removes the checked worktrees that live in the app's cache folder. Default worktrees (project roots) SHALL never be removed by this feature. A disclaimer SHALL state that deletion is not recoverable and project directories are never touched.

#### Scenario: Delete removes cache worktrees
- **WHEN** the user confirms Delete
- **THEN** checked worktrees under the app cache SHALL be removed via the worktree-removal command
- **AND** their terminals SHALL be closed

#### Scenario: Default worktrees are never deleted
- **WHEN** a checked worktree is a default worktree (project root)
- **THEN** it SHALL NOT be removed from the app or disk, regardless of the Delete action

#### Scenario: Deletion is confirmed
- **WHEN** the user clicks Delete
- **THEN** a confirmation SHALL be shown before any worktree is removed

#### Scenario: Disclaimer is shown
- **WHEN** the modal is open
- **THEN** a message SHALL state that deletion is not recoverable and that project directories are never removed (project removal is done via the sidebar trash icons)
