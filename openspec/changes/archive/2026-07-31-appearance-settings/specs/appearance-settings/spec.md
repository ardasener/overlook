## ADDED Requirements

### Requirement: Settings modal is accessible
The application SHALL provide a settings modal reachable from a gear button in the workspace sidebar header.

#### Scenario: Open settings from sidebar
- **WHEN** the user clicks the gear button in the sidebar header
- **THEN** a settings modal opens with Appearance and Terminal sections

### Requirement: Theme selection drives both UI and terminal
The application SHALL let the user choose one palette that drives both the AntD UI chrome and the terminal colors, including ANSI colors.

#### Scenario: Selecting a theme restyles the app
- **WHEN** the user selects a different palette in the settings modal
- **THEN** the UI chrome colors (backgrounds, surfaces, borders, text) and the terminal colors (background, foreground, cursor, ANSI 16) SHALL update immediately

#### Scenario: Light and dark palettes work
- **WHEN** a light palette (e.g., Catppuccin Latte) is selected
- **THEN** the UI SHALL render with light-mode AntD components and the terminal SHALL use that palette's colors

#### Scenario: ANSI colors come from the palette
- **WHEN** a palette is active
- **THEN** the terminal's ANSI color set SHALL match that palette's published terminal color scheme, not be derived from syntax colors

### Requirement: UI font and scale controls
The application SHALL let the user choose the UI font family and a UI scale multiplier.

#### Scenario: Changing UI font
- **WHEN** the user selects a different UI font (Inter, Roboto, or Noto Sans)
- **THEN** all AntD text SHALL render in the selected font

#### Scenario: Changing UI scale
- **WHEN** the user changes the UI scale (0.5–2.0 in 0.25 steps)
- **THEN** the UI text and chrome dimensions SHALL scale accordingly

### Requirement: Terminal font and size controls
The application SHALL let the user choose the terminal font family and font size.

#### Scenario: Changing terminal font
- **WHEN** the user selects a different terminal font (Fira Code, JetBrains Mono, or IBM Plex Mono)
- **THEN** the terminal SHALL render in the selected font without recreating the terminal or losing the shell session

#### Scenario: Changing terminal font size
- **WHEN** the user changes the terminal font size (8–24)
- **THEN** the terminal SHALL resize its rendering and propagate the new columns/rows to the PTY

### Requirement: Settings persist across restarts
The application SHALL persist appearance settings so they survive app restarts.

#### Scenario: Settings survive restart
- **WHEN** the user changes settings and restarts the application
- **THEN** the same theme, fonts, and sizes SHALL be applied on launch

#### Scenario: Corrupt settings degrade to defaults
- **WHEN** stored settings are invalid (unknown theme id, out-of-range size, corrupt JSON)
- **THEN** the application SHALL fall back to default settings without crashing

### Requirement: Defaults preserve the current look
The application SHALL default to a dark palette with the current terminal font size so first-run appearance matches the pre-settings app.

#### Scenario: First launch matches current look
- **WHEN** the application starts with no stored settings
- **THEN** the UI SHALL render in a dark theme with a 13px monospace terminal font
