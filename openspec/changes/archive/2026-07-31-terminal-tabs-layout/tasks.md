## 1. Palette accents

- [x] 1.1 Add `accents: [string, string, string]` to the `Palette` interface and every palette (three distinct hues per theme, chosen for cross-theme distinctness)
- [x] 1.2 Verify `pnpm check-types` passes

## 2. Layout state model

- [x] 2.1 Create `src/layout/TerminalLayoutContext.tsx`: `TerminalTab`/`LayoutState` types, provider with `tabs`, `slots` (slot → tab id or null), `focusedSlot`, `vertical`/`bottom` booleans, `nextTabNumber`, and actions `newTab`, `closeTab`, `selectTab`, `focusSlot`, `toggleVertical`, `toggleBottom` (independent toggles — no auto-enable/removal coupling); enabling a split fills the new panel with the first parked tab in order, else creates a new terminal; if the focused slot's panel is removed, focus falls back to slot0
- [x] 2.2 Wire the provider into `App.tsx` (wrap the content area; sidebar stays outside)

## 3. Terminal host refactor

- [x] 3.1 Rename/refactor `TerminalView` → `TerminalHost` in `src/modules/terminal/`: accepts `tabId` and `visible` props; session spawn/teardown per tab (existing channel + cancelled-guard wiring preserved); only `fit()` when `visible`, refit on transition to visible
- [x] 3.2 Update `App.tsx` to stop rendering `TerminalView` directly (hosts now render via the layout area)

## 4. Tab bar

- [x] 4.1 Create `src/components/TerminalTabBar.tsx`: AntD `Tabs` as a control-only strip (`items` with colored title labels + `closable`, `activeKey` = focused slot's tab, `onChange` → selectTab, `hideAdd`), plus a sibling actions group: `+` (new tab), vertical-split toggle, bottom-split toggle (toggle buttons show active state)
- [x] 4.2 Add palette-driven `Tabs` component tokens to `src/themes/antd.ts` (item colors, card bg, borders) so AntD chrome stays lean and doesn't fight accent titles
- [x] 4.3 Tab bar CSS: horizontal scroll, tab layout, actions group, `data-tauri-drag-region="deep"` on the container
- [x] 4.4 Verify `pnpm check-types` and `pnpm lint` pass

## 5. Split layout + panels

- [x] 5.1 Create `src/components/SplitPane.tsx` (or layout-area styles): four state layouts derived from the two booleans via CSS — single (slot0 full), vertical (0/1 at 50/50), bottom (slot0 top 70%, slot2 bottom 30% full-width), vertical+bottom (top row 0/1 at 50/50 over slot2 at 30%); placeholder element for empty slots ("+ create a terminal")
- [x] 5.2 Render all tab hosts in the layout area keyed by tab id with slot/hidden classes (D1: hosts never unmount until tab close); panel borders use `accents[i]`; focused slot emphasized
- [x] 5.3 Tab title color = `accents[slotOf(tab)]`; parked tabs muted; focused tab bold
- [x] 5.4 Verify `pnpm check-types` and `pnpm lint` pass

## 6. macOS window buttons

- [x] 6.1 Update `src-tauri/tauri.conf.json` window: `"titleBarStyle": "Overlay"`, `"hiddenTitle": true`
- [x] 6.2 Add `isMacOS()` helper (`src/lib/platform.ts`) and macOS left padding (~80px) on the tab bar so tabs clear the traffic lights
- [x] 6.3 Optional polish: set `traffic_light_position` on the window builder in `lib.rs` to vertically center the lights in the tab bar

## 7. Verification

- [x] 7.0 **Fixed during user testing**: closing a visible tab crashed to a blank screen. Root cause: `@xterm/addon-webgl` 0.19.0's dispose guard dereferences `_core._store._isDisposed`, but `CoreTerminal` in `@xterm/xterm` 5.5.0 has no `_store` → TypeError on every terminal dispose with WebGL loaded. Fix: pnpm patch (`patches/@xterm__addon-webgl.patch`) adds optional chaining to the guard. Verified: close → recreate → close sequence runs with zero errors.
- [x] 7.1 `pnpm tauri dev`: app opens with one tab, no splits (looks like today)
- [x] 7.2 Create several tabs; verify each is a live terminal; close one and confirm its shell dies (check with `ps`)
- [x] 7.3 Exercise all four states via the two toggles (single → vertical → vertical+bottom → bottom → back); verify 50/50 and 70/30 ratios; verify sessions survive split toggles (park → re-show keeps scrollback)
- [x] 7.4 Verify split-on behavior: with parked tabs, the first parked tab (in order) fills the new panel with no new terminal; with nothing parked, a new terminal spawns
- [x] 7.5 Verify tab titles and panel borders use the active palette's accent colors; switch theme and confirm colors update
- [x] 7.6 On macOS: verify traffic lights overlay the tab bar, empty bar space drags the window, tabs/buttons stay clickable
- [x] 7.7 Open many tabs; verify the bar scrolls horizontally
