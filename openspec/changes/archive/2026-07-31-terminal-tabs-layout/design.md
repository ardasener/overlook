## Context

Overlook currently renders a single `TerminalView` that owns one PTY session: it spawns on mount and kills on unmount. The Rust backend already supports N concurrent sessions (`PtyManager` is a `HashMap<u32, Session>`; `pty_open`/`pty_write`/`pty_resize`/`pty_close` are session-scoped), so multi-terminal needs **zero Rust changes**.

The hard constraint is frontend: *a terminal must keep its session alive while its tab is hidden or moving between panels*. The existing component lifecycle (mount → spawn, unmount → kill) makes that impossible unless hosts outlive the panels that show them.

## Goals / Non-Goals

**Goals:**
- A top tab bar; one live terminal per tab; horizontal scroll when tabs overflow.
- Four layout states via two independent toggles: single, vertical (2 side-by-side, 50/50), bottom (bottom pane 30%, top 70%), and vertical+bottom combined.
- Tabs are color-coded to their panel via **colored title text** (palette accents); panels get matching colored borders.
- Tab close kills the session; split-off tabs park (session survives); empty panels show a placeholder.
- macOS: traffic lights merged into the tab bar (overlay title bar + drag region).
- App launches with one tab, no splits — visually identical to today.

**Non-Goals:**
- Free-form/draggable/resizable splits (fixed ratios only, per requirements).
- Tab drag-and-drop reordering.
- Per-tab titles from shell integration (OSC 7/133) — plain "Terminal N" titles now.
- Grouping/tab-bar rows, pinned tabs, terminal profiles.
- Windows/Linux title bar work (Overlay is macOS-only; other platforms keep the native bar).

## Decisions

### D1: Hosts outlive panels — one mounted TerminalHost per tab, positioned by CSS

```
tabs.map(tab =>
  <div key={tab.id} className={slotClass(tab.id)}>   // host-slot-0|1|2 | host-hidden
    <TerminalHost tabId={tab.id} />                   // spawns session on mount
  </div>)
```

React keeps a keyed element mounted across re-renders — only the CSS class changes. So a tab switching panels, parking, or being shown again **never unmounts its host**, and the PTY session + scrollback survive. Unmounting (and session kill) happens only when the tab is closed. The layout area is `position: relative`; each host div gets absolute slot coordinates or `display: none` when parked.

Alternative considered: panels *containing* hosts (VSCode-like `TerminalView` per panel). Rejected: moving a tab between panels re-parents the host → React unmount/remount → session death.

### D2: Two independent split toggles — four layout states

Vertical and bottom splits are **independent** toggles (`vertical: boolean`, `bottom: boolean`), giving four states:

```
single (v·b)        vertical (v·b)        bottom (v·b)          vertical+bottom (v·b)
┌──────────────┐    ┌─────────┬─────────┐  ┌──────────────┐    ┌─────────┬─────────┐
│ slot0  100%  │    │ slot0   │ slot1   │  │ slot0   70%  │    │ slot0   │ slot1   │
└──────────────┘    │  50%    │  50%    │  │              │    │  50%    │  50%    │
                    └─────────┴─────────┘  ├──────────────┤    ├─────────┴─────────┤
                                          │ slot2   30%  │    │ slot2       30%   │
                                          └──────────────┘    └───────────────────┘
```

- **Vertical toggle** adds/removes the right pane (slot1) — halves the top area 50/50.
- **Bottom toggle** adds/removes the bottom pane (slot2) — splits the height 70/30 (top larger), full width.
- Vertical and bottom compose: with both on, the top row (70%) splits 50/50 and the bottom pane (30%) spans full width.
- **Toggling a split on**: if parked tabs exist, the new panel shows the *first parked tab in tab order* (no new terminal); only if nothing is parked is a new terminal created there. Toggling off parks that panel's tab (session survives). If the focused slot's panel is removed, focus moves to slot0.
- Number of panels = `1 + vertical + bottom`; slots are fixed CSS rectangles — no drag-resize handles.

### D3: Tab/panel state model (TerminalLayoutContext)

```ts
interface TerminalTab { id: string; title: string; }        // "Terminal 1", "Terminal 2"…

interface LayoutState {
  tabs: TerminalTab[];                    // all tabs (parked + shown), ordered
  slots: (string | null)[];               // slot i → tab id (null = placeholder)
  focusedSlot: number;                    // where new/selected tabs land
  vertical: boolean;                      // right pane open (slot1)
  bottom: boolean;                        // bottom pane open (slot2)
  nextTabNumber: number;
}
```

Actions: `newTab()` (spawns in focused slot, parks the slot's previous tab, focuses it), `closeTab(id)` (kills session; if visible, slot → null), `selectTab(id)` (shows in focused slot, parking its current tab), `focusSlot(i)`, `toggleVertical()`, `toggleBottom()`.

Context so the tab bar, panels, and hosts share one model without prop drilling. Rust sessions are keyed by tab id on the frontend (`sessionIdRef` per host).

### D4: AntD Tabs as a control-only strip

AntD Tabs renders the tab strip; our layout area renders content. Key wiring:
- `items`: `{ key: tab.id, label: <span style={{color: accentOf(slot)}>{title}</span>, closable: true }` — colored title (option B), built-in close.
- `activeKey` = the focused slot's tab; `onChange` → `selectTab`.
- `type="card"`-style chrome overridden via ConfigProvider `Tabs` tokens (palette-driven) so AntD's default ink-bar/card chrome doesn't fight the accent titles.
- `hideAdd`; the `+` and split buttons live in a sibling `tabbar-actions` group.

The tab bar container gets `data-tauri-drag-region="deep"`: Tauri's drag.js walks the click path — AntD tab items (`role="tab"`) and close buttons are clickable and block drag; empty bar space walks up to the container and drags the window. (Verified against `tauri/src/window/scripts/drag.js`.)

Fallback if AntD styling proves too fighty: custom ~80-line tab strip with identical behavior. Contained decision, revisit only during implementation.

### D5: Panel colors — `accents` on the palette

`Palette` gains `accents: [string, string, string]` — three hues chosen for cross-theme distinctness (e.g., Nord green/purple/cyan, Dracula green/pink/cyan, Solarized green/magenta/cyan). Slot i uses `accents[i]`:
- Panel border: 1–2px accent border (top edge emphasized).
- Tab title text: accent color (indicator option B — user choice).
- Focused slot's tab additionally gets full-brightness/bold title; parked tabs are neutral muted.

This is an implementation-level palette extension — no existing appearance-settings requirement changes.

### D6: macOS traffic-light merge

- `tauri.conf.json` window: `"titleBarStyle": "Overlay"`, `"hiddenTitle": true` (FoldQuery's exact config).
- Tab bar: `data-tauri-drag-region="deep"` (drag + double-click maximize), left padding `calc(80px …)` when `isMacOS()` so tabs clear the traffic lights.
- Optional polish: `traffic_light_position` from the Rust window builder to vertically center the lights in the tab bar height.

### D7: TerminalHost refactor

`TerminalView` becomes `TerminalHost({ tabId, visible })`:
- Session spawn/teardown unchanged (existing cancelled-guard + channel wiring).
- Resize: only `fit()` when `visible` (hidden hosts are `display:none` → zero-size fit would corrupt cols/rows); refit on transition to visible.
- Theme/font live-apply effect unchanged (all hosts apply their palette settings).

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Many hidden tabs → many mounted xterms (canvas/WebGL per tab) | Sessions are cheap Rust-side; hidden hosts use the DOM renderer fallback if needed. Acceptable; revisit if tab counts grow. |
| AntD Tabs chrome fights the accent scheme | Palette-driven Tabs tokens; contained custom-bar fallback (D4). |
| `display:none` hosts and `fit()` | Guard fit on `visible`; refit on becoming visible (D7). |
| Traffic lights overlap first tab on macOS | `isMacOS()` left padding (~80px) matches FoldQuery's proven value. |
| Double-click on tab bar maximizes window | Desired on empty bar space; tab items block drag (clickable), so tabs never trigger it. |
| Parked-tab session leaks if app crashes | Same exposure as today's single terminal; Drop-kill hardening is a later change. |

## Open Questions

None — model and interactions were settled during exploration (placeholder on empty panel, "Terminal N" titles, colored-title indicator, AntD Tabs, traffic-light merge).
