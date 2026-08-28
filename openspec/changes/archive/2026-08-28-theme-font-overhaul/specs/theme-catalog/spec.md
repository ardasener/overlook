## ADDED Requirements

### Requirement: Base16 schemes are provisioned and generated
The system SHALL fetch the pinned Base16 `spec-0.11` scheme source during provisioning, validate each scheme, and generate a typed frontend theme catalog in a gitignored output directory.

#### Scenario: Current catalog is reused
- **WHEN** provisioning runs and the pinned source and generated output are current
- **THEN** the system SHALL skip the network fetch and leave the generated catalog unchanged

#### Scenario: Invalid scheme fails provisioning
- **WHEN** a fetched scheme lacks required metadata or any `base00`–`base0F` color
- **THEN** provisioning SHALL fail with an actionable error and SHALL NOT publish a partial catalog

### Requirement: Base16 values map deterministically to application palettes
The generated catalog SHALL map Base16 neutral slots to application surfaces/text and chromatic slots to semantic and ANSI colors according to the documented direct mapping, without per-theme heuristic adjustment.

#### Scenario: Generated theme is consumable by all theme clients
- **WHEN** the frontend imports a generated Base16 theme
- **THEN** the same palette SHALL be usable by Ant Design, CSS custom properties, and xterm

### Requirement: Theme fallback uses Catppuccin Mocha
The application SHALL use Catppuccin Mocha as the default theme and SHALL fall back to it whenever the stored theme ID is absent or not present in the generated catalog.

#### Scenario: First launch uses Catppuccin Mocha
- **WHEN** no theme setting exists
- **THEN** Catppuccin Mocha SHALL be selected

#### Scenario: Unknown theme is repaired
- **WHEN** a stored theme ID is not present in the generated catalog
- **THEN** the application SHALL use Catppuccin Mocha without crashing
