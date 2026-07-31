## Why

Overlook currently runs a single terminal. The product vision is a project workspace where you juggle multiple shells — one per worktree, per task, per context. This change introduces the tab + panel system: a top tab bar with one terminal per tab, plus a constrained split layout (one vertical split → two panes side by side; one bottom split → a third pane below), with each panel color-coded to its tab.

## What Changes

- **Tab bar** — top bar housing tabs (AntD Tabs as a control-only strip, no content children). Each tab shows a colored title (its panel's accent color), a close button, and the bar scrolls horizontally when tabs overflow.
- **Split controls** — three buttons on the right of the tab bar: create tab (`+`), toggle vertical split, toggle bottom split. The two splits are **independent toggles** producing four states: single, vertical (50/50), bottom (top 70% / bottom 30%), and vertical+bottom combined.
- **Tab/panel model** — a layout context (`TerminalLayoutContext`) owning tabs, panels, split mode, and focus. Tabs are first-class: closing kills the session; parking (removing from a panel) keeps the session alive.
- **TerminalHost refactor** — `TerminalView` becomes a per-tab host that is *never unmounted until the tab closes*; visibility and position are CSS-driven, so sessions survive tab switches, split toggles, and panel reassignment. Empty panels show a placeholder.
- **Panel colors** — palettes gain an `accents: [c1, c2, c3]` field (three distinct hues per theme); panel borders and their tab's title use these colors.
- **macOS window-button merge** — `titleBarStyle: "Overlay"` + `hiddenTitle: true`, the tab bar becomes the window drag region (`data-tauri-drag-region="deep"`), with left padding on macOS for the traffic lights.
- **No Rust changes** — the PTY backend already supports multiple concurrent sessions.

## Capabilities

### New Capabilities
- `terminal-layout`: Multi-terminal workspace — a tab bar with one terminal per tab, constrained split layouts (single / vertical / vertical+bottom), per-panel color coding, tab close, and macOS traffic-light integration.

### Modified Capabilities
<!-- None — palette gains an implementation-level `accents` field; no existing requirement changes. -->

## Impact

- **New code**: `src/layout/` (layout context + state model), `src/components/TerminalTabBar.tsx`, `src/components/SplitPane.tsx` (panel + placeholder), `src/modules/terminal/TerminalHost.tsx` (refactor of TerminalView), layout CSS.
- **Modified code**: `src/App.tsx` (layout wiring), `src/themes/palettes.ts` (+`accents`), `src/themes/antd.ts` (Tabs component tokens), `src/App.css`, `src-tauri/tauri.conf.json` (macOS title bar overlay).
- **No new dependencies.**
- **None of this is breaking** — the single-terminal look is preserved as the initial state (one tab, no splits).
