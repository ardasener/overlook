## Context

The repo has `tauri.conf.json` with `bundle.targets: "all"` and icons for all platforms, product name `overlook`, version `0.1.0`. The frontend uses bun. There is no `LICENSE` and no `.github/workflows`. `tauri-apps/tauri-action` is the official action that builds via the project's Tauri CLI and optionally creates/updates a GitHub release and uploads bundles.

## Goals / Non-Goals

**Goals:**
- MIT license at the repo root.
- A single tag-triggered workflow building Windows, Linux, and both macOS architectures.
- Draft release with bundles attached.

**Non-Goals:**
- Code signing / notarization (macOS or Windows) — requires paid certs/secrets; a later step.
- The app updater (`latest.json` generation is enabled by default by the action, but no updater client exists yet).
- Releases on non-tag events (e.g. nightly builds).

## Decisions

### MIT license
Add `LICENSE` with the standard MIT text, copyright `2026 Arda Sener` (owner of `ardasener/overlook`).
- **Why**: standard permissive license matching the public-open-source intent.

### Workflow: tag-triggered matrix with tauri-action
`.github/workflows/release.yml`:
- `on: push: tags: ["v*"]`.
- Matrix: `macos-latest` ×2 (aarch64 + x86_64 targets), `ubuntu-22.04`, `windows-latest`.
- Steps per job: checkout → setup-node LTS → `dtolnay/rust-toolchain@stable` (macOS targets only on macOS) → Linux system deps (`libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf xdg-utils`) → `bun install` → `tauri-apps/tauri-action@v0` with `tagName: v__VERSION__`, `releaseName: "v__VERSION__"`, `releaseDraft: true`, `args` for the macOS target.
- `permissions: contents: write` on the job.
- **Why**: `tauri-action` auto-detects `bun tauri` as the build script and `__VERSION__` is substituted with the app version; `releaseDraft: true` keeps releases reviewable before publishing.
- **Note**: with a tag push, `tagName` points at the pushed tag; the action creates the draft release there and uploads assets.

### No tauri.conf.json changes
`bundle.targets: "all"` already produces NSIS, AppImage/deb, and dmg/app. No config change needed.
- **Why**: minimal footprint; per-platform target overrides come from the action's `args`.

### macOS unsigned by default
No `APPLE_*` secrets configured; the dmg/app are built but unsigned. Users on macOS will Gatekeeper-prompt; documented in the release notes when first shipped.
- **Why**: signing requires a paid Apple Developer account; adding secrets later enables notarization without workflow changes.

## Risks / Trade-offs

- [Unsigned macOS builds] → acceptable for an early project; notarization is additive later.
- [Windows SmartScreen warning on unsigned NSIS] → same tradeoff; later via a code-signing cert.
- [AppImage build needs `linuxdeploy`/`appimagetool`, downloaded by the bundler] → standard; `patchelf` and `xdg-utils` deps are installed to support it.
- [Draft releases require manual publish] → intended.

## Migration Plan

Add the two files; no app source changes. First use: push a `v0.1.0` tag, verify the draft release, then publish.
