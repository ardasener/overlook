## ADDED Requirements

### Requirement: MIT license
The repository SHALL include an MIT license file at its root so the project is legally distributable.

#### Scenario: License file present
- **WHEN** the repository is viewed at its root
- **THEN** a `LICENSE` file SHALL exist containing the MIT license text with the project's copyright notice

### Requirement: Tag-triggered release builds
The repository SHALL include a GitHub Actions workflow that builds release bundles when a version tag is pushed, and creates a draft GitHub release with the bundles attached.

#### Scenario: Tag push triggers the build
- **WHEN** a tag matching `v*` is pushed
- **THEN** the release workflow SHALL run

#### Scenario: Windows bundle is built
- **WHEN** the release workflow runs
- **THEN** a Windows build SHALL produce the NSIS installer (`.exe`)

#### Scenario: Linux bundles are built
- **WHEN** the release workflow runs
- **THEN** a Linux build SHALL produce an AppImage and a `.deb` package

#### Scenario: macOS bundles are built for both architectures
- **WHEN** the release workflow runs
- **THEN** macOS builds SHALL produce bundles for `aarch64-apple-darwin` and `x86_64-apple-darwin`

#### Scenario: Draft release with assets
- **WHEN** all platform builds succeed
- **THEN** a draft GitHub release SHALL be created (or updated) for the pushed tag with the bundles uploaded as release assets
