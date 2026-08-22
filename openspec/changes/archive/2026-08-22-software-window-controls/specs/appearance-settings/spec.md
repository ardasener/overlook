## ADDED Requirements

### Requirement: Window control position control
The settings modal SHALL offer a window-control-position choice (left | right, default right) wherever software window controls are rendered. On platforms without software window controls (macOS) the choice SHALL be hidden.

#### Scenario: Setting visible where controls exist
- **WHEN** the user opens the appearance settings on Linux or Windows
- **THEN** a "window control position" choice with left and right options SHALL be shown

#### Scenario: Setting hidden on macOS
- **WHEN** the user opens the appearance settings on macOS
- **THEN** no window-control-position choice SHALL be shown

#### Scenario: Changing the position updates the controls
- **WHEN** the user changes the window control position
- **THEN** the tab bar's window controls SHALL move to the chosen edge immediately, and the choice SHALL persist across restarts
