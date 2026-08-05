## 1. Combo model + defaults

- [x] 1.1 Create `src/shortcuts/keybindings.ts`: `ActionId` union, `ACTIONS` table (id/label), `parseCombo`, `formatCombo`, `matchesEvent`, `resolveMod` (Cmd on macOS, Ctrl elsewhere), and `DEFAULT_KEYBINDINGS`
- [x] 1.2 Unit-style sanity: parse/format round-trips for the default map (plain function tests if a harness exists, else verify via check-types + manual)

## 2. Settings model

- [x] 2.1 Add `keybindings: Record<ActionId, Keybinding>` to `Settings` in `SettingsContext`; seed from `DEFAULT_KEYBINDINGS` when absent; validate/normalize on load
- [x] 2.2 Expose `resetKeybindings` (or reuse `update`) for the reset button

## 3. Dispatch hook

- [x] 3.1 Create `src/shortcuts/useKeyboardShortcuts.ts`: capture-phase `window` keydown; parse configured combos; skip when target is input/textarea/contenteditable or a modal is open; on match run the action + `preventDefault` + `stopPropagation`
- [x] 3.2 Wire actions: focus slots + sidebar, tab nav (primary + alt), close focused tab, new terminal, split toggles, zoom (settings `termSize` baseline)
- [x] 3.3 Expose the missing plumbing: `toggleSidebar`/`focusSidebar` (app-level workspacesOpen), `openLauncher` (from TerminalTabBar) — via context or shared callbacks
- [x] 3.4 Mount the hook in `App.tsx`

## 4. Settings modal: tabs + Keybindings

- [x] 4.1 Convert `SettingsModal` to AntD `Tabs` (Appearance / Terminal / Runnables / Keybindings), moving existing sections into panes
- [x] 4.2 Build the Keybindings tab: rows per action (label, primary record button, alt record button, clear-alt), capture-mode recording (require Cmd/Ctrl, Escape/click-away cancels), Reset to defaults
- [x] 4.3 Style the rows/recording state in `SettingsModal.css`

## 5. Verification

- [x] 5.1 `bun check-types` and `bun lint` pass
- [x] 5.2 Manual: every default shortcut dispatches its action; shortcuts don't reach vim/htop/btop; Ctrl+Tab alt works for tab nav; re-recording a binding works and persists; reset restores defaults; recording without Cmd/Ctrl is rejected; typing in the sidebar search or popovers doesn't trigger shortcuts
