## Context

The tab bar currently renders AntD `Tabs type="editable-card"` as a control-only strip (content holder hidden), with pointer-based drag wired onto the label spans. Drag is a mousedown → 4px threshold → `beginDrag` flow in `TerminalLayoutContext`, tracking via global `mousemove`/`mouseup` and hit-testing `.slot` elements with `elementFromPoint`. The strip's overflow is handled by AntD's nav (with its own scrollbar). Text selection is only disabled on the label itself.

## Goals / Non-Goals

**Goals:**
- Replace `Tabs` with a custom row of AntD `Tag` pills (accent-tinted active state, closable, click-select, drag source).
- Horizontal overflow scroll with no visible scrollbar, driven by the mouse wheel.
- Auto-scroll the focused tag into view.
- Prevent window-wide text selection during drags.

**Non-Goals:**
- Drag-reordering of tabs within the strip (drops target panel slots only, as today).
- Keyboard navigation for tabs.
- Any change to the drop pipeline, slot hit-testing, or drag ghost.
- Vertical wrapping of tags.

## Decisions

### Custom strip div + AntD `Tag` per tab
Replace `<Tabs>` with `<div className="tab-strip">` containing one `<Tag closable onClose onClick ...>` per tab. Drag handlers move from the label span to the Tag.
- **Why**: tags give the pill look with close/click built in; we own the row DOM for wheel/scroll behavior.
- **Alternative**: keep `Tabs` and restyle — rejected (unused pane machinery, limited wheel/scrollbar control).

### No-scrollbar overflow via hidden scrollbars + wheel
`.tab-strip { overflow-x: auto; scrollbar-width: none; }` and `::-webkit-scrollbar { display: none }`. A wheel listener scrolls `scrollLeft` by `deltaY` (and `deltaX`) only when `scrollWidth > clientWidth`.
- **Why**: single row, no visible scrollbar (WKWebView honors `::-webkit-scrollbar: none`), natural wheel mapping.
- **Note**: overflow only occurs with many tabs; the listener no-ops otherwise.

### Auto-scroll active tag into view
Keep a ref to the active tag element (via `tabId` key) and `scrollIntoView({ block: "nearest", inline: "nearest" })` in an effect on `focusedTabId`. `inline: "nearest"` scrolls the strip minimally.
- **Why**: standard tab behavior; parked runnable tabs become reachable.

### Window-wide selection guard via body class
`beginDrag` adds `ol-dragging` to `document.body`; `endDrag` removes it. CSS: `body.ol-dragging, body.ol-dragging * { user-select: none; -webkit-user-select: none; }`. The window `mousemove` handler also `preventDefault()`s during drag to stop native selection from starting.
- **Why**: WKWebView starts text selection on plain mousemove over selectable text; a body-wide guard covers the sidebar without touching every element.
- **Alternative**: per-element `user-select: none` on the sidebar — rejected (leaks the concern into unrelated components).

### Styling
Tags use the existing palette CSS vars: active tag gets `color: var(--ol-accent-N)` + bold + a subtle accent border/bg; inactive tags muted. Close icon inherits. `.terminal-tab-label` styles are replaced by tag styles.

## Risks / Trade-offs

- [Wheel handler is passive by default; no preventDefault] → we only need to scroll, not block the page (page can't scroll anyway — `overflow: hidden` on body).
- [`scrollIntoView` may scroll the page, not just the strip] → with `inline: "nearest"` and the body non-scrollable this is contained; verify in dev.
- [Tags have default margins/padding] → overridden in CSS to compact the strip.
- [`user-select: none` during drag affects the whole window briefly] → acceptable; drags are transient.

## Migration Plan

Frontend-only; ships in the same dev cycle. Rollback: revert `TerminalTabBar.tsx`, `TerminalTabBar.css`, and the two drag hooks in `TerminalLayoutContext.tsx`.
