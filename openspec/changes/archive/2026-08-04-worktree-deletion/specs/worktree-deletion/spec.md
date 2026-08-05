## ADDED Requirements

### Requirement: Removing a project removes symlinked paths
Removing a project SHALL remove its stored entry even when the stored path and the input path differ by symlink resolution.

#### Scenario: Symlinked path project is removed
- **WHEN** the user removes a project whose stored path resolves through a symlink (e.g. macOS `/tmp` → `/private/tmp`)
- **THEN** the entry SHALL be removed from the stored project list
- **AND** the project SHALL NOT reappear on the next workspace refresh

### Requirement: Worktree deletion
The workspace SHALL let the user delete a managed (non-default) worktree while keeping the project.

#### Scenario: Delete button on non-default worktrees
- **WHEN** a non-default worktree row is shown
- **THEN** it SHALL have a delete action

#### Scenario: Default worktree has no delete action
- **WHEN** the default worktree (the project directory itself) is shown
- **THEN** it SHALL NOT have a delete action (removal happens via project removal)

#### Scenario: Clean worktree removes immediately
- **WHEN** the user deletes a worktree with no uncommitted changes
- **THEN** the worktree SHALL be removed and the workspace list SHALL refresh

#### Scenario: Dirty worktree prompts for force removal
- **WHEN** the user deletes a worktree with uncommitted changes
- **THEN** a confirmation SHALL be shown offering Force remove and Cancel
- **AND** the worktree SHALL NOT be removed until the user confirms

#### Scenario: Force remove deletes the worktree
- **WHEN** the user confirms Force remove on a dirty worktree
- **THEN** the worktree SHALL be removed (including its cache directory) and the workspace list SHALL refresh

#### Scenario: Removing a worktree validates its location
- **WHEN** a worktree path is removed
- **THEN** the command SHALL only act on paths under the app's cache directory with the project's `overlook-<hash>-` prefix
