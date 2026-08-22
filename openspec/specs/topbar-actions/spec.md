## Purpose

Provides the tab bar's action buttons — splits, launcher, cleanup, settings — as compact icon controls.

## Requirements

### Requirement: Top bar hosts settings and workspace controls
The application SHALL group the settings action and the workspace-panel toggle with the existing new-terminal and split-toggle buttons on the right side of the tab bar, above the workspace panel.

#### Scenario: Settings action in the top bar
- **WHEN** the user clicks the settings icon in the top bar
- **THEN** the settings modal SHALL open

#### Scenario: No settings action in the sidebar
- **WHEN** the workspace panel is shown
- **THEN** its header SHALL show only the search input and the add-project button, with no settings button

### Requirement: Workspace panel toggle
The application SHALL let the user show and hide the workspace panel with a toggle button in the top bar. Hiding the panel SHALL dock-collapse it: the workspace panel SHALL slide away within the layout and the terminal area SHALL expand to fill the freed space, never being covered by an overlay.

#### Scenario: Hiding the workspace panel expands the terminal
- **WHEN** the user clicks the workspace-toggle icon while the panel is open
- **THEN** the panel SHALL slide closed and the terminal area SHALL expand to fill the window

#### Scenario: Showing the workspace panel restores the terminal width
- **WHEN** the user clicks the workspace-toggle icon while the panel is closed
- **THEN** the panel SHALL slide open and the terminal area SHALL shrink to its original width

#### Scenario: Toggle icon reflects panel state
- **WHEN** the panel is open
- **THEN** the toggle icon SHALL render in the "close" state, and in the "open" state when the panel is closed

#### Scenario: Panel starts open each launch
- **WHEN** the application starts
- **THEN** the workspace panel SHALL be open, regardless of how it was left in the previous session
