## 1. Theme provisioning

- [x] 1.1 Pin the Base16 `spec-0.11` source commit and add a cached `themes:fetch` provisioning script modeled on `fonts:fetch`
- [x] 1.2 Fetch and validate all Base16 YAML schemes, including required metadata and `base00`–`base0F` colors
- [x] 1.3 Convert validated schemes to the typed `Palette` shape using the documented direct mapping
- [x] 1.4 Generate a typed TypeScript catalog under a gitignored generated-assets directory, with source revision metadata
- [x] 1.5 Make `dev`, `build`, `check-types`, and `test` provision themes and fonts before running their existing commands
- [x] 1.6 Add tests for Base16 parsing, validation, mapping, generated IDs, and Catppuccin Mocha fallback

## 2. Theme integration

- [x] 2.1 Replace the hand-authored palette catalog with the generated Base16 catalog while preserving AntD, CSS-variable, and xterm consumers
- [x] 2.2 Update theme fallback/default handling to Catppuccin Mocha
- [x] 2.3 Replace the theme swatch grid with a searchable AntD selector showing compact palette color chips beside names
- [x] 2.4 Remove obsolete palette definitions and update theme-related tests
- [x] 2.5 Apply shared palette-aware styling to modal content, headers, footers, confirmation dialogs, select/context menus, and masks; add regression coverage

## 3. Bundled fonts

- [x] 3.1 Reduce bundled UI assets to Inter and terminal assets to Fira Code Nerd Font
- [x] 3.2 Remove Roboto, Noto Sans, and the other bundled Nerd Font families and generated CSS entries
- [x] 3.3 Update UI and terminal font stacks/defaults to use the bundled families with platform fallback stacks
- [x] 3.4 Remove obsolete hardcoded font IDs/options and add bundled-font fallback constants

## 4. Rust system font discovery

- [x] 4.1 Add the current `fontdb` dependency and a focused font-discovery module
- [x] 4.2 Implement a Tauri command that scans system fonts, deduplicates family names, and marks families with monospaced faces
- [x] 4.3 Register the command in `src-tauri/src/lib.rs` and grant the required capability
- [x] 4.4 Add Rust tests for family deduplication, monospaced aggregation, and empty/failed discovery behavior

## 5. Frontend font settings

- [x] 5.1 Load and session-cache discovered fonts at application startup through the Rust command
- [x] 5.2 Add a settings refresh action that rescans fonts and updates both selectors without restarting
- [x] 5.3 Replace UI and terminal font options with searchable family-name selectors; restrict terminal options to monospaced families
- [x] 5.4 Repair unavailable persisted UI/terminal font values to Inter/Fira Code Nerd Font defaults
- [x] 5.5 Verify changing either font updates the live UI/terminal without recreating terminal sessions
- [x] 5.6 Add frontend tests for discovery normalization, filtering, fallback repair, and selector behavior

## 6. Documentation and verification

- [x] 6.1 Add the official Base16 schemes repository link and generated-theme/font provisioning commands to `README.md`
- [x] 6.2 Update relevant project guidance with system-font discovery and bundled-font behavior
- [x] 6.3 Run `bun run test`, `bun run check-types`, `bun run lint`, `cargo test`, and `cargo clippy --all-targets -- -D warnings`
- [x] 6.4 Verify a clean checkout provisions generated assets and starts/builds without manually creating ignored files
- [x] 6.5 Verify theme search/previews, font search/filtering, refresh, fallback repair, and live application behavior manually
