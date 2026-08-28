## Context

Overlook currently maintains eight hand-authored palettes, three bundled UI font families, and eight bundled Nerd Font families. Theme settings use a swatch grid and font settings use hardcoded options. The application already has a useful `Palette` abstraction consumed by Ant Design, CSS custom properties, and xterm, and its font provisioning already fetches pinned assets during development and builds.

The new system must preserve those consumer boundaries while replacing the data sources. Rust remains the only layer allowed to inspect the host filesystem or operating-system resources. Build-time network access is already an accepted project convention for font provisioning.

## Goals / Non-Goals

**Goals:**

- Make the complete Base16 `spec-0.11` catalog available through a build-time generated, typed theme module.
- Keep theme conversion deterministic and initially simple rather than inventing per-theme color heuristics.
- Reduce bundled fonts to Inter and Fira Code Nerd Font.
- Discover installed font families through Rust and `fontdb`.
- Provide searchable family-name selectors with terminal monospace filtering.
- Make modal surfaces and overlays follow the active palette, including portal-rendered and static confirmation dialogs.
- Repair unavailable persisted theme/font values to safe bundled defaults.
- Keep all provisioning-dependent local commands usable from a clean checkout.

**Non-Goals:**

- Runtime downloading of themes or fonts.
- Native platform font APIs beyond `fontdb`'s system-font scanning.
- Serif/sans-serif classification for UI fonts; the UI list intentionally includes all discovered families.
- Font style/weight selection as a user setting.
- Automatic contrast optimization or hand-tuned semantic colors for individual Base16 schemes.
- User-created or edited themes.

## Decisions

### Build-generated TypeScript catalog

Add a `themes:fetch` provisioning script modeled on `fonts:fetch`. It fetches the Base16 repository at an exact commit corresponding to the `spec-0.11` format, validates every scheme, converts YAML into the existing `Palette` shape, and writes a generated TypeScript module under a gitignored directory such as `src/generated/`.

The generated module is TypeScript rather than JSON so the output is checked against the application palette type during normal compilation. The converter owns runtime validation before generation; malformed or incomplete upstream files fail the provisioning command rather than producing a partial catalog.

`dev`, `build`, `check-types`, and `test` all run the shared provisioning step before their existing command. Provisioning is cached by source revision and generated-output state, and is a no-op when current.

### Direct Base16 mapping

The converter maps neutral slots as follows: `base00` background, `base01` surface, `base02` elevated surface/selection, `base03` border and muted text, `base04` secondary text, `base05` primary text, and `base06`/`base07` bright text variants. Chromatic slots map directly: `base08` red/error, `base09` orange/warning, `base0A` yellow, `base0B` green, `base0C` cyan, `base0D` blue/primary, `base0E` purple, and `base0F` extra accent.

ANSI colors use the same source values consistently. Where the existing interface requires sixteen ANSI entries but Base16 provides eight chromatic entries, normal and bright variants use the corresponding chromatic slot with neutral bright/dim values for the neutral entries. This is deliberately predictable and can be refined later if real schemes expose readability problems.

The generated catalog preserves the scheme ID/name, light/dark variant, and source metadata needed for diagnostics and attribution. Catppuccin Mocha is the default and the fallback for unknown theme IDs.

### Rust-backed system font discovery

Add `fontdb` to the Rust crate and expose a registered Tauri command that creates a database, calls `Database::load_system_fonts()`, walks `Database::faces()`, and returns deduplicated family names. Each returned family includes whether any face in that family is monospaced, based on `FaceInfo.monospaced`.

The frontend loads this list once when the settings provider starts and retains it for the app session. A refresh action invokes the command again and replaces the cached list. The command returns family names only; styles, weights, file paths, and face IDs never become persisted frontend settings.

### Bundled font fallback

Keep the bundled Inter and Fira Code Nerd Font assets as the guaranteed defaults and remove the other bundled families and imports. Persisted font settings store family IDs/names. At load and refresh, unavailable selections are replaced with Inter for UI and Fira Code Nerd Font for terminal. If discovery fails, the bundled defaults remain usable and the selectors show the discovered fallback state without crashing.

### Searchable selectors

Replace the theme card grid with an Ant Design searchable `Select`. Each option uses a compact four-color preview derived from the theme and its name as the searchable label. Font selectors use searchable family-name options without sample text or style entries. The terminal selector receives only families with at least one monospaced face; the UI selector receives all discovered families.

### Palette-aware modal surfaces

Apply global modal and popup rules using the document-level `--ol-*` variables so portal-rendered `Modal` components, static `Modal.confirm()` dialogs, `Select` dropdowns, and right-click `Dropdown`/`Menu` context menus do not fall back to Ant Design's default elevated colors. Modal content, header, footer, title, body text, controls, and borders use the active palette surface/text/border variables. Dropdown and menu surfaces plus option/item active, selected, danger, and divider states use the same palette. The mask uses a palette-aware translucent black mix over the active palette background, preserving the conventional dimming effect for both light and dark schemes.

This is implemented as shared global modal styling rather than per-modal overrides, so `SettingsModal`, `CleanupModal`, and future modal dialogs remain consistent.

### Alternatives considered

- **Runtime YAML parsing:** rejected because it adds source-format parsing and network/cache failure to application startup.
- **Generated JSON:** viable, but TypeScript provides a direct compile-time check against `Palette` and matches the existing typed frontend modules.
- **Native font APIs:** more platform-specific and unnecessary when `fontdb` supports the target platforms and exposes the required monospaced flag.
- **Sans-serif classification:** rejected because `fontdb` does not classify faces with a reliable `sans_serif` field; showing all families is more honest and user-controlled.

## Risks / Trade-offs

- **Builds require network access on a clean checkout** → use the same cached provisioning pattern as Nerd Fonts and provide clear failure messages.
- **Base16 has fewer semantic roles than `Palette`** → use the documented direct mapping and cover conversion with tests; refine only based on observed issues.
- **`fontdb` scans predefined directories rather than native font registries** → document the limitation; allow refresh so newly installed fonts can appear during a session.
- **Very large option lists can be slow to render** → deduplicate by family and use searchable `Select` options instead of rendering a persistent grid.
- **Selected system fonts can disappear** → validate persisted values and repair to bundled defaults.
- **Generated files are absent before provisioning** → sequence provisioning before dev, build, type-check, and test commands.
- **Theme source licensing/attribution may vary by scheme** → retain the official source link in the README and source metadata in generated output; verify repository licensing before implementation.

## Migration Plan

1. Add the theme/font provisioning and Rust discovery paths while retaining the existing consumer interfaces where possible.
2. Change defaults to Catppuccin Mocha, Inter, and Fira Code Nerd Font; invalid existing values naturally fall back through validation.
3. Remove obsolete bundled font assets/options and replace the settings controls.
4. Run provisioning plus the full frontend/Rust verification suite.

Rollback is a source revert. Generated assets and system-font discovery are additive and do not require data migration because invalid persisted values are intentionally repaired.

## Open Questions

None. The initial mapping is intentionally simple and can be revisited as a separate theme-quality change if needed.
