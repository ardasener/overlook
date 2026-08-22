## Purpose

Owns the project list: adding/removing project directories, persistence, and rendering the workspace tree.

## Requirements

### Requirement: Project tree
The application SHALL display the tracked projects as a tree, each project containing a default worktree (the project directory itself) and any git worktrees managed by the application.

#### Scenario: Projects render with worktrees
- **WHEN** the sidebar is shown
- **THEN** each tracked project SHALL appear with its default worktree and its managed git worktrees nested beneath it

#### Scenario: Default worktree for every project
- **WHEN** a project is listed
- **THEN** it SHALL include a default worktree representing the project directory itself, regardless of whether the project is a git repository

### Requirement: Project actions move to a context menu
The application SHALL surface per-row actions through a right-click context menu instead of inline buttons: fork, rename, copy path, and remove for projects; copy path and delete for non-default worktrees. Favorites are toggled by a star button on the project row.

#### Scenario: Project row has a star and no inline action buttons
- **WHEN** a project row is rendered
- **THEN** it SHALL show a star button and SHALL NOT show inline fork/remove buttons

#### Scenario: Worktree row has no inline delete button
- **WHEN** a non-default worktree row is rendered
- **THEN** it SHALL NOT show an inline delete button (delete moves to the context menu)
### Requirement: Add and remove projects
The application SHALL let the user add a project directory via the `+` button and remove a project via the context menu (with confirmation).

#### Scenario: Add a valid directory
- **WHEN** the user enters an existing directory path via the `+` popover
- **THEN** the project SHALL be added to the list and appear in the tree

#### Scenario: Add rejects invalid paths
- **WHEN** the user enters a path that does not exist or is not a directory
- **THEN** an inline error SHALL be shown and the project SHALL NOT be added

#### Scenario: Remove confirms and untracks
- **WHEN** the user chooses Remove project from the context menu and confirms
- **THEN** the project SHALL be removed from the list, and its managed worktrees SHALL remain on disk but no longer be listed

#### Scenario: Projects persist across restarts
- **WHEN** the application restarts
- **THEN** the tracked project list SHALL be restored from the identifier-based config directory (e.g. `~/Library/Application Support/com.overlook.app/projects.json`), migrating the legacy `{config_dir}/overlook/projects.json` file on first load when present

### Requirement: Live search
The application SHALL filter the tree as the user types, matching project paths and worktree branch names.

#### Scenario: Project path matches
- **WHEN** the search matches a project's path
- **THEN** that project SHALL be shown with all of its worktrees

#### Scenario: Branch name matches
- **WHEN** the search matches a worktree's branch name
- **THEN** the owning project SHALL be shown with only the matching worktrees

### Requirement: Worktree forking
The application SHALL create new git worktrees for a project via the context-menu fork action, prompting for a branch name in a dialog.

#### Scenario: Fork creates a new branch
- **WHEN** the user enters a branch name that does not exist and confirms
- **THEN** a new branch SHALL be created from the project's default worktree HEAD and a managed worktree SHALL be created for it

#### Scenario: Fork with an existing branch requires confirmation
- **WHEN** the user enters a branch name that already exists
- **THEN** the user SHALL be asked whether to attach the worktree to the existing branch or cancel

#### Scenario: Fork disabled for non-git projects
- **WHEN** a project is not a git repository
- **THEN** no fork action SHALL be offered for it

### Requirement: Worktree discovery and pruning
The application SHALL discover managed worktrees by scanning the cache directory and prune stale entries.

#### Scenario: Externally created worktrees are adopted
- **WHEN** a directory matching a project's managed-worktree naming appears in the cache
- **THEN** it SHALL appear in that project's tree

#### Scenario: Vanished worktrees are pruned
- **WHEN** a managed worktree's directory no longer exists
- **THEN** it SHALL be removed from the tree (and git worktree metadata pruned)

### Requirement: Active worktree and per-worktree layouts
Selecting a worktree SHALL make it active: new terminals SHALL spawn in its directory, and each worktree SHALL retain its own tabs and split layout within the session.

#### Scenario: Selecting a worktree activates it
- **WHEN** the user clicks a worktree in the tree
- **THEN** it SHALL become the active worktree and its saved tabs and layout SHALL be shown

#### Scenario: New terminals spawn in the active worktree
- **WHEN** a new terminal is created while a worktree is active
- **THEN** its shell SHALL start with its working directory set to that worktree's path

#### Scenario: Switching worktrees preserves live sessions
- **WHEN** the user switches from one worktree to another
- **THEN** the previous worktree's shell sessions SHALL keep running and its layout SHALL be restored when switching back

#### Scenario: Layouts are session-scoped
- **WHEN** the application restarts
- **THEN** tabs and layouts SHALL reset (only the project list persists)
