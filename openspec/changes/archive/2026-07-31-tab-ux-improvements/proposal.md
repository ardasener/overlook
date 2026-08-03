## Why

The tab system works but is static: tabs can't move between panes, the active pane is indistinguishable, terminal font size can't be adjusted per-pane, and tab titles are generic ("Terminal N") regardless of what's running. These are the interaction gaps a daily-driver terminal app needs closed. This change makes tabs draggable onto panes, dims inactive panes, adds per-pane font zoom (Ctrl/Cmd + scroll), and auto-titles tabs from the process running in them.

## What Changes

- **Drag & drop tabs onto panes** — each tab in the tab bar is draggable; dropping it on a pane slot assigns it there (parking the slot's previous tab), and if the tab was shown in another pane the two panes swap. Drop targets get an accent-colored highlight.
- **Active pane indication** — the focused pane keeps full brightness; non-focused panes are dimmed (terminal content opacity), and clicking a terminal now actually focuses its pane (fixes a gap where only the xterm was focused, not the layout slot).
- **Per-pane font zoom** — Ctrl/Cmd + mouse wheel (or trackpad pinch) over a pane zooms that pane's font in/out relative to the settings default. The settings "Size" option is renamed **"Default font size"** and becomes the baseline for the zoom.
- **Automatic tab titles** — tab names derive from the process running in the terminal: a Rust command walks the session's process tree (`ps`) and returns the deepest descendant's name; visible tabs poll it (~1s) and update their title. Idle tabs keep "Terminal N".
- **Rust additions** — `Session` stores `shell_pid` (captured at spawn), new `pty_foreground_process` command, pure `ps`-output parser (unit-tested).
- **Shelved (per user)**: pane-to-pane drag-and-drop — revisit later.

## Capabilities

### New Capabilities
- `tab-interactions`: Drag tabs onto panes (assign or swap), dim inactive panes, per-pane font zoom via Ctrl/Cmd+scroll, and auto tab titles from the running process.

### Modified Capabilities
<!-- None — appearance-settings' "default font size" rename is label-level; the 8–24 range scenario still holds. -->

## Impact

- **New code**: `pty_foreground_process` command + `shell_pid` on `Session` (Rust); drag/drop handlers, zoom gesture handler, title poller (frontend).
- **Modified code**: `TerminalLayoutContext` (tab model + 4 new actions), `SplitLayout` (drop targets + dim classes), `TerminalTabBar` (draggable tabs), `TerminalHost` (focusSlot, wheel zoom, title polling, per-tab font size), `SettingsModal` (label rename), `pty.ts` (new wrapper).
- **No new dependencies.**
- **None of this is breaking** — all additions are opt-in interactions.
