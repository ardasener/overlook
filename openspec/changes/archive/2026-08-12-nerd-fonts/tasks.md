## 1. Fetch script

- [x] 1.1 Create `scripts/fetch-nerd-fonts.ts` with a manifest of the 8 families (FiraCode, JetBrainsMono, BlexMono, SauceCodePro, GoMono, UbuntuMono, DejaVuSansMono, Terminess), pinned to Nerd Fonts v3.5.0, listing each file's raw.githubusercontent URL and SHA256 checksum
- [x] 1.2 Implement verify-and-skip: if all woff2 outputs exist and match pinned checksums, skip; `--force` re-fetches; checksum mismatch hard-fails without overwriting
- [x] 1.3 Implement Python venv bootstrap: create gitignored venv (`.fonts-venv/`), install `fontTools` + brotli, detect `python3`/`python` per platform
- [x] 1.4 Implement TTF download → SHA256 verify → woff2 conversion → write to `src/assets/nerd-fonts/`
- [x] 1.5 Generate `src/assets/nerd-fonts/nerd-fonts.css` with `@font-face` rules (family names `FiraCode Nerd Font Mono`, etc.; weights 400 + 600, or 400 + 700 for families without SemiBold)

## 2. Wire into build

- [x] 2.1 Add `fonts:fetch` script to `package.json` and chain into `dev` and `build` scripts
- [x] 2.2 Add `src/assets/nerd-fonts/` and `.fonts-venv/` to `.gitignore`
- [x] 2.3 Remove `@fontsource/fira-code`, `@fontsource/jetbrains-mono`, `@fontsource/ibm-plex-mono` from `package.json` and delete their imports from `src/fonts.ts`; import the generated `nerd-fonts.css` instead

## 3. Frontend options

- [x] 3.1 Update `src/themes/xterm.ts` `TERM_FONT_STACKS` to the 8 Nerd Font family names with system mono fallbacks
- [x] 3.2 Update `src/settings/SettingsContext.tsx` `TERM_FONT_OPTIONS` to the 8 families (ids `fira-code`, `jetbrains-mono`, `blex-mono`, `sauce-code-pro`, `go-mono`, `ubuntu-mono`, `dejavu-sans-mono`, `terminess`; Nerd Fonts display names)

## 4. CI and docs

- [x] 4.1 Add Python venv setup step to `.github/workflows/release.yml` (all matrix platforms, `python`/`python3` per OS) before the build step
- [x] 4.2 Document the Python 3 + fontTools requirement and version bump procedure in the README

## 5. Verification

- [x] 5.1 Run `bun run fonts:fetch` clean, then again (verify skip), then `--force`
- [x] 5.2 Run `bun check-types` and `bun run build`; confirm woff2 files land in `dist/`
- [x] 5.3 Run the app, verify all 8 fonts render glyphs (e.g., run a PUA-heavy tool) and bold text uses the bundled heavy weight
- [x] 5.4 Confirm old saved `termFont` values (`fira-code`, `jetbrains-mono`, `ibm-plex-mono`) still resolve
