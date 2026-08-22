## Purpose

Renders each session as a closable tag in the tab strip, with active-state and overflow scrolling.

## Requirements

### Requirement: Tag-based tab strip
The tab bar SHALL render tabs as a horizontal row of AntD `Tag` pills instead of AntD `Tabs`. Each tag SHALL show the tab title, a close button, and the slot accent color of the tab's panel (bold-tinted when the tab is focused, muted otherwise).

#### Scenario: Tabs render as tags
- **WHEN** the tab bar is shown
- **THEN** each tab SHALL appear as an AntD `Tag` pill with its title, close button, and slot accent styling

#### Scenario: Click selects the tab
- **WHEN** the user clicks a tag
- **THEN** its tab SHALL become the focused tab

#### Scenario: Close button closes the tab
- **WHEN** the user clicks a tag's close button
- **THEN** the tab SHALL be closed and its session terminated

#### Scenario: Dragging a tag starts a tab drag
- **WHEN** the user presses a tag and moves more than the drag threshold
- **THEN** the existing pointer-based tab drag SHALL begin, with the tag as the drag source

### Requirement: Overflow scrolling without scrollbars
The tab strip SHALL keep a single row. When tabs overflow the available width, the strip SHALL scroll horizontally with no visible scrollbar, and the mouse wheel SHALL scroll the strip naturally.

#### Scenario: Wheel scrolls an overflowing strip
- **WHEN** the mouse wheel is used over a tab strip whose content overflows
- **THEN** the strip SHALL scroll horizontally (in the wheel's direction)
- **AND** no scrollbar SHALL be visible

#### Scenario: Non-overflowing strip ignores wheel
- **WHEN** the mouse wheel is used over a tab strip whose content fits
- **THEN** the strip SHALL NOT scroll

### Requirement: Active tab scrolls into view
The tab strip SHALL bring the newly focused tab into view whenever the focused tab changes.

#### Scenario: Focused tab auto-scrolls into view
- **WHEN** the focused tab changes (click, new tab, runnable launch)
- **THEN** the strip SHALL scroll so the focused tab is visible

### Requirement: Drag disables window-wide text selection
While a tab drag is active, the application SHALL prevent native text selection anywhere in the window so the drag is not interrupted.

#### Scenario: No text selection during drag
- **WHEN** a tab drag is in progress and the pointer moves over selectable text (e.g. the workspace sidebar)
- **THEN** no text SHALL become selected
- **AND** the drag SHALL continue tracking the pointer and complete normally
