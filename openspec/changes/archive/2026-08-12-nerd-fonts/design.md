## Context

Terminal fonts are currently loaded from `@fontsource/*` npm packages (woff2, bundled by Vite into `dist/`), declared in `src/fonts.ts`, and referenced by xterm via `TERM_FONT_STACKS` in `src/themes/xterm.ts`. The settings dropdown lists 3 terminal fonts. Nerd Fonts are patched supersets with PUA glyphs (powerline, devicons, octicons, etc.) — needed for modern terminal tools.

Nerd Fonts v3.5.0 publishes each family as individual patched TTFs under `patched-fonts/<Family>/` in the `ryanoasis/nerd-fonts` repo (some families nest under `Ligatures/` or `Mono/` subfolders). Release zips are huge (JetBrainsMono.zip = 125 MB) and include all variants; individual TTF raw URLs are ~2.4–2.6 MB each. woff2 conversion via Python `fontTools` yields ~55–60% size reduction (verified: 2.6 MB TTF → 1.2 MB woff2).

## Goals / Non-Goals

**Goals:**
- 8 Nerd Font families (Mono variant) bundled and served to xterm, with PUA glyph coverage.
- Deterministic, verifiable fetch pipeline: pinned version + SHA256 checksums.
- woff2 conversion to keep bundle size reasonable (~16–18 MB).
- Settings UI lists all 8 fonts with Nerd Fonts display names.
- Repeatable locally and in CI (macOS ARM/Intel, Linux, Windows).

**Non-Goals:**
- Ligature support (xterm does not render ligatures).
- Font fallback to @fontsource packages (Nerd Fonts are supersets).
- Runtime font download (fonts are baked into the bundle).
- Supporting other Nerd Font variants (Propo / non-Mono).
- Migrating old saved `termFont` values (ids `fira-code`, `jetbrains-mono`, `ibm-plex-mono` are preserved).

## Decisions

### 1. Fetch individual TTFs via raw.githubusercontent, not release zips
- **Why**: zips are 25–125 MB and contain all variants/weights; raw TTF URLs are ~2.5 MB each and we only need 2 weights × 8 families.
- **Alternative**: release zips like the reference installer script — rejected for size and extraction overhead.

### 2. Mono variant only
- **Why**: `NerdFontMono` keeps all glyphs at the original advance width, so icons occupy exactly one cell and xterm's grid never breaks. Non-Mono variants have proportional icon widths.
- **Alternative**: default `NerdFont` variant — rejected for terminal alignment.

### 3. Weights: 400 + 600 where available, else 400 + 700
- FiraCode/JetBrainsMono/BlexMono/SauceCodePro ship `SemiBold` → Regular (400) + SemiBold (600).
- Terminess/GoMono/UbuntuMono/DejaVuSansMono only ship Regular + Bold → Regular (400) + Bold (700).
- xterm requests bold (700) by default; with only 600 declared the browser maps bold text to SemiBold — the preferred terminal bold look.
- **Alternative**: 400/500/600 parity like @fontsource — rejected (xterm never uses 500/600; Terminess has no SemiBold anyway).

### 4. woff2 conversion via Python fontTools in a gitignored venv
- **Why**: ~55–60% size reduction; `fontTools` is the standard, reliable woff2 encoder (brotli required). Python is preinstalled on all CI runners.
- Venv is gitignored (e.g. `.fonts-venv/`); CI creates it with `python -m venv` + `pip install fonttools brotli`. The fetch script detects `python3`/`python` for cross-platform.
- **Alternative**: commit woff2 files — rejected (user wants no committed binaries; avoids licensing/size churn in repo).
- **Alternative**: pure-JS woff2 encoder — no reliable maintained option; Python is approved.

### 5. Checksum-pinned, verify-and-skip fetch script
- Script `scripts/fetch-nerd-fonts.ts` (bun/TypeScript, cross-platform) with a manifest: `{ version: "v3.5.0", fonts: [{ family, files: [{ name, url, sha256 }] }] }`.
- Behavior: if all output files exist and match pinned SHA256 → skip (fast dev). `--force` re-fetches. Checksum mismatch → hard fail (supply-chain tripwire).
- Output: `src/assets/nerd-fonts/*.woff2` + generated `nerd-fonts.css` with `@font-face` rules.
- **Why**: deterministic builds; no surprise upstream mutations; offline-friendly after first fetch.

### 6. Fonts reach the webview as Vite assets, same as today
- `src/fonts.ts` imports the generated `./assets/nerd-fonts/nerd-fonts.css`; Vite bundles + hashes woff2 into `dist/`, Tauri serves them. No Rust/IPC changes.
- xterm stacks use our declared family names (`FiraCode Nerd Font Mono`, etc.) with system mono fallbacks; `document.fonts.ready` refit already exists in `TerminalHost`.

### 7. Display names = Nerd Fonts names
- Settings options: FiraCode, JetBrainsMono, BlexMono, SauceCodePro, GoMono, UbuntuMono, DejaVuSansMono, Terminess. Safest licensing-wise (no IBM/Adobe/Google trademarks).
- `termFont` setting ids: `fira-code`, `jetbrains-mono`, `blex-mono`, `sauce-code-pro`, `go-mono`, `ubuntu-mono`, `dejavu-sans-mono`, `terminess`. Existing saved ids preserved → no migration needed.

### 8. Hook into `dev`/`build` scripts
- `"dev": "bun run fonts:fetch && vite"`, `"build": "bun run fonts:fetch && tsc && vite build"`. Runs on every `bun tauri dev`/`bun tauri build` and in CI release workflow (fast no-op after first run).

## Risks / Trade-offs

- **First build/`bun tauri dev` needs network** → fetched files are gitignored but cached on disk; subsequent runs are offline no-ops. CI always has network.
- **Upstream Nerd Fonts release changes** → checksums pinned; bumping versions is an explicit manifest edit. A malicious/mutated file fails the build instead of shipping.
- **Python venv setup friction** → documented in README + automated in CI; `--check` fast-fail with clear message if venv missing.
- **Bundle size +16–18 MB** → accepted; woff2 halves what TTF would be.
- **Blex/SauceCode renames may confuse** → display names match Nerd Fonts branding; proposal marks it **BREAKING**.
- **Mono variant icon width** → icons are exactly 1 cell; grid never breaks.

## Migration Plan

1. No user-data migration: setting ids for existing fonts unchanged; new ids simply appear in the dropdown.
2. CI: add Python venv step before build; tauri-action path unchanged.
3. Rollback: revert to @fontsource imports + revert TERM_FONT_STACKS/OPTIONS (one commit).
