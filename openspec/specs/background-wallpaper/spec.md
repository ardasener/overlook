## ADDED Requirements

### Requirement: Background image wallpaper
The application SHALL support a user-selected background image that covers the full window behind all UI, with configurable blur and opacity. The app chrome and terminal panes SHALL be translucent so the image is visible through them.

#### Scenario: Wallpaper covers the window
- **WHEN** a background image is set
- **THEN** it SHALL cover the full window behind the sidebar, panel frames, and terminal panes
- **AND** those surfaces SHALL be translucent so the image shows through

#### Scenario: No background by default
- **WHEN** the app runs for the first time
- **THEN** no background image SHALL be set and the app SHALL render with solid theme colors

#### Scenario: Wallpaper survives source-file changes
- **WHEN** a background image is set
- **THEN** it SHALL be copied into the app's config directory
- **AND** SHALL continue to display even if the originally picked file is moved or deleted

### Requirement: Background image settings UI
The Appearance tab SHALL include a "Background image" section with an upload button, blur and opacity sliders (shown once an image is set), and a clear button.

#### Scenario: Upload opens the native picker
- **WHEN** the user clicks the upload button
- **THEN** the native file picker SHALL open filtered to image files

#### Scenario: Picking an image sets the wallpaper
- **WHEN** the user selects an image
- **THEN** it SHALL become the wallpaper immediately

#### Scenario: Blur and opacity sliders appear
- **WHEN** a background image is set
- **THEN** the blur and opacity sliders SHALL appear
- **AND** adjusting them SHALL update the wallpaper live

#### Scenario: Clear removes the wallpaper
- **WHEN** the user clicks the clear button
- **THEN** the wallpaper SHALL be removed
- **AND** the sliders SHALL disappear

#### Scenario: Settings persist across restarts
- **WHEN** a background image, blur, or opacity is set
- **THEN** it SHALL persist across restarts

### Requirement: Remap background colors option
The Appearance settings SHALL provide a "Remap background colors" toggle (default off, only effective while a wallpaper is set). When enabled, the terminal's default background and ANSI black color SHALL render transparent so the wallpaper shows through apps that use the default background.

#### Scenario: Remap is off by default
- **WHEN** the app runs for the first time
- **THEN** "Remap background colors" SHALL be off

#### Scenario: Remap requires a wallpaper
- **WHEN** no wallpaper is set
- **THEN** the remap setting SHALL have no visible effect

#### Scenario: Default background becomes transparent
- **WHEN** remap is on and a wallpaper is set
- **THEN** the terminal's default background SHALL render transparent
- **AND** the ANSI black color SHALL render transparent
- **AND** explicit colored text highlights SHALL still render

### Requirement: Strip background colors option
The Appearance settings SHALL provide a "Strip background colors" toggle (default off, only effective while a wallpaper is set). When enabled, background color SGR codes SHALL be removed from app output so every background renders transparent.

#### Scenario: Strip is off by default
- **WHEN** the app runs for the first time
- **THEN** "Strip background colors" SHALL be off

#### Scenario: Strip requires a wallpaper
- **WHEN** no wallpaper is set
- **THEN** the strip setting SHALL have no visible effect

#### Scenario: Background codes are removed from output
- **WHEN** strip is on and a wallpaper is set
- **THEN** standard background codes (`40-47`, `100-107`), 256-color codes (`48;5;N`), and truecolor codes (`48;2;r;g;b`) SHALL be removed from app output
- **AND** foreground colors SHALL be preserved

### Requirement: Independent toggles with explanations
The two options SHALL be independently toggleable and SHALL each show an info icon with an explanatory popover.

#### Scenario: Options toggle independently
- **WHEN** the user changes one transparency toggle
- **THEN** the other SHALL remain unchanged

#### Scenario: Explanations are available
- **WHEN** the user hovers/clicks an option's info icon
- **THEN** a popover SHALL explain what the option does and its tradeoff
