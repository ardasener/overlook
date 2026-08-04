## 1. Drag selection guard

- [x] 1.1 In `TerminalLayoutContext`, `beginDrag` adds `document.body.classList.add("ol-dragging")` and `endDrag` removes it
- [x] 1.2 In the window `mousemove` handler used during drag, call `e.preventDefault()` to stop native text selection
- [x] 1.3 Add `body.ol-dragging, body.ol-dragging * { user-select: none; -webkit-user-select: none; }` to `TerminalTabBar.css` (or App.css)

## 2. Tag strip markup

- [x] 2.1 Replace the AntD `Tabs` block in `TerminalTabBar.tsx` with a `<div className="tab-strip">` of AntD `Tag` components
- [x] 2.2 Each tag: `closable`, `onClose` → `closeTab`, `onClick` → `selectTab`, and the existing mousedown/mousemove/mouseup drag handlers on the tag
- [x] 2.3 Remove the `Tabs` import and the `.terminal-tabs` CSS; keep `terminal-tab-label` or migrate its handlers

## 3. Overflow + wheel scroll

- [x] 3.1 `.tab-strip` CSS: `overflow-x: auto`, `scrollbar-width: none`, `::-webkit-scrollbar { display: none }`, single-row flex layout
- [x] 3.2 Add a wheel listener on the strip: scroll `scrollLeft` by `deltaX + deltaY` when `scrollWidth > clientWidth`

## 4. Active tab styling + auto-scroll

- [x] 4.1 Tag styling: focused tag uses its slot accent color + bold; inactive tags muted
- [x] 4.2 Ref the active tag element and `scrollIntoView({ block: "nearest", inline: "nearest" })` in an effect on `focusedTabId`

## 5. Verification

- [x] 5.1 `bun check-types` and `bun lint` pass
- [x] 5.2 Manual: tabs render as tags; click selects; close closes; drag over the workspace sidebar selects no text and drops work; wheel scrolls an overflowing strip with no scrollbar; focused tab scrolls into view on launch
