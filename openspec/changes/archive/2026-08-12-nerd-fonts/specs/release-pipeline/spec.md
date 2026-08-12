## ADDED Requirements

### Requirement: Python toolchain for font conversion in CI
The release workflow SHALL provision a gitignored Python virtual environment with `fontTools` (and brotli) on every runner before building, so the `fonts:fetch` step can convert TTFs to woff2.

#### Scenario: Venv is provisioned before the build
- **WHEN** the release workflow runs on any matrix platform (macOS, Linux, Windows)
- **THEN** it SHALL create a virtual environment and install `fontTools` + brotli into it before `bun run build` executes

#### Scenario: Windows runner uses the correct python invocation
- **WHEN** the release workflow runs on `windows-latest`
- **THEN** the venv SHALL be created with the platform's `python` launcher and the fetch script SHALL detect and use it
