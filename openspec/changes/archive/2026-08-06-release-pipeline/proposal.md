## Why

The project is at an early usable stage and needs a public release path. It has no license and no automated builds. Adding an MIT license makes the repo legally distributable, and a tag-triggered GitHub Actions pipeline builds and publishes platform bundles automatically.

## What Changes

- Add an MIT `LICENSE` file to the repository root.
- Add a GitHub Actions workflow (`.github/workflows/release.yml`) triggered on pushing a `v*` tag that:
  - Builds the app on Windows (NSIS `.exe`), Linux (AppImage + `.deb`), and macOS (`.app`/`.dmg`, both Apple Silicon and Intel targets).
  - Uses `tauri-apps/tauri-action` to create a **draft** GitHub release named after the tag and upload the bundles as assets.
- The build uses bun for frontend deps and `tauri build` (auto-detected by the action).

## Capabilities

### New Capabilities
- `release-pipeline`: MIT licensing and the tag-triggered GitHub Actions release build.

### Modified Capabilities
<!-- None: no app behavior changes. -->

## Impact

- `LICENSE` (new, root): MIT text with the project copyright.
- `.github/workflows/release.yml` (new): the tag-triggered build matrix.
- No Rust/frontend source changes; no `tauri.conf.json` changes (bundle config already exists).

## Notes

- macOS builds are unsigned by default (users see "unidentified developer"); notarization is a later step requiring Apple Developer credentials as secrets.
- Public-repo GitHub Actions minutes and storage are free for standard runners; the matrix stays on standard runners.
