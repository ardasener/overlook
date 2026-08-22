## Purpose

Defines the app-drawn window frame on Linux and Windows: with OS decorations disabled, the application itself provides window controls, their placement, and title-bar behaviors so an undecorated window still behaves like a first-class desktop window.

## ADDED Requirements

### Requirement: Software window controls on Linux and Windows
On Linux and Windows the application SHALL disable OS window decorations and render its own minimize, maximize/restore, and close controls as part of the tab bar, styled consistently with the application's existing icon actions. macOS SHALL keep its current native traffic-light overlay with no changes.

#### Scenario: Controls replace the OS title bar
- **WHEN** the application launches on Linux or Windows
- **THEN** no OS-native title bar SHALL be shown, and the tab bar SHALL contain minimize, maximize, and close controls

#### Scenario: Minimize works
- **WHEN** the user clicks the minimize control
- **THEN** the window SHALL minimize

#### Scenario: Maximize works
- **WHEN** the user clicks the maximize control while the window is not maximized
- **THEN** the window SHALL maximize

#### Scenario: Restore works
- **WHEN** the user clicks the maximize control while the window is maximized
- **THEN** the window SHALL return to its pre-maximized size

#### Scenario: Close works
- **WHEN** the user clicks the close control
- **THEN** the window SHALL close

#### Scenario: macOS is unchanged
- **WHEN** the application runs on macOS
- **THEN** native traffic lights SHALL overlay the tab bar as before, and no software window controls SHALL be rendered

### Requirement: Maximize-state glyph
The maximize control SHALL visually reflect the window's maximized state.

#### Scenario: Glyph reflects maximized state
- **WHEN** the window is maximized
- **THEN** the maximize control SHALL render a restore glyph, and the standard maximize glyph otherwise

### Requirement: Window control position setting
The application SHALL let the user place the software window controls at the left edge or the right edge of the tab bar via an appearance setting, defaulting to the right edge. When controls are positioned left, the tab bar SHALL reserve a leading gutter so no other content renders beneath them.

#### Scenario: Controls default to the right
- **WHEN** the application starts on Linux or Windows with no stored position setting
- **THEN** the window controls SHALL render at the right edge of the tab bar

#### Scenario: Switching to the left edge
- **WHEN** the user selects "left" for the window control position
- **THEN** the controls SHALL move to the far-left edge of the tab bar immediately, ahead of all other tab-bar actions

#### Scenario: Glyph order follows the platform convention of the chosen edge
- **WHEN** the controls are positioned at the right edge
- **THEN** they SHALL read minimize · maximize · close (Windows order)
- **WHEN** the controls are positioned at the left edge
- **THEN** they SHALL read close · minimize · maximize (macOS traffic-light order)

#### Scenario: Left-positioned controls get a reserved gutter
- **WHEN** the controls are positioned at the left edge
- **THEN** no tab-strip content or actions SHALL render underneath them

#### Scenario: Position persists across restarts
- **WHEN** the user sets the control position and restarts the application
- **THEN** the controls SHALL render at the chosen edge on launch

### Requirement: Drag and double-click behavior preserved
The undecorated window SHALL remain draggable via the existing tab-bar drag regions, and double-clicking empty tab-bar space SHALL toggle maximize. The window-control buttons themselves SHALL NOT initiate drags.

#### Scenario: Dragging from empty bar space
- **WHEN** the user presses and drags on empty tab-bar space on Linux or Windows
- **THEN** the window SHALL move with the pointer

#### Scenario: Double-click toggles maximize
- **WHEN** the user double-clicks empty tab-bar space on Linux or Windows
- **THEN** the window SHALL toggle between maximized and restored

#### Scenario: Buttons do not drag the window
- **WHEN** the user presses on a window-control button and moves the pointer
- **THEN** the window SHALL NOT drag; the interaction resolves on the button
