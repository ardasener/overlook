## Purpose

Bundles Nerd Fonts so PUA glyphs render correctly in the terminal, selectable from the appearance settings.

## Requirements

### Requirement: Bundled Nerd Fonts for terminal rendering
The application SHALL bundle Nerd Fonts (Mono variants) so terminal glyphs — powerline, devicons, octicons, and other Private Use Area codepoints — render correctly on every supported OS without requiring users to install fonts.

#### Scenario: Glyph-heavy tools render correctly
- **WHEN** the user runs a terminal tool that outputs PUA glyphs (e.g., starship, lazygit, btop)
- **THEN** the glyphs SHALL render in the terminal rather than as tofu/missing-glyph boxes

#### Scenario: All eight families are available
- **WHEN** the user opens the terminal font settings
- **THEN** FiraCode, JetBrainsMono, BlexMono, SauceCodePro, GoMono, UbuntuMono, DejaVuSansMono, and Terminess SHALL all be selectable

#### Scenario: Icons occupy exactly one cell
- **WHEN** a PUA glyph is rendered
- **THEN** it SHALL use the same advance width as a regular character (Mono variant behavior), keeping the terminal grid aligned

### Requirement: Fonts are fetched and verified at build time
The application SHALL provide a `fonts:fetch` pre-build step that downloads the pinned Nerd Fonts release, verifies each file against a pinned SHA256 checksum, converts to woff2, and writes fonts + generated CSS into the Vite source tree. The step SHALL be reproducible: same manifest, same output bytes.

#### Scenario: Clean fetch produces fonts and CSS
- **WHEN** `fonts:fetch` runs with no cached output
- **THEN** it SHALL download the pinned TTF files, verify SHA256 checksums, produce woff2 files and a generated `@font-face` CSS file in `src/assets/nerd-fonts/`

#### Scenario: Repeat runs are skipped when verified
- **WHEN** `fonts:fetch` runs and all output files already exist and match their pinned checksums
- **THEN** it SHALL skip downloading and converting (fast no-op)

#### Scenario: Force re-fetch
- **WHEN** `fonts:fetch --force` runs
- **THEN** it SHALL re-download and re-convert all fonts regardless of existing output

#### Scenario: Checksum mismatch fails the build
- **WHEN** a downloaded file does not match its pinned SHA256
- **THEN** the fetch step SHALL fail with a clear checksum error and SHALL NOT overwrite existing output

#### Scenario: Pin Nerd Fonts version
- **WHEN** the fetch step runs
- **THEN** it SHALL fetch from the exact Nerd Fonts version pinned in the script manifest (v3.5.0), not "latest"

### Requirement: Weights per family
The application SHALL bundle exactly two weights per family: Regular (400) + SemiBold (600) where the family ships SemiBold, otherwise Regular (400) + Bold (700). Bold terminal text SHALL render via the bundled heavy weight.

#### Scenario: Families with SemiBold use 400+600
- **WHEN** FiraCode, JetBrainsMono, BlexMono, or SauceCodePro is the active terminal font
- **THEN** its Regular (400) and SemiBold (600) weights SHALL be bundled

#### Scenario: Families without SemiBold use 400+700
- **WHEN** GoMono, UbuntuMono, DejaVuSansMono, or Terminess is the active terminal font
- **THEN** its Regular (400) and Bold (700) weights SHALL be bundled

#### Scenario: Bold text renders
- **WHEN** a program emits bold terminal text
- **THEN** the text SHALL render in the bundled heavy weight (SemiBold or Bold as applicable)

### Requirement: Fonts bundle into the application
The fetched fonts SHALL be bundled into the built application via the existing Vite asset pipeline (served by the webview, no Rust/IPC involvement) so offline installs render glyphs.

#### Scenario: Production bundle contains the fonts
- **WHEN** `bun tauri build` completes
- **THEN** the woff2 font files SHALL be included in the application's served assets

#### Scenario: Dev mode serves the fonts
- **WHEN** `bun tauri dev` runs
- **THEN** the terminal SHALL render with the bundled Nerd Fonts

### Requirement: Fetch tooling dependency is documented and isolated
The fetch step SHALL use a Python virtual environment (gitignored) with `fontTools` (+ brotli) installed, and the Python requirement SHALL be documented in the README.

#### Scenario: Venv is created and used
- **WHEN** `fonts:fetch` runs and the gitignored venv does not exist
- **THEN** the step SHALL create the venv and install `fontTools` and brotli into it

#### Scenario: README documents the dependency
- **WHEN** the README is read
- **THEN** it SHALL state that Python 3 is required for the font build step and how the venv is provisioned
