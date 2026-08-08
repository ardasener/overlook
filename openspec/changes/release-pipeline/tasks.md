## 1. License

- [x] 1.1 Add `LICENSE` at the repo root with the MIT license text and the project copyright notice

## 2. Release workflow

- [x] 2.1 Create `.github/workflows/release.yml` triggered on `push: tags: ["v*"]`
- [x] 2.2 Matrix: `ubuntu-22.04`, `windows-latest`, `macos-latest` (aarch64) and `macos-latest` (x86_64) — macOS entries pass `args: --target <triple>`
- [x] 2.3 Steps: checkout, setup-node LTS, `dtolnay/rust-toolchain@stable` (macOS targets only on macOS), Linux system deps, `bun install`, `tauri-apps/tauri-action@v0`
- [x] 2.4 tauri-action inputs: `tagName: v__VERSION__`, `releaseName: v__VERSION__`, `releaseDraft: true`; `permissions: contents: write` on the job

## 3. Verification

- [x] 3.1 Validate the YAML parses (e.g. `actionlint` or a YAML check)
- [x] 3.2 Manual: push a `v0.1.0` tag after merge; confirm the workflow runs on all four jobs and creates a draft release with the expected bundles (NSIS `.exe`, AppImage + `.deb`, `.app`/`.dmg` for both macOS arches)
