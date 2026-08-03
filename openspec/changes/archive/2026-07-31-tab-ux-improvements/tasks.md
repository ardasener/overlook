## 1. State model

- [x] 1.1 Extend `TerminalTab` with `fontZoom: number` (default 0); add context actions `dropTabOnSlot(tabId, slot)` (assign if parked, swap if shown elsewhere, then focus the slot), `zoomTab(tabId, delta)` (clamp effective size to 8–24), `renameTab(tabId, title)`, and `swapSlots(a, b)` (implemented, not yet wired — reserved for the shelved pane drag)
- [x] 1.2 Verify `pnpm check-types` passes

## 2. Drag & drop tabs onto panes

- [x] 2.1 Make each tab label in `TerminalTabBar` draggable (`draggable` + `onDragStart` writing `application/x-overlook-tab` = tab id to `dataTransfer`)
- [x] 2.2 In `SplitLayout`, make every pane slot and placeholder a drop target: `onDragEnter`/`onDragOver` (preventDefault) toggling a `slot-drop-target` class, `onDrop` calling `dropTabOnSlot(tabId, slot)`
- [x] 2.3 Add drop-target highlight CSS (accent-colored outline using the slot's `--ol-accent-N`)

## 3. Active pane dimming + focus fix

- [x] 3.1 Pass `slot: number | null` to `TerminalHost`; its `onMouseDown` calls `focusSlot(slot)` when non-null (in addition to `terminal.focus()`)
- [x] 3.2 Add `slot-active`/`slot-inactive` classes to host slots in `SplitLayout` based on `focusedSlot`
- [x] 3.3 Add `--ol-accent-N-dim` CSS vars (accents at ≈0.35 alpha) to `cssVars.ts`; dim non-active pane **borders** via those vars (0.15s transition); terminal content stays full-brightness

## 4. Per-pane font zoom

- [x] 4.1 `TerminalHost`: attach a native non-passive `wheel` listener (via effect + ref); on `ctrlKey || metaKey` → `preventDefault()` + `zoomTab(tabId, ±1)`
- [x] 4.2 Split the live-options effect: `fontFamily`/`theme` from settings, `fontSize` = `clamp(settings.termSize + tab.fontZoom, 8, 24)`; after a size change, call `fit()` so `onResize` → `pty_resize` updates the PTY
- [x] 4.3 Rename settings label "Size" → "Default font size" (+ tooltip mentioning Ctrl/Cmd+scroll zoom) in `SettingsModal`

## 5. Automatic tab titles

- [x] 5.1 Rust: store `shell_pid: Option<u32>` on `Session` (captured via `child.process_id()` at spawn)
- [x] 5.2 Rust: `pty_foreground_process(session_id)` command returning the leaf process `comm` (empty when the shell is the leaf); `#[cfg(unix)]` `ps -axo pid=,ppid=,comm=` invocation; pure `parse_ps_output` helper with unit tests (canned `ps` output, shell-leaf case, nested children, empty input)
- [x] 5.3 Register `pty_foreground_process` in `lib.rs`; add `ptyForegroundProcess` wrapper to `pty.ts`
- [x] 5.4 `TerminalHost`: while `visible && sessionId != null`, poll every 1s; when the returned name is non-empty and differs from the tab title, call `renameTab(tabId, name)`

## 6. Verification

- [x] 6.1 Verify `cargo clippy --all-targets -- -D warnings` and `cargo test` pass (including the ps parser tests)
- [x] 6.2 Verify `pnpm check-types` and `pnpm lint` pass
- [x] 6.3 Manual: drag a parked tab onto a pane; drag a shown tab onto another pane (swap); drop-target highlight appears
- [x] 6.4 Manual: with two panes, confirm the focused pane is full-brightness and the other dims; clicking a terminal switches the dim
- [x] 6.5 Manual: Ctrl/Cmd+scroll zooms only the hovered pane; the page doesn't zoom; settings default font size shifts all panes preserving zoom offsets
- [x] 6.6 Manual: run `vim` in a terminal → tab title becomes `vim`; idle terminals keep "Terminal N"
