## Purpose

Adds a right-click menu on projects for rename, favorite, and management actions.

## Requirements

### Requirement: Right-click context menu on projects
The application SHALL show a context menu when the user right-clicks a project row, with actions to fork a worktree, rename the project, copy its path, and remove it.

#### Scenario: Fork from the context menu
- **WHEN** the user right-clicks a project and chooses Fork worktree…
- **THEN** a fork dialog SHALL open with the existing branch-name and branch-exists handling, and creating the worktree SHALL proceed as before

#### Scenario: Copy project path
- **WHEN** the user right-clicks a project and chooses Copy path
- **THEN** the project's full absolute path SHALL be written to the clipboard

#### Scenario: Remove from the context menu
- **WHEN** the user right-clicks a project and chooses Remove project
- **THEN** the existing remove confirmation SHALL be shown and removal SHALL proceed as before

### Requirement: Right-click context menu on worktrees
The application SHALL show a context menu when the user right-clicks a worktree row. Non-default worktrees SHALL offer copy-path and delete actions; the default worktree SHALL offer copy-path only.

#### Scenario: Copy worktree path
- **WHEN** the user right-clicks a worktree and chooses Copy path
- **THEN** the worktree's full absolute path SHALL be written to the clipboard

#### Scenario: Delete non-default worktree
- **WHEN** the user right-clicks a non-default worktree and chooses Delete worktree
- **THEN** the existing dirty-check and confirmation flow SHALL run, and deletion SHALL proceed as before

#### Scenario: No delete on the default worktree
- **WHEN** the user right-clicks the default worktree
- **THEN** the menu SHALL NOT offer a delete action

### Requirement: Copy path uses the system clipboard
The application SHALL write paths to the system clipboard through the clipboard plugin, granted write-only permission.

#### Scenario: Clipboard write succeeds
- **WHEN** a copy-path action runs
- **THEN** the full absolute path SHALL be on the system clipboard

#### Scenario: Clipboard permission is write-only
- **WHEN** the application's capabilities are inspected
- **THEN** the clipboard permission SHALL include write access and SHALL NOT include read access
