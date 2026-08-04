## Why

The tab strip relies on AntD `Tabs type="editable-card"` purely as a row of closable labels — its pane machinery is hidden and unused, and drag handling is wired onto labels inside it. The pointer-based tab drag also never prevents native text selection, so dragging over the workspace sidebar selects its text and can swallow the `mousemove`/`mouseup` events that drive the drag, breaking drops.

## What Changes

- The tab strip becomes a custom row of AntD `Tag` pills (active tab tinted with its slot accent, inactive muted, closable, click-to-select, click-through pointer drag).
- The strip overflows horizontally with **no visible scrollbar**; the mouse wheel scrolls it naturally.
- The newly active tab auto-scrolls into view when it changes (click, creation, runnable launch).
- Dragging disables text selection window-wide (`body.ol-dragging` + `user-select: none`), so workspace text never gets selected mid-drag and drag events keep flowing.

## Capabilities

### New Capabilities
- `tag-tab-strip`: The custom Tag-based tab strip — rendering, active/inactive styling, closable behavior, overflow scrolling, wheel scroll, auto-scroll-to-active, and window-wide drag selection guard.

### Modified Capabilities
<!-- None: drop targets, slot layout, and the drag ghost are unchanged. -->

## Impact

- `src/components/TerminalTabBar.tsx`: replace `Tabs` with the Tag strip; add wheel handler, auto-scroll, drag-guard class toggling.
- `src/components/TerminalTabBar.css`: strip layout, Tag overrides, hidden scrollbar, `ol-dragging` selection guard.
- `src/layout/TerminalLayoutContext.tsx`: `beginDrag`/`endDrag` toggle `document.body`'s `ol-dragging` class.
- No Rust, no IPC, no new commands.
