## ADDED Requirements

### Requirement: System font families are discovered through Rust
The system SHALL expose a Tauri command that uses `fontdb` to scan system fonts and return deduplicated family names with monospaced-family metadata. The frontend SHALL NOT inspect the filesystem or processes to discover fonts.

#### Scenario: Font discovery returns families
- **WHEN** the frontend requests the system font list
- **THEN** Rust SHALL return each discovered family name once, with a monospaced flag indicating whether any face in that family is monospaced

#### Scenario: Discovery failure is non-fatal
- **WHEN** system font scanning fails or returns no usable faces
- **THEN** the application SHALL continue using bundled font defaults

### Requirement: Font list is cached and refreshable
The application SHALL load the font list once at startup, cache it for the session, and provide a settings action to rescan and replace the cached list.

#### Scenario: Startup caches fonts
- **WHEN** the application starts
- **THEN** the font list SHALL be loaded once and reused by the settings selectors during that session

#### Scenario: User refreshes fonts
- **WHEN** the user activates the font refresh action
- **THEN** the application SHALL request a new system font list and update both selectors without restarting

### Requirement: Terminal font candidates are monospaced
The terminal font selector SHALL include only deduplicated families for which at least one discovered face is marked monospaced.

#### Scenario: Non-monospaced family is excluded from terminal choices
- **WHEN** a discovered family has no monospaced faces
- **THEN** that family SHALL NOT appear in the terminal font selector
