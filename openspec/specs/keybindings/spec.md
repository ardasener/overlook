## Purpose

Gives every app action a user-configurable keyboard shortcut (primary + alternative), protected from capture by focused terminals.

## Requirements

### Requirement: Keyboard shortcuts for all actions
The application SHALL support keyboard shortcuts for: focusing each panel slot and the workspace sidebar, moving between tabs, toggling the vertical and bottom splits, toggling the workspace sidebar, opening a new terminal, opening the runnable launcher, closing the active tab, and zooming the terminal font in/out.

#### Scenario: Shortcuts dispatch actions
- **WHEN** the user presses a configured shortcut
- **THEN** the corresponding action SHALL run (focus, tab switch, toggle, open, close, or zoom)

#### Scenario: Shortcuts never reach TUIs
- **WHEN** a configured shortcut is pressed while a terminal is focused
- **THEN** the shortcut SHALL be handled by the app
- **AND** the terminal SHALL NOT receive the key events

### Requirement: Default bindings
The application SHALL ship with a default binding for every action. The `Cmd` token SHALL resolve to the macOS Command key and to `Ctrl` elsewhere; a literal `Ctrl` token SHALL always mean the Control key (used for the tab-navigation alternatives).

#### Scenario: Defaults match the documented map
- **WHEN** the app runs for the first time
- **THEN** each action SHALL use its documented default primary (and alt where specified)

#### Scenario: Alt binding works
- **WHEN** an action has an alternative binding
- **THEN** pressing either the primary or the alternative SHALL trigger the action

#### Scenario: Literal Ctrl binding matches the Control key on macOS
- **WHEN** an action's alternative is `Ctrl+Tab` and the user presses Control+Tab on macOS
- **THEN** the action SHALL trigger

### Requirement: Focused workspace supports arrow-key navigation
Focusing the workspace panel (Cmd+4) SHALL focus the panel's search input, and arrow keys from there SHALL navigate the project/worktree tree.

#### Scenario: Focus puts the cursor in the search input
- **WHEN** the user presses the focus-workspace shortcut
- **THEN** the workspace panel SHALL open if collapsed
- **AND** the search input SHALL receive keyboard focus

#### Scenario: Arrow keys navigate the tree
- **WHEN** the search input is focused and the user presses ArrowDown or ArrowUp
- **THEN** the highlight SHALL move to the next or previous tree node (project or worktree), wrapping at the ends

#### Scenario: Enter activates the highlighted worktree
- **WHEN** the highlighted node is a worktree and the user presses Enter
- **THEN** that worktree SHALL become the active worktree

### Requirement: Configurable bindings
The settings modal SHALL include a Keybindings tab where every action's primary and alternative binding can be re-recorded by pressing keys.

#### Scenario: Re-record a binding
- **WHEN** the user clicks a binding in the Keybindings tab
- **THEN** the row SHALL enter recording mode
- **AND** the next key press with at least a `Cmd`/`Ctrl` modifier SHALL save the combo as the binding

#### Scenario: Recording requires a modifier
- **WHEN** the user presses a key without `Cmd`/`Ctrl` while recording
- **THEN** the binding SHALL NOT be saved (to protect TUI key usage)

#### Scenario: Cancel recording
- **WHEN** the user presses Escape while recording a primary binding
- **THEN** recording SHALL cancel and the previous binding SHALL be kept

#### Scenario: Clear alternative binding
- **WHEN** the user presses Escape while recording an alternative binding
- **THEN** the alternative binding SHALL be cleared (only the primary remains) and recording SHALL end

### Requirement: Reset to defaults
The Keybindings tab SHALL provide a Reset to defaults control that restores every action's default bindings.

#### Scenario: Reset restores defaults
- **WHEN** the user clicks Reset to defaults
- **THEN** all actions SHALL use their default bindings again

### Requirement: Runnable launcher keyboard navigation
The runnable launcher SHALL support arrow-key navigation of its list while the search input is focused.

#### Scenario: Arrow keys move the launcher highlight
- **WHEN** the launcher search input is focused and the user presses ArrowDown or ArrowUp
- **THEN** the highlighted runnable SHALL move to the next or previous row, wrapping at the ends

#### Scenario: Enter launches the highlighted runnable
- **WHEN** the user presses Enter while a runnable is highlighted
- **THEN** that runnable SHALL launch
