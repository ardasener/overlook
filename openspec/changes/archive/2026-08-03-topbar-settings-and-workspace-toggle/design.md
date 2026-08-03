## Context

The top bar (`TerminalTabBar`) already carries the new-terminal and split-toggle action buttons in a `.tabbar-actions` group at the right of the tab strip. The settings icon is currently buried in the workspace sidebar header, next to search and add-project. The workspace sidebar is an always-visible AntD `Sider width={240}` with no collapse mechanism. Frontend-only change: no Rust/IPC involvement.

## Goals / Non-Goals

**Goals:**
- Move the settings action into the top bar action group.
- Add a workspace-panel toggle to the top bar that dock-collapses the sidebar, letting the terminal expand.
- Keep the toggle state in React state only (no persistence).

**Non-Goals:**
- Persisting panel open state across restarts (YAGNI).
- Overlay/drawer behavior — docked collapse only.
- Keyboard shortcuts for the toggle.
- Any change to the sidebar tree, search, or project actions.

## Decisions

### Docked collapse via AntD `Sider` props, not conditional render
Use `Sider width={240} collapsible collapsed={!workspacesOpen} collapsedWidth={0} trigger={null}`.
- **Why**: the component stays mounted, so tree expansion state and scroll position survive toggles, and the slide transition comes free from AntD.
- **Alternative considered**: conditional render (`{workspacesOpen && <Sider>…}`) — simpler but unmounts the tree (loses expansion/scroll) and needs hand-rolled animation. Rejected.

### State lives in `AppShell`
`const [workspacesOpen, setWorkspacesOpen] = useState(true)` in `AppShell`; the Sider and the toggle button both read/write it. The layout context and workspace context are untouched — the toggle is chrome state, not workspace state.
- **Why**: minimal plumbing; no other component needs the value.

### Props flow into `TerminalTabBar`
`TerminalTabBar` receives two optional props: `onOpenSettings` and `workspacesOpen`/`onToggleWorkspaces`.
- **Why**: keeps `TerminalTabBar` a controlled component; `AppShell` owns the state, consistent with how `settingsOpen` already works.

### Icon set
- Workspace toggle: `MenuFoldOutlined` when open (click = close), `MenuUnfoldOutlined` when closed (click = open).
- Settings: `SettingOutlined`, matching the icon moved from the sidebar.
- **Why**: AntD's conventional sidebar toggle icons; `SettingOutlined` preserves visual continuity.

### Sidebar header loses settings, keeps actions
Remove the `SettingOutlined` button (WorkspaceSidebar.tsx lines 241–249) and the `onOpenSettings` prop from `WorkspaceSidebarProps`. The `app-sider-settings` CSS rules in `App.css` become dead and are removed.

## Risks / Trade-offs

- [Sider `collapsedWidth={0}` can leave a 1px scrollbar artifact on some browsers] → AntD handles zero-width collapse cleanly; verify visually in dev and, if a strip appears, add `overflow: hidden` to the sider class.
- [Traffic-light drag region on macOS: new buttons must remain clickable] → buttons live in `.tabbar-actions` which already blocks drag like the existing three buttons; no change to drag handling needed.
- [Tree remount on `key` change already resets expansion] → unrelated existing behavior; the toggle does not change the tree's `key`, so expansion is preserved across collapse/expand.

## Migration Plan

No migration — frontend-only, ships in the same dev cycle. Rollback: revert the two component files and `App.tsx`.
