## Purpose

Keeps `tauri:dev` builds from sharing config, state, or identity with an installed release build on the same machine.

## Requirements

### Requirement: Dev builds use an isolated config identity
Development builds SHALL run with a distinct bundle identifier (`com.overlook.app.dev`) so their configuration, wallpaper, and webview data are stored separately from the installed application.

#### Scenario: Dev identifier differs from prod
- **WHEN** the app is launched via the dev script (`bun run tauri:dev`)
- **THEN** the bundle identifier SHALL be `com.overlook.app.dev` and the config directory SHALL resolve under that identifier (e.g. `~/Library/Application Support/com.overlook.app.dev`)

#### Scenario: Installed app keeps the prod identifier
- **WHEN** the app is built and installed for release
- **THEN** the bundle identifier SHALL remain `com.overlook.app` and its config directory SHALL remain `~/Library/Application Support/com.overlook.app`

#### Scenario: Dev and prod state do not collide
- **WHEN** both a dev build and the installed app run on the same machine
- **THEN** tracked projects and wallpaper SHALL be read and written to separate directories per identifier, so each build keeps its own state

### Requirement: Dev launch command
The project SHALL provide a single documented command that launches the dev build with the dev identifier applied.

#### Scenario: Dev script exists
- **WHEN** the developer runs `bun run tauri:dev`
- **THEN** `tauri dev` SHALL be invoked with `--config src-tauri/tauri.dev.conf.json`

#### Scenario: Dev config file exists
- **WHEN** the repository is inspected
- **THEN** a `src-tauri/tauri.dev.conf.json` SHALL exist that merges `identifier` = `com.overlook.app.dev` over the base configuration

### Requirement: Legacy projects file migration
The application SHALL migrate an existing tracked-projects file from the legacy location (`{config_dir}/overlook/projects.json`) into the identifier-based config directory on first load, without deleting the legacy file.

#### Scenario: Legacy file copied on first load
- **WHEN** the identifier-based projects file does not exist and the legacy file exists
- **THEN** the legacy file's contents SHALL be copied into the new location

#### Scenario: New file takes precedence
- **WHEN** both the identifier-based projects file and the legacy file exist
- **THEN** the identifier-based file SHALL be used and the legacy file SHALL be ignored

#### Scenario: Legacy file is preserved
- **WHEN** a migration copy occurs
- **THEN** the legacy file SHALL remain on disk unchanged
