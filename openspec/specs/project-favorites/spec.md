## Purpose

Lets users star projects so favorites sort first in the workspace tree and persist across restarts.

## Requirements

### Requirement: Favorite projects
The application SHALL let the user toggle a favorite state on each project via a star button. Favorited projects SHALL sort above non-favorited projects, and within each group projects SHALL be ordered alphabetically by their display name.

#### Scenario: Star toggles favorite
- **WHEN** the user clicks the star on a project row
- **THEN** the project SHALL toggle between favorited and not favorited, and the star icon SHALL switch between filled and empty

#### Scenario: Favorites sort first
- **WHEN** the workspace tree is rendered with both favorited and non-favorited projects
- **THEN** favorited projects SHALL appear before non-favorited ones, each group sorted alphabetically by display name

#### Scenario: Favorite persists
- **WHEN** the application restarts
- **THEN** each project's favorite state SHALL be restored from the projects file

### Requirement: Project display names
The application SHALL let the user assign a custom display name to a project via a rename dialog. The display name SHALL replace the directory basename in the tree and cleanup modal; clearing it SHALL revert to the basename.

#### Scenario: Rename a project
- **WHEN** the user enters a display name in the rename dialog and confirms
- **THEN** the project SHALL show that name in the tree and the cleanup modal, with the full path still shown on hover

#### Scenario: Clear a display name
- **WHEN** the user submits an empty display name in the rename dialog
- **THEN** the project SHALL revert to its directory basename

#### Scenario: Display name persists
- **WHEN** the application restarts
- **THEN** each project's display name SHALL be restored from the projects file

### Requirement: Long project names truncate
The application SHALL truncate project display names to 20 characters total (including the trailing `…`) so long names never push row actions off-screen.

#### Scenario: Short names render fully
- **WHEN** a display name is 20 characters or fewer
- **THEN** it SHALL render without truncation

#### Scenario: Long names truncate with ellipsis
- **WHEN** a display name is longer than 20 characters
- **THEN** it SHALL render as the first 17 characters plus `…` (20 total), with the full name on hover

### Requirement: Projects file stores structured entries
The projects file SHALL store each project as an entry with its path, favorite flag, and optional display name, while remaining backward-compatible with existing string-only files.

#### Scenario: Legacy string-only file loads
- **WHEN** the projects file contains plain path strings (pre-change format)
- **THEN** the projects SHALL load with favorite=false and no display name

#### Scenario: Structured entries round-trip
- **WHEN** a project is favorited or renamed and the file is saved
- **THEN** the file SHALL contain the structured entry with the updated favorite and displayName fields
