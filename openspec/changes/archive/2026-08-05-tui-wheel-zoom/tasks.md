## 1. Capture-phase zoom handler

- [x] 1.1 In `TerminalHost.tsx`, change the zoom `wheel` listener to `addEventListener("wheel", onWheel, { capture: true, passive: false })` and remove with `{ capture: true }`
- [x] 1.2 In `onWheel`, after the modifier check passes, call `e.stopPropagation()` alongside the existing `preventDefault()` so xterm's bubble-phase mouse-report listener never sees the event

## 2. Verification

- [x] 2.1 `bun check-types` and `bun lint` pass
- [x] 2.2 Manual: run htop (and vim, opencode) and verify Ctrl/Cmd + wheel zooms the font; plain wheel still scrolls the TUI; bare-shell zoom unchanged; zoom bounds and per-pane behavior intact
