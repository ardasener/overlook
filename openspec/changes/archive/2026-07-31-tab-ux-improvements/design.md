## Context

The tab system (`TerminalLayoutContext` + `TerminalTabBar` + `SplitLayout` + `TerminalHost`) is functional but static. Tabs live in the bar and panes; nothing moves, nothing dims, titles are generic, and the only font control is the global settings value. The Rust PTY backend owns sessions in a `HashMap<u32, Session>` with a `Channel` stream per session.

Key facts grounding this design:
- `Session` currently keeps only `child.clone_killer()`, the writer, the master, and an `exited` flag — **the child handle moves into the waiter thread**, so the shell PID is not stored. It must be captured at spawn.
- Clicking a terminal pane calls `terminal.focus()` only — **`focusedSlot` in the layout is never updated by terminal clicks**, which the active-pane dimming depends on.
- The tab model is `{ id, title }` — needs a per-tab zoom field; titles become mutable via a rename action.

## Goals / Non-Goals

**Goals:**
- Drag a tab from the bar onto a pane: assigns it there; if it was shown in another pane, the two panes swap tabs.
- Visually distinguish the focused pane (dim the others).
- Ctrl/Cmd + wheel (or pinch) over a pane zooms its font; the settings option becomes "Default font size".
- Tab titles reflect the running process (e.g., `vim`, `npm`), falling back to "Terminal N" when idle.
- All interactions are unix-first (Windows deferred per project).

**Non-Goals:**
- **Pane-to-pane drag (swap)** — shelved per user decision; the `swapSlots` action is designed but not wired to a gesture.
- Drag-to-reorder tabs within the bar.
- OSC 0/2 title-based naming (process walk chosen over shell-title dependence).
- Per-pane theme or per-pane default font (zoom is relative to the single default).
- Zoom indicators/toasts, zoom reset button, persistence of per-tab zoom across restarts.

## Decisions

### D1: One drop operation covers assign and swap (`dropTabOnSlot`)

```ts
dropTabOnSlot(tabId, slot):
  const from = slots.indexOf(tabId)
  if (from === -1)        → slots[slot] = tabId        // parked → assign, old occupant parks
  else if (from !== slot) → swap slots[from], slots[slot]
  focusedSlot = slot
```

The user's "swapped with this pane" behavior is the `from !== slot` case. A single action keeps the state model simple and is reused by any future drag source (including the shelved pane drag).

DataTransfer contract — **pointer-based drag** (not HTML5 DnD): WKWebView starts the HTML5 drag (ghost appears) but never delivers `dragover`/`drop` for custom dataTransfer, so tab-to-pane drags silently did nothing. The implementation:
- Tab labels: `mousedown` records a press origin; `mousemove` past a ~4px threshold calls `beginDrag(tabId, x, y)`.
- The layout context tracks `drag: { tabId, x, y, overSlot }`; while dragging, a window `mousemove`/`mouseup` listener updates the position and hit-tests the pane slot under the pointer (`document.elementFromPoint` → `closest('.slot')`, excluding `host-hidden`).
- `mouseup` → `endDrag()`: if `overSlot` is set, `dropTabOnSlot`; the slot highlight and a floating ghost render in `SplitLayout`.
- This reuses the same `dropTabOnSlot` payload contract the shelved HTML5 design specified, so a future drag source (pane drag) plugs in the same way.

### D2: Active pane indication — dim the border, keep content full-brightness

- `SplitLayout` renders each host slot with `slot-active` when `slot === focusedSlot`.
- CSS: **dim the accent border of non-active panes** (`border-color: var(--ol-accent-N-dim)`, where the `-dim` variants are the accent colors at reduced alpha from `cssVars.ts`), with a 0.15s transition. The terminal content stays at full opacity — dimming the border (the panel's color-coding signal) is the indicator, and readability of inactive terminals is never sacrificed.
- **Fix**: `TerminalHost` receives a `slot: number | null` prop and its `onMouseDown` calls `focusSlot(slot)` (when non-null) in addition to `terminal.focus()`. Placeholders already focus their slot on activate.
- A focused slot's tab keeps its bold title (existing behavior); tab titles keep their accent colors regardless of pane activity.

### D3: Per-pane font zoom relative to the default

- `TerminalTab` gains `fontZoom: number` (default 0). Effective size = `clamp(settings.termSize + fontZoom, 8, 24)`.
- `zoomTab(tabId, delta)` adjusts `fontZoom` by `±1` per wheel event, clamped so the effective size stays in bounds.
- Gesture: a **native non-passive** `wheel` listener on the host container (React's synthetic `onWheel` is passive — `preventDefault()` wouldn't stop WKWebView page zoom). When `e.ctrlKey || e.metaKey`: `preventDefault()` + `zoomTab(tabId, e.deltaY < 0 ? 1 : -1)`. Trackpad pinch arrives as `ctrlKey` wheel events and hits the same path.
- Applying: the existing live-options effect uses `xtermOptions(...)` — split it so `fontFamily`/`theme` come from settings while `fontSize` = effective per-tab size; after a font size change call `fit()` (cell size changed → `onResize` fires → `pty_resize` keeps the PTY in sync).
- Settings: label "Size" → **"Default font size"**, tooltip notes Ctrl/Cmd+scroll zoom. Because zoom is relative, changing the default still updates every tab (each keeps its offset).

### D4: Auto titles via process-tree walk

Source of truth: the **deepest live descendant** of the session's shell, via `ps`. Works without any shell/title configuration.

Rust:
- `Session` stores `shell_pid: Option<u32>` from `child.process_id()` at spawn.
- New command `pty_foreground_process(session_id) -> Result<String, String>` returns the **first non-shell descendant** of the shell (empty string when the shell is idle or the session is gone).
- Pure `parse_ps_output(ps_lines, shell_pid) -> Option<String>`: parse `pid ppid comm` lines, build a `pid → (ppid, comm)` map, walk from `shell_pid` **descending only through shell wrappers** (`sh`/`bash`/`zsh`/…) and stopping at the first non-shell process — the process the user launched. This keeps titles as the main process (e.g. `vim`), never its subprocesses (vim's node-based language servers), and follows the lowest-pid child at each level. **Unit-tested** with canned `ps` output (including a `vim → node → copilot-lsp` tree that must yield `vim`).
- The `ps` invocation (`ps -axo pid=,ppid=,comm=`) lives in the `#[cfg(unix)]` arm; non-unix returns empty.

Frontend:
- Each visible host polls `pty_foreground_process` every 1s (interval started when `sessionId != null && visible`, stopped otherwise); when the returned name is non-empty and differs from the current title, call `renameTab(tabId, name)`.
- Idle (shell is the leaf) → title untouched ("Terminal N").
- Polling cost: one `ps` per visible tab per second — negligible.

### D5: Context API additions

`TerminalTab` gains `fontZoom`. New actions on `TerminalLayoutContextValue`:

| Action | Effect |
|---|---|
| `dropTabOnSlot(tabId, slot)` | assign or swap (D1), then focus `slot` |
| `zoomTab(tabId, delta)` | clamp-adjusted `fontZoom` |
| `renameTab(tabId, title)` | set the tab's title |
| `swapSlots(a, b)` | implemented for the shelved pane-drag (D1 reuse), not yet wired |

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| HTML5 DnD quirks in WKWebView | Standard API with `dataTransfer`; pointer-drag fallback is a contained swap if needed |
| Wheel-zoom hijacks page zoom | Native non-passive listener + `preventDefault` on ctrl/cmd+wheel only |
| `ps` output format drift | Pure parser, unit-tested; `comm` truncated on macOS (16 chars) is acceptable for titles |
| Process-name noise (e.g. `sh` wrappers) | Acceptable; VSCode-style behavior. OSC-title naming is a future refinement |
| Dimmed borders could be too subtle on small panes | `-dim` alpha tuned (≈0.35 of the accent); active pane keeps full accent |
| Per-tab zoom lost on restart | Accepted (Non-Goals) |

## Open Questions

None — pane-to-pane drag is the only deferred piece and is already modeled (`swapSlots`).
