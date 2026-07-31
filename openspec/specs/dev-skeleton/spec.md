## ADDED Requirements

### Requirement: Tauri and React boilerplate builds
The project SHALL provide a Tauri 2 + React 19 + TypeScript + Vite skeleton managed with pnpm, with Ant Design 6 wired into the app shell, such that `pnpm tauri dev` compiles and launches the application window.

#### Scenario: Development build compiles
- **WHEN** `pnpm install` is run
- **THEN** all declared dependencies install without peer-dependency errors

#### Scenario: Dev app launches
- **WHEN** `pnpm tauri dev` is run on a machine with the Tauri prerequisites
- **THEN** the Rust backend compiles and an application window opens rendering the React frontend

#### Scenario: Frontend type checks pass
- **WHEN** `pnpm check-types` (or the equivalent TypeScript check) is run
- **THEN** it completes without errors

### Requirement: App shell layout
The frontend SHALL render an Ant Design shell consisting of a workspace sidebar and a main content area reserved for terminals.

#### Scenario: Shell renders on launch
- **WHEN** the application window opens
- **THEN** a sidebar (AntD components) and a main content area are visible

#### Scenario: Sidebar shows workspace placeholder
- **WHEN** the sidebar is inspected
- **THEN** it SHALL display a placeholder workspace list (no functional workspace management in this change)

### Requirement: Declared stack dependencies install
The terminal stack dependencies declared for the project (xterm.js, its WebGL addon, and `react-xtermjs`) SHALL be installed as project dependencies so resolution and build compatibility are verified.

#### Scenario: Terminal stack deps resolve
- **WHEN** `pnpm install` is run
- **THEN** `@xterm/xterm`, `@xterm/addon-webgl`, and `react-xtermjs` are installed at compatible versions without peer-dependency errors
