## MODIFIED Requirements

### Requirement: Theme selection drives both UI and terminal
The application SHALL let the user choose one generated Base16 palette that drives both the AntD UI chrome and the terminal colors, including ANSI colors. The selector SHALL be searchable and SHALL display a compact color preview beside each theme name.

#### Scenario: Selecting a theme restyles the app
- **WHEN** the user selects a different generated palette in the settings modal
- **THEN** the UI chrome colors and terminal colors SHALL update immediately

#### Scenario: Theme options show previews
- **WHEN** the theme selector is opened
- **THEN** each option SHALL show its theme name and compact color chips derived from its palette

#### Scenario: Light and dark palettes work
- **WHEN** a generated light or dark Base16 palette is selected
- **THEN** the UI SHALL use the corresponding AntD mode and the terminal SHALL use that palette's colors

#### Scenario: ANSI colors come from the palette
- **WHEN** a generated palette is active
- **THEN** the terminal's ANSI color set SHALL be derived from the documented Base16 mapping for that palette

### Requirement: UI font and scale controls
The application SHALL let the user choose a discovered UI font family from a searchable selector and a UI scale multiplier. The UI selector SHALL show family names only and SHALL include all discovered families.

#### Scenario: Changing UI font
- **WHEN** the user selects a discovered UI font family
- **THEN** all AntD text SHALL render using that family without requiring an application restart

#### Scenario: Searching UI fonts
- **WHEN** the user types a query into the UI font selector
- **THEN** only matching family names SHALL remain visible

### Requirement: Terminal font and size controls
The application SHALL let the user choose a discovered monospaced terminal font family from a searchable selector and a font size.

#### Scenario: Changing terminal font
- **WHEN** the user selects a discovered monospaced family
- **THEN** the terminal SHALL render in that family without recreating the terminal or losing the shell session

#### Scenario: Searching terminal fonts
- **WHEN** the user types a query into the terminal font selector
- **THEN** only matching monospaced family names SHALL remain visible

### Requirement: Settings persist across restarts
The application SHALL persist appearance settings so they survive app restarts. Invalid or unavailable theme and font values SHALL be repaired to their bundled defaults.

#### Scenario: Settings survive restart
- **WHEN** the user changes settings and restarts the application
- **THEN** the same valid theme, fonts, and sizes SHALL be applied on launch

#### Scenario: Missing values repair to defaults
- **WHEN** stored theme or font values are absent, invalid, or no longer available
- **THEN** the application SHALL use Catppuccin Mocha, Inter, or Fira Code Nerd Font as appropriate without crashing

### Requirement: Defaults preserve the current look
The application SHALL default to Catppuccin Mocha, bundled Inter, bundled Fira Code Nerd Font, and the current 13px terminal font size.

#### Scenario: First launch uses bundled defaults
- **WHEN** the application starts with no stored appearance settings
- **THEN** it SHALL render with Catppuccin Mocha, Inter UI text, Fira Code Nerd Font terminal text, and a 13px terminal font size

## ADDED Requirements

### Requirement: Modal and popup surfaces follow the active palette
All application modal dialogs, confirmation dialogs, appearance dropdowns, and context menus SHALL use the active palette for their surfaces, text, borders, option/item states, and overlay mask where applicable. This SHALL apply to components rendered through portals and static confirmation dialogs.

#### Scenario: Settings modal follows a light palette
- **WHEN** the user selects a light palette and opens Settings
- **THEN** the modal content and chrome SHALL use that palette's light surfaces and text rather than Ant Design's default colors

#### Scenario: Confirmation modal follows a dark palette
- **WHEN** a dark palette is active and a confirmation dialog opens
- **THEN** the dialog content, text, borders, and mask SHALL use palette-aware dark styling

#### Scenario: Modal mask is palette-aware
- **WHEN** a modal opens under either a light or dark palette
- **THEN** the mask SHALL dim the active palette using a translucent palette-aware overlay without becoming an unrelated fixed color

#### Scenario: Appearance dropdown follows the active palette
- **WHEN** the user opens a theme or font selector under a light or dark palette
- **THEN** the dropdown surface and active/selected options SHALL use palette-aware colors rather than Ant Design's default elevated colors

#### Scenario: Context menu follows the active palette
- **WHEN** the user opens a project or worktree context menu under a light or dark palette
- **THEN** the menu surface, item text, hover states, danger items, and dividers SHALL use palette-aware colors
