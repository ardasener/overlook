## Purpose

Defines how the terminal's WebGL surface selects opaque or translucent rendering based on whether a wallpaper background is configured.

## Requirements

### Requirement: WebGL terminal surface matches background mode
The terminal SHALL use an opaque WebGL surface when no wallpaper background is configured and SHALL allow transparency when a wallpaper background is configured. When a wallpaper is set, the background settings SHALL display an informational warning about transparent terminal rendering directly above the background set/change action, explaining that small text can appear thinner or softer and that clearing the background provides the sharpest text rendering.

#### Scenario: Solid themed terminal
- **WHEN** the terminal is created without a configured background image
- **THEN** the WebGL terminal SHALL be initialized with transparency disabled

#### Scenario: Wallpaper-backed terminal
- **WHEN** the terminal is created with a configured background image
- **THEN** the WebGL terminal SHALL be initialized with transparency enabled

#### Scenario: Background rendering warning placement
- **WHEN** a background image is set
- **THEN** the informational warning SHALL appear directly above the change background action

#### Scenario: Wallpaper rendering warning
- **WHEN** a background image is configured
- **THEN** the background settings SHALL display an informational warning about reduced small-text crispness and recommend clearing the background for the sharpest text
