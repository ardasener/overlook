## ADDED Requirements

### Requirement: WebGL terminal surface matches background mode
The terminal SHALL use an opaque WebGL surface when no wallpaper background is configured and SHALL allow transparency when a wallpaper background is configured.

#### Scenario: Solid themed terminal
- **WHEN** the terminal is created without a configured background image
- **THEN** the WebGL terminal SHALL be initialized with transparency disabled

#### Scenario: Wallpaper-backed terminal
- **WHEN** the terminal is created with a configured background image
- **THEN** the WebGL terminal SHALL be initialized with transparency enabled
