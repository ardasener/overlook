## ADDED Requirements

### Requirement: Drag tabs onto panes
The application SHALL let the user drag a tab from the tab bar onto a pane slot, assigning that tab to the pane. If the dragged tab was already shown in another pane, the two panes SHALL swap their tabs.

#### Scenario: Drag a parked tab onto a pane
- **WHEN** the user drags a tab that is not currently shown in any pane onto a pane
- **THEN** that tab SHALL appear in the pane and the pane's previous tab SHALL park (remain alive in the tab bar)

#### Scenario: Drag a shown tab onto another pane swaps them
- **WHEN** the user drags a tab that is currently shown in pane A onto pane B
- **THEN** pane A SHALL receive pane B's tab and pane B SHALL receive the dragged tab

#### Scenario: Drop target highlights
- **WHEN** the user drags a tab over a pane
- **THEN** the pane SHALL show a drop highlight until the drag leaves or the tab is dropped

### Requirement: Active pane indication
The application SHALL visually distinguish the focused pane by dimming the accent border of non-focused panes, and clicking inside a pane SHALL make it focused.

#### Scenario: Non-focused panes have dimmed borders
- **WHEN** more than one pane is visible
- **THEN** the focused pane SHALL render its accent border at full brightness and the other panes' accent borders SHALL be dimmed, while their terminal content remains at full brightness

#### Scenario: Clicking a terminal focuses its pane
- **WHEN** the user clicks inside a pane's terminal
- **THEN** that pane SHALL become the focused pane (and the border dimming SHALL shift accordingly)

### Requirement: Per-pane font zoom
The application SHALL zoom the terminal font of the pane under the pointer with Ctrl/Cmd + mouse wheel (or the equivalent trackpad pinch), relative to a configurable default font size.

#### Scenario: Zoom in and out
- **WHEN** the user holds Ctrl or Cmd and scrolls up over a pane
- **THEN** that pane's terminal font SHALL increase by one step; scrolling down SHALL decrease it by one step

#### Scenario: Zoom is bounded
- **WHEN** zooming reaches the bounds of the allowed font size range (8–24)
- **THEN** further zoom in the same direction SHALL be a no-op

#### Scenario: Zoom is per-pane and relative to the default
- **WHEN** the user zooms a pane's font
- **THEN** only that pane's font SHALL change, and changing the default font size in settings SHALL shift every pane's size while preserving each pane's relative zoom

#### Scenario: Zoom does not zoom the page
- **WHEN** the user zooms with Ctrl/Cmd + wheel over a terminal
- **THEN** the application page SHALL NOT zoom (the webview zoom SHALL be suppressed)

### Requirement: Default font size setting
The settings option for the terminal font size SHALL be labeled "Default font size" and SHALL define the baseline that per-pane zoom is relative to.

#### Scenario: Label is Default font size
- **WHEN** the settings modal is opened
- **THEN** the terminal size control SHALL be labeled "Default font size"

### Requirement: Automatic tab titles
The application SHALL title tabs from the process running in them, falling back to the default shell name (e.g. "zsh") when the terminal is idle. New tabs SHALL default to the shell name — the "Terminal N" naming is retired.

#### Scenario: Title follows the running process
- **WHEN** a process (e.g., `vim`, `npm`) is running in the foreground of a terminal
- **THEN** the tab's title SHALL reflect that process's name

#### Scenario: Idle terminals keep the default title
- **WHEN** a terminal is idle (only the shell is running)
- **THEN** the tab SHALL keep its shell-name title (e.g. "zsh")

#### Scenario: New tabs default to the shell name
- **WHEN** a tab is created via the `+` button or by opening a split with no parked terminals
- **THEN** the new tab SHALL be titled with the shell name (e.g. "zsh"), not a numeric placeholder
