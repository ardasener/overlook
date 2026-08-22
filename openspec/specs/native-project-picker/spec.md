## Purpose

Adds projects through the OS-native folder dialog instead of typed paths.

## Requirements

### Requirement: Native folder picker for adding projects
The add-project action SHALL open the platform's native folder-selection dialog. Selecting a directory SHALL add it as a project; canceling SHALL do nothing.

#### Scenario: Add project via native picker
- **WHEN** the user clicks the add-project button in the sidebar header
- **THEN** the native folder-selection dialog SHALL open
- **AND** no typed-path popover SHALL appear

#### Scenario: Picking a directory adds it
- **WHEN** the user selects a directory in the dialog
- **THEN** the directory SHALL be added as a project (canonicalized and deduplicated by the existing add-project logic)

#### Scenario: Canceling the dialog
- **WHEN** the user cancels the dialog
- **THEN** no project SHALL be added

#### Scenario: Non-git directories are addable
- **WHEN** the user selects a directory that is not a git repository
- **THEN** it SHALL still be added as a project
- **AND** it SHALL simply lack worktree functionality, with no error

#### Scenario: Picker failure surfaces a message
- **WHEN** the picked directory cannot be added (e.g. canonicalization fails)
- **THEN** a transient error message SHALL be shown and no project SHALL be added
