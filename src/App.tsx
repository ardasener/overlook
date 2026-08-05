import { useCallback, useEffect, useState } from "react";
import { Layout } from "antd";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import SettingsModal from "./components/settings/SettingsModal";
import TerminalTabBar from "./components/TerminalTabBar";
import SplitLayout from "./components/SplitLayout";
import { TerminalLayoutProvider, useTerminalLayout } from "./layout/TerminalLayoutContext";
import { WorkspaceProvider, useWorkspace } from "./workspace/WorkspaceContext";
import { useKeyboardShortcuts } from "./shortcuts/useKeyboardShortcuts";
import { registerShortcutAction } from "./shortcuts/actionRegistry";
import "./App.css";

const { Sider, Content } = Layout;

function App() {
  return (
    <TerminalLayoutProvider>
      <WorkspaceProvider>
        <AppShell />
      </WorkspaceProvider>
    </TerminalLayoutProvider>
  );
}

function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspacesOpen, setWorkspacesOpen] = useState(true);
  const { projects } = useWorkspace();
  const { activeWorktree, setActiveWorktree } = useTerminalLayout();
  useKeyboardShortcuts();

  // Stable identity for the sidebar's onReveal (avoids re-registering its
  // focus shortcut on every render).
  const revealWorkspaces = useCallback(() => setWorkspacesOpen(true), []);

  // App-level shortcut actions that live here (panel visibility).
  useEffect(() => {
    const toggle = () => setWorkspacesOpen((open) => !open);
    const unregToggle = registerShortcutAction("toggleSidebar", toggle);
    return () => {
      unregToggle();
    };
  }, []);

  // Activate the first project's default worktree once projects load.
  useEffect(() => {
    if (activeWorktree !== null) return;
    const first = projects[0]?.worktrees[0]?.path;
    if (first) setActiveWorktree(first);
  }, [projects, activeWorktree, setActiveWorktree]);

  return (
    <Layout className="app-layout">
      {/* Full-width tab bar on top so the macOS traffic lights sit over it;
          the workspace sidebar lives below it, beside the terminal area. */}
      <TerminalTabBar
        onOpenSettings={() => setSettingsOpen(true)}
        workspacesOpen={workspacesOpen}
        onToggleWorkspaces={() => setWorkspacesOpen((open) => !open)}
      />
      <Layout className="app-body">
        <Sider
          width={240}
          className="app-sider"
          theme="dark"
          collapsible
          collapsed={!workspacesOpen}
          collapsedWidth={0}
          trigger={null}
        >
          <WorkspaceSidebar onReveal={revealWorkspaces} />
        </Sider>
        <Content className="app-content">
          <SplitLayout />
        </Content>
      </Layout>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Layout>
  );
}

export default App;
