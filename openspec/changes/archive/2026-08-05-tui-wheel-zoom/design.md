## Context

The zoom handler in `TerminalHost` is a bubble-phase `wheel` listener on the terminal container that checks `ctrlKey || metaKey`, `preventDefault()`s, and calls `zoomTab`. This works on a bare shell but fails inside TUIs. Investigation of the xterm source explains why: TUIs enable mouse reporting (`\x1b[?1000h` etc.), which makes xterm's mouse service install its own `wheel` listener on the terminal element. That listener calls `sendEvent(ev)` (converting the wheel to an SGR mouse report sent to the TUI) and then `cancel(ev, true)`, which forces `preventDefault()` + `stopPropagation()`. The `stopPropagation` stops the bubble-phase event before it reaches our container listener — so zoom never fires.

## Goals / Non-Goals

**Goals:**
- Restore modifier-wheel zoom inside TUIs with mouse reporting.
- Preserve plain-wheel scrolling for the TUI (don't break its native wheel handling).
- Keep bare-shell zoom and existing zoom semantics (bounds, per-pane, relative to default) unchanged.

**Non-Goals:**
- Changing zoom bounds or the per-pane model.
- Adding new settings or keybindings.
- Disabling xterm's mouse reporting (TUIs need it).

## Decisions

### Capture-phase zoom listener
Register the zoom `wheel` handler on the container with `{ capture: true, passive: false }`, and call `stopPropagation()` on the intercepted modifier-wheel event.
- **Why**: capture-phase listeners on the container run during the downward capture pass, BEFORE the terminal element's bubble-phase listener. So our handler sees the event first; when Cmd/Ctrl is held we `preventDefault` + `stopPropagation`, which stops xterm's bubble listener from converting it into a mouse report. Plain wheel returns early (no modifier) without stopping propagation, so xterm's listener still fires and the TUI scrolls normally.
- **Alternative**: attach a `window`/`document` capture listener — rejected (needs per-pane hit-testing; the container capture is sufficient and local).

### Only intercept modifier-wheel
The handler keeps the existing `if (!(e.ctrlKey || e.metaKey)) return;` guard before any `preventDefault`/`stopPropagation`.
- **Why**: the TUI's native wheel scrolling (scrollback navigation, vim scroll) must keep working; only the zoom gesture is claimed.

## Risks / Trade-offs

- [Capture listener ordering vs xterm] → DOM guarantees capture-before-bubble; the container is an ancestor of the terminal element, so capture on the container precedes any bubble listener on the terminal. Verified against xterm's `bindMouse`/`cancel` source.
- [Other capture listeners on ancestors] → none register `wheel` capture today; the app-wide keydown hook is a different event.
- [Trackpad pinch] → arrives as `wheel` events with `deltaY`; unchanged behavior.

## Migration Plan

One-line change in `TerminalHost.tsx` (listener options + `stopPropagation`). Rollback: revert to bubble-phase listener.
