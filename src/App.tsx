import { useEffect, useState } from "react";
import { Layout } from "antd";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import SettingsModal from "./components/settings/SettingsModal";
import TerminalTabBar from "./components/TerminalTabBar";
import SplitLayout from "./components/SplitLayout";
import { TerminalLayoutProvider, useTerminalLayout } from "./layout/TerminalLayoutContext";
import { WorkspaceProvider, useWorkspace } from "./workspace/WorkspaceContext";
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
  const { projects } = useWorkspace();
  const { activeWorktree, setActiveWorktree } = useTerminalLayout();

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
      <TerminalTabBar />
      <Layout className="app-body">
        <Sider width={240} className="app-sider" theme="dark">
          <WorkspaceSidebar onOpenSettings={() => setSettingsOpen(true)} />
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
