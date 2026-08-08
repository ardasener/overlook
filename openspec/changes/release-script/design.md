## Context

The release tag must equal the app version in `src-tauri/tauri.conf.json` — the GitHub workflow uses `tagName: v__VERSION__`, substituted from that file. The version currently appears in three places: `tauri.conf.json`, `package.json`, and `Cargo.toml`. All three must stay in sync. The release pipeline triggers on a pushed `v*` tag.

## Goals / Non-Goals

**Goals:**
- One command produces a clean release: verify → bump → commit → tag → push.
- Minor bump by default, major with `--major`.
- Version kept in sync across the three files.

**Non-Goals:**
- Patch bumps (minor/major only, per request).
- Automating the GitHub release draft itself (the workflow does that; the script only pushes the tag).
- Pre-release suffixes.

## Decisions

### Shell script `scripts/release.sh`
Bash, `set -euo pipefail`.
- **Why**: git + file-edit automation is natural in shell; no new toolchain.

### Preflight checks
1. `git status --porcelain` empty, else abort ("uncommitted changes").
2. `git fetch origin` then compare `HEAD` with `@{u}` (upstream); abort if they differ ("local is out of sync with origin").
- **Why**: the spec requires both guards before any mutation.

### Version source of truth
Read the current version from `src-tauri/tauri.conf.json` via a small JSON parse (python3 or jq — use python3 for portability). The tag is derived from it.
- **Why**: the workflow's `__VERSION__` comes from this file; package.json/Cargo.toml are synced to match.

### Bump logic
`--major`: `major+1`, `minor=0`, `patch=0`. `--patch`: `patch+1`. Default (no flag): `minor+1`, `patch=0`. Exactly one flag may be given (`--major`/`--patch`).
- **Why**: matches the requested semantics — minor is the default, major and patch are flag-controlled.

### Version write-back
Update `tauri.conf.json` and `package.json` (JSON) with a scripted edit, and `Cargo.toml` `version = "…"` line with `sed`. All three get the same new value.
- **Why**: keeps the three sources consistent; `tauri build` reads Cargo.toml/tauri.conf.json, npm reads package.json.

### Commit / tag / push
`git add` the three files, commit `release: v<new>`, `git tag v<new>`, `git push origin <branch> --tags`.
- **Why**: pushing the tag triggers the release pipeline; pushing the branch carries the version commit.

### npm script
`package.json` → `"release": "bash scripts/release.sh"` so `bun release [--major]` works (bun forwards args).
- **Why**: matches the project's bun-first tooling.

## Risks / Trade-offs

- [Three-file version duplication] → the script keeps them in sync; a drift check could be added later.
- [`--major` from `0.x` goes to `1.0.0`] → intended per spec.
- [Push fails (auth/network)] → script exits with the git error; state is left at "committed + tagged locally," which is recoverable.

## Migration Plan

Add the script and npm entry; no migration. First use: `bun release` → verifies, bumps `0.1.0` → `0.2.0`, commits/tags/pushes; the workflow creates the draft release.
