## ADDED Requirements

### Requirement: Tab bar with one terminal per tab
The application SHALL display a tab bar above the terminal area, where each tab represents one live terminal session, and the bar SHALL scroll horizontally when tabs overflow the available width.

#### Scenario: Multiple tabs render in the bar
- **WHEN** more than one tab exists
- **THEN** each tab SHALL appear in the tab bar with its title and a close button

#### Scenario: Tab bar scrolls when full
- **WHEN** the tabs exceed the available bar width
- **THEN** the bar SHALL scroll horizontally to reveal the overflow

### Requirement: Create and close tabs
The application SHALL create a new terminal tab via the `+` button and close a tab via its close button, killing its shell session.

#### Scenario: New tab creates a live terminal
- **WHEN** the user clicks the `+` button
- **THEN** a new tab titled "Terminal N" SHALL appear, a new shell session SHALL spawn, and the tab SHALL be shown in the focused panel

#### Scenario: Closing a tab kills its shell
- **WHEN** the user clicks a tab's close button
- **THEN** the tab SHALL disappear and its shell session SHALL be terminated

### Requirement: Split layouts
The application SHALL support four layout states controlled by two independent toggle buttons on the right of the tab bar: single, vertical split (two side-by-side panes at 50/50), bottom split (a bottom pane at 30% height, full width, above which the top pane takes 70%), and vertical-plus-bottom combined (top row split 50/50 over a 30% bottom pane).

#### Scenario: Toggle vertical split
- **WHEN** the user clicks the vertical-split toggle
- **THEN** the layout SHALL alternate between a single pane and two side-by-side panes of equal width, regardless of the bottom toggle's state

#### Scenario: Toggle bottom split alone
- **WHEN** the user clicks the bottom-split toggle while the vertical split is off
- **THEN** a bottom pane SHALL appear below a single full-width top pane (70/30), without enabling the vertical split

#### Scenario: Vertical and bottom splits compose
- **WHEN** both toggles are on
- **THEN** the layout SHALL show two equal-width panes in the top 70% and a full-width bottom pane at 30%

#### Scenario: Toggles are independent
- **WHEN** the user toggles the vertical split off while the bottom split is on
- **THEN** the bottom pane SHALL remain and the layout SHALL become the single-top-plus-bottom state

### Requirement: Sessions survive parking
When a tab is removed from a panel (split toggled off or another tab selected), its shell session SHALL remain alive; re-selecting the tab SHALL restore the same session with its scrollback.

#### Scenario: Split-off terminal survives
- **WHEN** a vertical split is toggled off
- **THEN** the right panel's shell session SHALL keep running and its tab SHALL remain in the tab bar

#### Scenario: Enabling a split reuses a parked terminal
- **WHEN** a split is toggled on and parked tabs exist
- **THEN** the new panel SHALL show the first parked tab in tab order without creating a new terminal

#### Scenario: Enabling a split with nothing parked creates a terminal
- **WHEN** a split is toggled on and no parked tabs exist
- **THEN** a new terminal session SHALL be created in the new panel

#### Scenario: Tab switch preserves session
- **WHEN** a different tab is selected in a panel
- **THEN** the previously shown tab SHALL keep its session alive and reappear with its scrollback when selected again

### Requirement: Empty panel placeholder
A panel with no tab SHALL show a placeholder inviting the user to create a terminal.

#### Scenario: Placeholder after last visible tab closes
- **WHEN** the tab shown in a panel is closed
- **THEN** the panel SHALL display a placeholder instead of a terminal

### Requirement: Panel color coding
The application SHALL color-code panels and tabs using three accent colors from the active palette: each panel SHALL have an accent-colored border, and the tab shown in that panel SHALL render its title in the same accent color. Parked tabs SHALL be rendered in a neutral muted style.

#### Scenario: Panel border and tab title share a color
- **WHEN** a panel displays a tab
- **THEN** the panel's border and that tab's title SHALL use the same accent color from the palette

#### Scenario: Accent colors change with the theme
- **WHEN** the user switches the theme in settings
- **THEN** the panel borders and tab titles SHALL use the new palette's accent colors

### Requirement: macOS window buttons merge into the tab bar
On macOS, the native title bar SHALL be hidden and the traffic lights SHALL be positioned over the tab bar, which SHALL act as the window drag region.

#### Scenario: Overlay title bar on macOS
- **WHEN** the app runs on macOS
- **THEN** the native title bar SHALL be hidden, the traffic lights SHALL float over the tab bar's left side, and the tab bar SHALL drag the window (while tab items and buttons remain clickable)
