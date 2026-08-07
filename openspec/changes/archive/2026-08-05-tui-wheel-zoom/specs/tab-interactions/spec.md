## ADDED Requirements

### Requirement: Font zoom works inside TUIs
The per-pane font zoom (Ctrl/Cmd + mouse wheel or trackpad pinch) SHALL work while a TUI application with mouse reporting (e.g. htop, vim, opencode) is running in the terminal.

#### Scenario: Zoom inside a TUI
- **WHEN** a TUI with mouse reporting is running and the user zooms with Ctrl/Cmd + wheel over the terminal
- **THEN** the pane's font SHALL zoom in/out per the wheel direction
- **AND** the TUI SHALL NOT receive the modifier-wheel as a mouse report

#### Scenario: Plain wheel still reaches the TUI
- **WHEN** a TUI with mouse reporting is running and the user scrolls with a plain (no-modifier) wheel
- **THEN** the TUI SHALL receive the wheel event for its native scrolling

#### Scenario: Bare-shell zoom unchanged
- **WHEN** no TUI is running (bare shell prompt) and the user zooms with Ctrl/Cmd + wheel
- **THEN** the pane's font SHALL zoom as before

#### Scenario: Zoom remains bounded and per-pane
- **WHEN** zooming inside a TUI
- **THEN** the same bounds (8–24px) and per-pane, relative-to-default semantics SHALL apply
