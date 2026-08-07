## Why

Ctrl/Cmd + mouse wheel (or trackpad pinch) zooms the terminal font on bare shells, but stops working inside TUIs like htop, vim, and opencode. The zoom handler never fires there, so the zoom gesture is dead while a TUI is running.

## What Changes

- The zoom wheel handler moves to the **capture phase** so it runs before xterm's own wheel handling, which TUIs activate via mouse reporting and which currently swallows the event via `stopPropagation()`.
- Only modifier-wheel (Cmd/Ctrl held) is intercepted — plain wheel still reaches the TUI so its native scrolling keeps working.
- Zooming inside a TUI now works exactly as on a bare shell: per-pane font zoom, bounded 8–24px, relative to the default size.

## Capabilities

### Modified Capabilities
- `tab-interactions`: Per-pane font zoom now functions inside TUIs that enable mouse reporting.

### New Capabilities
<!-- None: fixes the existing zoom behavior. -->

## Impact

- `src/modules/terminal/TerminalHost.tsx`: the zoom wheel listener changes to capture phase (`addEventListener("wheel", onWheel, { capture: true, passive: false })`) and calls `stopPropagation()` on the intercepted modifier-wheel event.
- No Rust, no settings changes, no new commands.
