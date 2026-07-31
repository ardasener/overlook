## 1. Repository hygiene files

- [x] 1.1 Create `.gitignore` covering Node (`node_modules/`, `dist/`), Rust/Tauri (`src-tauri/target/`, `src-tauri/gen/`), OS (` .DS_Store`), editor, and log artifacts
- [x] 1.2 Create `README.md` with project purpose, stack summary, and dev/build commands (`pnpm install`, `pnpm tauri dev`, `pnpm tauri build`)
- [x] 1.3 Create `AGENTS.md` with stack, package manager, commands, and the two-process architecture boundary (webview never touches PTY/FS directly)

## 2. Design document

- [x] 2.1 Write `DESIGN.md` covering: product vision and positioning, design principles (terminal-first, lean, project-centric, quiet by default), UI layout sketch, two-process architecture, the terminal stack decision with the Alacritty rationale (D1), verified dependency versions, and explicit non-features (no AI, no editor, no web preview)

## 3. Tauri + React boilerplate

- [x] 3.1 Scaffold the project with `create-tauri-app` (React + TypeScript + Vite template) in the repository root
- [x] 3.2 Switch to pnpm: add `packageManager` to `package.json`, remove lockfiles from other package managers, run `pnpm install`
- [x] 3.3 Add Ant Design 6, `@xterm/xterm@^5.5.0`, `@xterm/addon-webgl`, `react-xtermjs`, and any xterm addons needed as dependencies; verify `pnpm install` resolves peer deps cleanly
- [x] 3.4 Build the app shell in the React frontend: AntD `Layout` with a workspace sidebar (placeholder workspace list) and a main content area for terminals; wire a minimal theme so the chrome matches the terminal-first aesthetic
- [x] 3.5 Verify `pnpm check-types` (or equivalent) passes and `pnpm tauri dev` launches the window

## 4. Verification

- [x] 4.1 Run `cargo clippy --all-targets` and `cargo test` in `src-tauri` with no errors
- [x] 4.2 Run `pnpm check-types` and `pnpm lint` with no errors
- [x] 4.3 Confirm `openspec` validation passes for the change artifacts (proposal, design, specs) and archive the change
