## Context

Overlook's window frame is configured once in `src-tauri/tauri.conf.json`: `titleBarStyle: "Overlay"` + `hiddenTitle`, with the tab bar (`TerminalTabBar.tsx`) acting as the de-facto titlebar — full-width, carrying `data-tauri-drag-region="deep"`, and padded 80px on the left on macOS (`isMacOS()` gate) so traffic lights sit over it. See proposal.md for why Linux/Windows need a change.

Constraints that shape the approach:

- The tab bar already has three zones: `tabbar-actions-left` (workspace toggle, settings, cleanup), the tab strip, and `tabbar-actions` (new tab, launcher, splits).
- Settings persist via `SettingsContext` (theme, fonts, background, runnables) with corrupt-input fallback to defaults.
- Capabilities live in `src-tauri/capabilities/default.json` (`core:default` present; explicit window-control allows are not).
- AGENTS.md architecture boundary: new host operations must go through registered commands gated by capabilities — Tauri's built-in `core:window` commands satisfy this without new Rust code.

## Goals / Non-Goals

**Goals:**
- One component and one frontend code path for Linux + Windows (`!isMacOS()` gate); zero macOS behavior change.
- Controls styled as part of the AntD chrome, not an OS replica.
- Position setting reuses existing appearance-settings persistence.

**Non-Goals:**
- OS-mimicking button art (traffic-light dots, Windows 11 snap-layout flyouts).
- Extra buttons beyond min/max/close, or close-to-tray semantics.
- Any Rust module work beyond config files and capability grants.
- Making the position setting effective on macOS.

## Decisions

### D1. Decorations off via platform config files, not runtime branching
New `src-tauri/tauri.linux.conf.json` and `src-tauri/tauri.windows.conf.json`, each with `"app": { "windows": [{ "decorations": false }] }`. Tauri merges platform configs over the base at load time; base keeps `Overlay` + `hiddenTitle` for macOS.

*Rationale:* declarative and zero runtime code, mirroring how dev-config isolation already layers `tauri.dev.conf.json`. A runtime `setDecorations(false)` call would flash the native bar before hiding it and move platform logic into Rust for no gain.

*Alternatives considered:* `decorations: false` in the base config — rejected because on macOS it removes the traffic lights entirely, breaking the platform we must not touch; per-platform build scripts — rejected as unnecessary machinery.

### D2. One `<WindowControls>` component reusing the app's icon-action style
Single React component rendering minimize (`MinusOutlined`), maximize/restore (`BorderOutlined` / `SwitcherOutlined` when maximized), close (`CloseOutlined`) as AntD `type="text" size="small"` buttons — identical to every other action button in the tab bar (same hover behavior, same sizing). Wired directly to `getCurrentWindow().minimize() / toggleMaximize() / close()` from `@tauri-apps/api/window`. Rendered only when `!isMacOS()`, positioned by the `side` prop from settings.

*Rationale:* the user rejected title-bar-style custom strips ("far too Windows-like"); reusing the existing AntD text-button language keeps the controls visually indistinguishable from sibling actions and needs zero bespoke CSS (the wrapper reuses `.tabbar-actions`). No new assets or dependencies.

### D3. Maximize state from the window API, not custom IPC
Subscribe to `getCurrentWindow().onResized()` and check `isMaximized()` to swap the restore glyph. Uses only built-in commands already permitted via `core:window:default`.

*Alternative considered:* a custom `#[tauri::command]` reporting window state — rejected: duplicates upstream functionality and widens the command surface against AGENTS.md's minimal-command guidance.

### D4. Position setting stored unconditionally, UI row gated
New persisted setting `windowControlsPosition: "left" | "right"` (default `"right"`) in `SettingsContext`. The appearance-settings row renders only on non-macOS; the value is stored regardless of platform so config stays schema-stable across machines.

*Rationale:* keeps `SettingsContext` free of platform conditionals and reuses the existing persistence/corrupt-input fallbacks verbatim.

### D5. Layout: reserved-gutter rule generalizes the macOS padding
When controls sit on the left (non-macOS), no tab content renders beneath them — satisfied structurally, because software controls are ordinary flex children of the tab bar (in-flow), unlike macOS traffic lights which are a native overlay and need the mac-only `paddingLeft: 80` reservation, kept as-is. Right-positioned controls render after `tabbar-actions`.

### D6. Permissions: four explicit allows
`capabilities/default.json` gains `core:window:allow-minimize`, `core:window:allow-toggle-maximize`, `core:window:allow-close`, `core:window:allow-start-dragging`. Double-click-to-maximize rides on `core:window:default`'s internal toggle-maximize permission.

## Risks / Trade-offs

- **[Drag-region interplay]** Container-level `"deep"` drag regions must not swallow clicks on the control buttons. Buttons are real `<button>` elements like the existing tab-bar actions (which remain clickable today), but verify during implementation; if the deep behavior intercepts, scope drag regions around the controls zone.
- **[Undecorated window edges]** Dropping decorations can lose WM-provided resize borders/shadows on some setups. tao implements hit-test resizing for undecorated windows (Windows) and GTK CSD handles Linux; verify resize-on-edges manually on both platforms.
- **[Lost native affordances]** Windows snap-layout hover flyout and GNOME's window menu are gone — accepted, same cost Terax/Vivaldi pay; WM keyboard shortcuts still work.
- **[Wayland quirks]** Undecorated windows and manual dragging behave differently across compositors (drag latency, positioning). Out of scope to perfect; `startDragging` via tao is the standard path for all Tauri apps.

## Migration Plan

No data migration. Rollback = delete the two platform conf files and the four capability grants; the frontend degrades gracefully (controls simply don't function without permissions, and gating means they never render on macOS).

## Open Questions

- Exact gutter width for left-positioned controls — match macOS's 80px rhythm vs. measuring the rendered component; decide at implementation against real rendering.
