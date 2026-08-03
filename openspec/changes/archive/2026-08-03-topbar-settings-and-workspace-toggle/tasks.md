## 1. App shell state

- [x] 1.1 Add `const [workspacesOpen, setWorkspacesOpen] = useState(true)` to `AppShell` in `src/App.tsx`
- [x] 1.2 Render the `Sider` with `width={240} collapsible collapsed={!workspacesOpen} collapsedWidth={0} trigger={null}` and pass `onOpenSettings`/`workspacesOpen`/`onToggleWorkspaces` to `TerminalTabBar`

## 2. Top bar actions

- [x] 2.1 Add `onOpenSettings`, `workspacesOpen`, `onToggleWorkspaces` props to `TerminalTabBar`
- [x] 2.2 Add the workspace-toggle button (`MenuFoldOutlined` when open, `MenuUnfoldOutlined` when closed) with tooltip "Toggle workspaces" to `.tabbar-actions`
- [x] 2.3 Add the settings button (`SettingOutlined`, tooltip "Settings") to `.tabbar-actions`

## 3. Sidebar cleanup

- [x] 3.1 Remove the `SettingOutlined` button and the `onOpenSettings` prop from `WorkspaceSidebar`
- [x] 3.2 Remove the now-dead `SettingOutlined` import and the `app-sider-settings` CSS rules in `App.css`

## 4. Verification

- [x] 4.1 `bun check-types` and `bun lint` pass
- [ ] 4.2 Manual check in `bun tauri dev`: settings opens from the top bar, workspace toggle collapses/expands the panel with the terminal filling freed space, panel starts open on launch, and macOS traffic-light dragging still works
