## Why

Overlook currently ships a small hand-maintained theme catalog and bundles many font families, making the appearance system difficult to extend and increasing the application size. This change replaces the narrow catalogs with a build-generated Base16 theme catalog and system font discovery while keeping reliable bundled defaults.

## What Changes

- Fetch the pinned Base16 `spec-0.11` scheme catalog during provisioning and generate a typed TypeScript theme catalog into a gitignored directory.
- Convert Base16 `base00`–`base0F` values to the existing application, Ant Design, and xterm palette structure using a simple deterministic mapping.
- Make Catppuccin Mocha the default theme; invalid or unavailable stored theme IDs fall back to it.
- Replace the theme swatch grid with a searchable dropdown whose options show compact color chips beside each theme name.
- Apply the active palette consistently to all Ant Design modals, confirmation dialogs, select/context menus, and portal-rendered dropdowns, including a palette-aware mask.
- Bundle only Inter for the UI and Fira Code Nerd Font for terminals; remove the other bundled font families.
- Add Rust-backed system font discovery using `fontdb`, returning deduplicated family names and monospaced-family metadata.
- Populate searchable UI and terminal font dropdowns from discovered family names; restrict terminal choices to monospaced families.
- Cache discovered fonts for the app session and add a settings refresh action.
- Repair unavailable saved font selections to the bundled Inter or Fira Code Nerd Font defaults.
- Ensure all provisioning-dependent commands (`dev`, `build`, `check-types`, and `test`) provision generated assets first.
- Add a Base16 source link to the README.

## Capabilities

### New Capabilities

- `theme-catalog`: Build-time Base16 fetching, validation, palette conversion, generated catalog, and fallback behavior.
- `system-font-discovery`: Rust-backed discovery, family deduplication, monospaced filtering, caching, and refresh behavior.

### Modified Capabilities

- `appearance-settings`: Theme and font selectors become searchable family/theme dropdowns, with color previews, bundled defaults, and unavailable-value repair.

## Impact

- Frontend theme modules, settings state, settings modal styling, and global font imports.
- New build/provisioning script and gitignored generated theme assets.
- Rust PTY module registration and capabilities for a font-listing command.
- New Rust dependency: `fontdb`.
- Removed bundled font assets and related font options.
- `package.json` command sequencing and README documentation.
