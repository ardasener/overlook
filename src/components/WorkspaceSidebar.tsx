import { Button, Tooltip } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import { Tree } from "antd";
import type { TreeDataNode } from "antd";
import "./WorkspaceSidebar.css";

/**
 * Placeholder workspace tree. Workspace/worktree management is a later change;
 * this only demonstrates the chrome layout.
 */
const workspaceTree: TreeDataNode[] = [
  {
    title: "project-overlook-tauri",
    key: "overlook",
    children: [
      { title: "main", key: "overlook/main" },
      { title: "feat/terminal-poc", key: "overlook/feat-terminal-poc" },
    ],
  },
  {
    title: "terax-ai",
    key: "terax",
    children: [{ title: "main", key: "terax/main" }],
  },
];

interface WorkspaceSidebarProps {
  onOpenSettings: () => void;
}

function WorkspaceSidebar({ onOpenSettings }: WorkspaceSidebarProps) {
  return (
    <>
      <div className="app-sider-header">
        <span>Workspaces</span>
        <Tooltip title="Settings">
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            className="app-sider-settings"
            onClick={onOpenSettings}
            aria-label="Settings"
          />
        </Tooltip>
      </div>
      <Tree
        className="workspace-tree"
        treeData={workspaceTree}
        defaultExpandAll
        selectable
        showIcon
        blockNode
      />
    </>
  );
}

export default WorkspaceSidebar;
