## Purpose

Routes special key sequences (Shift+Enter newline, modifier combos) from xterm to the shell without breaking TUI keys.

## Requirements

### Requirement: Shift+Enter inserts a newline
The terminal SHALL treat Shift+Enter differently from Enter: Enter continues to send the standard carriage return, while Shift+Enter SHALL write the sequence `\x1b\r` (ESC followed by CR) to the PTY so applications that honor the convention (e.g. opencode's `alt+return` newline binding) insert a newline instead of submitting.

#### Scenario: Shift+Enter writes the shift sequence
- **WHEN** the user presses Shift+Enter in a focused terminal
- **THEN** the bytes `\x1b\r` SHALL be written to the PTY and the plain `\r` SHALL NOT be sent

#### Scenario: Plain Enter is unchanged
- **WHEN** the user presses Enter in a focused terminal
- **THEN** the standard carriage return SHALL be sent to the PTY as before

#### Scenario: Modified enters are not intercepted
- **WHEN** the user presses Enter with Alt, Ctrl, or Meta held
- **THEN** the key SHALL pass through to the terminal's default handling unchanged

#### Scenario: Shift+Enter reaches TUI applications
- **WHEN** a TUI application that maps `\x1b\r` to a newline action (e.g. opencode) is running in the terminal
- **THEN** pressing Shift+Enter SHALL trigger the newline action rather than submitting the current input

### Requirement: Shortcuts and terminal interception coexist
The Shift+Enter interception SHALL not disturb the application's own keyboard shortcuts or xterm's default key handling for all other keys.

#### Scenario: Shortcuts still fire outside the terminal
- **WHEN** the user presses an application shortcut while a terminal is focused
- **THEN** the shortcut SHALL behave as before (the interception only rewrites Shift+Enter)

#### Scenario: All other terminal keys pass through
- **WHEN** the user presses any key other than an unmodified Shift+Enter
- **THEN** the key SHALL reach xterm's default handling and the PTY unchanged
