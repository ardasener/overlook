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
