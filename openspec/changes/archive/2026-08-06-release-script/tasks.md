## 1. Release script

- [x] 1.1 Create `scripts/release.sh` with `set -euo pipefail`
- [x] 1.2 Preflight: abort on uncommitted changes (`git status --porcelain`) and on out-of-sync with origin (`git fetch origin` + compare with `@{u}`)
- [x] 1.3 Read the current version from `src-tauri/tauri.conf.json`
- [x] 1.4 Compute the new version: `--major` → major+1/minor=0/patch=0; `--patch` → patch+1; default → minor+1/patch=0 (reject conflicting flags)
- [x] 1.5 Write the new version to `tauri.conf.json`, `package.json`, and `Cargo.toml`
- [x] 1.6 Commit `release: v<new>`, tag `v<new>`, push the branch and the tag

## 2. npm entry

- [x] 2.1 Add `"release": "bash scripts/release.sh"` to `package.json` scripts

## 3. Verification

- [x] 3.1 `bun release --help`-style dry checks: run against the repo and confirm preflight guards fire with uncommitted changes / out-of-sync state (without pushing)
- [x] 3.2 Manual: `bun release` bumps `0.1.0` → `0.2.0` and pushes the tag; `bun release --patch` bumps `0.2.0` → `0.2.1`; `bun release --major` bumps `0.2.1` → `1.0.0` — all triggering the release workflow
