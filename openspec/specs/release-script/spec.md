## Purpose

Provides a guarded local script that cuts releases only from a clean, synced working tree.

## Requirements

### Requirement: Release script
The repository SHALL provide a release script that bumps the version, commits, tags, and pushes — triggering the release pipeline.

#### Scenario: Clean tree and in-sync repo
- **WHEN** the release script runs with no uncommitted changes and local in sync with origin
- **THEN** it SHALL proceed with the version bump

#### Scenario: Uncommitted changes abort
- **WHEN** the release script runs with uncommitted changes present
- **THEN** it SHALL fail with a clear message and make no changes

#### Scenario: Out-of-sync repo aborts
- **WHEN** the release script runs while local is behind or ahead of origin
- **THEN** it SHALL fail with a clear message and make no changes

#### Scenario: Minor bump by default
- **WHEN** the release script runs without flags
- **THEN** the minor version SHALL increment (e.g. `0.1.0` → `0.2.0`)

#### Scenario: Major bump with --major
- **WHEN** the release script runs with `--major`
- **THEN** the major version SHALL increment and minor/patch SHALL reset (e.g. `0.2.0` → `1.0.0`)

#### Scenario: Patch bump with --patch
- **WHEN** the release script runs with `--patch`
- **THEN** the patch version SHALL increment (e.g. `0.1.2` → `0.1.3`)

#### Scenario: Version updated everywhere
- **WHEN** the release script bumps the version
- **THEN** the new version SHALL be written to `src-tauri/tauri.conf.json`, `package.json`, and `src-tauri/Cargo.toml`

#### Scenario: Commit, tag, and push
- **WHEN** the version is bumped
- **THEN** the script SHALL commit the version changes, create the `v<version>` tag, and push the commit and tag to origin
