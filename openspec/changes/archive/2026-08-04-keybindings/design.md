## Context

The app currently dispatches actions only from UI clicks. The tab bar, layout context (`TerminalLayoutContext`), and settings context expose most actions; zoom lives in `TerminalHost` (per-host) driven by a settings `termSize` baseline; the runnable launcher is a popover in the tab bar. xterm reads keys from its internal textarea, so a capture-phase `window` keydown handler can intercept combos before they reach the terminal.

## Goals / Non-Goals

**Goals:**
- Configurable shortcuts for every app action, dispatched before TUIs see keys.
- Default map (Cmd on macOS, Ctrl elsewhere), primary + optional alt per action.
- Keybindings tab in settings with capture-mode recording and reset.

**Non-Goals:**
- Chorded/leader-key sequences (single-press combos only).
- Shortcuts with no Cmd/Ctrl modifier (deliberately rejected — TUI safety).
- Per-worktree or per-tab overrides; shortcut conflicts warnings in settings (last-writer-wins for now).
- Global (OS-level) shortcuts — app-focused only.

## Decisions

### Capture-phase interception
`useKeyboardShortcuts` adds a `window` `keydown` listener with `capture: true`. On a match: call the action, `e.preventDefault()`, `e.stopPropagation()`. Because capture runs before the terminal's textarea, TUIs never see the combo.
- **Why**: simple, matches VS Code/iTerm2 behavior.
- **Note**: `stopPropagation` at window-capture prevents the event reaching xterm's DOM handler; `preventDefault` stops any default webview behavior.

### Action registry + combo model
`src/shortcuts/keybindings.ts` exports:
- `ActionId` union and an `ACTIONS` table: `{ id, label, description?, run }`.
- Combo format string `"Cmd+Shift+["` parsed to `{ mod, shift, alt, key }`; `resolveMod` maps `Cmd`→`metaKey` on macOS, `Ctrl`→`ctrlKey` elsewhere.
- `formatCombo`, `parseCombo`, `matchesEvent`.
- Default map `DEFAULT_KEYBINDINGS: Record<ActionId, { primary, alt: string | null }>`.
- **Why**: one module owns parse/format/compare; settings stores strings (JSON-safe), the hook compares against event fields.

### Default map
Primary (macOS `Cmd`, else `Ctrl`); alt listed where present:
`focusSlot0 Cmd+1`, `focusSlot1 Cmd+2`, `focusSlot2 Cmd+3`, `focusSidebar Cmd+4`,
`nextTab Cmd+] / Ctrl+Tab`, `prevTab Cmd+[ / Ctrl+Shift+Tab`,
`closeTab Cmd+W`, `newTerminal Cmd+T`, `toggleVerticalSplit Cmd+\`,
`toggleBottomSplit Cmd+B`, `toggleSidebar Cmd+S`, `openLauncher Cmd+R`,
`zoomIn Cmd++` (recorded as Cmd+Shift+=), `zoomOut Cmd+-`.

### Settings model
`Settings.keybindings: Record<ActionId, { primary: string; alt: string | null }>`, seeded from `DEFAULT_KEYBINDINGS` when absent; merged/validated on load like `runnables`.
- **Why**: localStorage is the existing settings store; strings are JSON-safe.

### Dispatch wiring
The hook reads the active layout context and settings context. Most actions map directly (`focusSlot`, `selectTab`, `toggleVertical`, `toggleBottom`, `newTab`, `closeTab`, `setActiveWorktree`-style sidebar toggle). Missing plumbing:
- `toggleSidebar` / `focusSidebar`: app-level state — lift `workspacesOpen` or expose a toggle through a small context/event (AppShell owns it today).
- `openLauncher`: currently popover state inside `TerminalTabBar` — expose via a shared callback (e.g. a ref/context `openLauncher()` or an event) so the hook can open it.
- `zoomIn/zoomOut`: adjust the settings `termSize` baseline (TerminalHost already recomputes when it changes).
- `closeTab`: uses the focused tab id.

### Settings modal → AntD Tabs
Convert the single scrollable modal into `<Tabs>` with Appearance (theme, UI font/scale, terminal font/size) / Runnables / Keybindings panes; the thin Terminal pane is merged into Appearance.
- **Why**: the modal is growing; tabs keep it navigable.
- **Note**: the old `Tabs` component theme override (suppressed ink bar, accent titles) was written for the pre-Tag tab bar and is now stale — removed from `antd.ts` so the modal's tabs render with the default ink-bar/selected-color styling. `SettingsModal` is the only AntD `Tabs` consumer left.

### Keybindings tab
Rows: action label | primary button (shows combo, click → recording state "Press keys…" with pulse) | alt button (same). A "Reset to defaults" button at the top. Recording: capture next keydown, require `mod` (Cmd/Ctrl), format and save. Escape cancels a primary recording or clears the alt binding when recording one.
- **Why**: capture mode avoids typo-prone text entry; ESC doubles as the clear-alt gesture (no per-row clear button).

## Risks / Trade-offs

- [`Cmd+R` may reload in dev if the default macOS menu exists] → verify in implementation; if it conflicts, remove the default menu or use `Cmd+Shift+R` for the launcher default.
- [`Cmd+T`/`Cmd+W` are browser tab/close keys] → the Tauri WKWebView has no browser tab system and no menu accelerators for these; safe in-app, verified in dev.
- [Capture handler must not fire while typing in text inputs/popovers] → guard: skip when `e.target` is an `input`/`textarea`/contenteditable or when a modal/popover is open.
- [Recording an already-used combo silently overrides] → accepted for v1; last-writer-wins.

## Migration Plan

Frontend-only; settings default seeding handles existing installs (missing `keybindings` → defaults). Rollback: revert the hook mount + settings/tab changes.
