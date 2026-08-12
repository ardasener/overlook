## MODIFIED Requirements

### Requirement: Terminal font and size controls
The application SHALL let the user choose the terminal font family and font size.

#### Scenario: Changing terminal font
- **WHEN** the user selects a different terminal font (FiraCode, JetBrainsMono, BlexMono, SauceCodePro, GoMono, UbuntuMono, DejaVuSansMono, or Terminess)
- **THEN** the terminal SHALL render in the selected font without recreating the terminal or losing the shell session

#### Scenario: Changing terminal font size
- **WHEN** the user changes the terminal font size (8–24)
- **THEN** the terminal SHALL resize its rendering and propagate the new columns/rows to the PTY

#### Scenario: Existing saved font ids keep working
- **WHEN** the user has previously saved `termFont` = `fira-code`, `jetbrains-mono`, or `ibm-plex-mono`
- **THEN** the setting SHALL still resolve to the corresponding bundled Nerd Font (FiraCode, JetBrainsMono, BlexMono) on the next launch
