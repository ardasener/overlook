import { useState } from "react";
import { Layout } from "antd";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import SettingsModal from "./components/settings/SettingsModal";
import TerminalTabBar from "./components/TerminalTabBar";
import SplitLayout from "./components/SplitLayout";
import { TerminalLayoutProvider } from "./layout/TerminalLayoutContext";
import "./App.css";

const { Sider, Content } = Layout;

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Layout className="app-layout">
      {/* Full-width tab bar on top so the macOS traffic lights sit over it;
          the workspace sidebar lives below it, beside the terminal area. */}
      <TerminalLayoutProvider>
        <TerminalTabBar />
        <Layout className="app-body">
          <Sider width={240} className="app-sider" theme="dark">
            <WorkspaceSidebar onOpenSettings={() => setSettingsOpen(true)} />
          </Sider>
          <Content className="app-content">
            <SplitLayout />
          </Content>
        </Layout>
      </TerminalLayoutProvider>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Layout>
  );
}

export default App;
