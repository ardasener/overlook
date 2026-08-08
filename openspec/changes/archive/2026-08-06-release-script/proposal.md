## Why

Tagging a release requires manually bumping the version in three files (`tauri.conf.json`, `package.json`, `Cargo.toml`), committing, tagging `v<version>`, and pushing — error-prone. A single script should do the whole release: verify the working tree is clean and in sync with origin, bump the version (minor by default, major with `--major`), commit, tag, and push.

## What Changes

- Add `scripts/release.sh` that:
  1. Fails if there are uncommitted changes or if local is behind/ahead of origin.
  2. Reads the current version from `src-tauri/tauri.conf.json` (the source of truth the release tag must match).
  3. Bumps it: minor by default (`0.1.0` → `0.2.0`), patch with `--patch` (`0.2.0` → `0.2.1`), major with `--major` (`0.2.1` → `1.0.0`).
  4. Writes the new version to all three files (`tauri.conf.json`, `package.json`, `Cargo.toml`).
  5. Commits `release: v<new>`, tags `v<new>`, pushes the commit and the tag.
- Add a `release` npm script (`bun release [--major|--patch]`).

## Capabilities

### New Capabilities
- `release-script`: one-command version bump + tag + push that triggers the release pipeline.

### Modified Capabilities
<!-- None: the existing release-pipeline workflow is unchanged; the script just drives it. -->

## Impact

- `scripts/release.sh` (new): the release automation.
- `package.json`: `release` script.
- No changes to the workflow, license, or app source.
