## ADDED Requirements

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
