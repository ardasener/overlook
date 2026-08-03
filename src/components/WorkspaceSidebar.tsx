import { useState } from "react";
import {
  BranchesOutlined,
  DeleteOutlined,
  DownOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Input, Popconfirm, Popover, Tooltip, Tree } from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import { useWorkspace, type ProjectInfo } from "../workspace/WorkspaceContext";
import { useTerminalLayout } from "../layout/TerminalLayoutContext";
import "./WorkspaceSidebar.css";

/**
 * Project/worktree tree. Projects are the top level; each contains its default
 * worktree (the directory itself) plus managed git worktrees. Selecting any
 * worktree makes it the active one. The search filters by project path or
 * branch name; `+`/`−` manage projects; the fork button creates worktrees.
 */
function WorkspaceSidebar() {
  const {
    filtered,
    search,
    setSearch,
    addProject,
    removeProject,
    branchExists,
    forkWorktree,
  } = useWorkspace();
  const { activeWorktree, setActiveWorktree } = useTerminalLayout();

  // Add-project popover.
  const [addOpen, setAddOpen] = useState(false);
  const [addPath, setAddPath] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  // Fork popover (one at a time, tracked by project path).
  const [forkProject, setForkProject] = useState<string | null>(null);
  const [forkBranch, setForkBranch] = useState("");
  const [forkBranchExists, setForkBranchExists] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);

  const submitAdd = async () => {
    const err = await addProject(addPath.trim());
    if (err) {
      setAddError(err);
      return;
    }
    setAddOpen(false);
    setAddPath("");
    setAddError(null);
  };

  const doFork = async (project: string, allowExisting: boolean) => {
    const worktree = await forkWorktree(project, forkBranch.trim(), allowExisting);
    if (worktree) {
      setForkProject(null);
      setForkBranch("");
      setForkBranchExists(false);
      setForkError(null);
      setActiveWorktree(worktree.path);
    } else {
      setForkError("Failed to create the worktree.");
    }
  };

  const handleForkSubmit = async (project: string) => {
    if (!forkBranch.trim()) return;
    if (await branchExists(project, forkBranch.trim())) {
      setForkBranchExists(true);
    } else {
      await doFork(project, false);
    }
  };

  const openFork = (project: string) => {
    setForkProject(project);
    setForkBranch("");
    setForkBranchExists(false);
    setForkError(null);
  };

  const worktreeTitle = (wt: { branch: string | null; isDefault: boolean }, project: ProjectInfo) =>
    wt.isDefault
      ? project.isGit
        ? (wt.branch ?? "default")
        : "default"
      : (wt.branch ?? "worktree");

  const treeData: TreeDataNode[] = filtered.map((project) => ({
    // Keys are prefixed: the default worktree's path equals the project path,
    // so raw paths would collide (the project node would swallow its children).
    key: `p:${project.path}`,
    title: (
      <span className="project-title">
        <span className="project-name" title={project.path}>
          {project.name}
        </span>
        {project.isGit && (
          <Popover
            trigger="click"
            placement="rightTop"
            open={forkProject === project.path}
            onOpenChange={(open) => (open ? openFork(project.path) : setForkProject(null))}
            content={
              forkBranchExists ? (
                <div className="workspace-popover">
                  <div className="workspace-popover-text">
                    Branch "{forkBranch}" already exists. Attach the new worktree to it?
                  </div>
                  <div className="workspace-popover-actions">
                    <Button size="small" onClick={() => setForkProject(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => void doFork(project.path, true)}
                    >
                      Continue
                    </Button>
                  </div>
                  {forkError && <div className="workspace-popover-error">{forkError}</div>}
                </div>
              ) : (
                <div className="workspace-popover">
                  <Input
                    size="small"
                    placeholder="branch name"
                    value={forkBranch}
                    onChange={(e) => {
                      setForkBranch(e.target.value);
                      setForkBranchExists(false);
                    }}
                    onPressEnter={() => void handleForkSubmit(project.path)}
                    autoFocus
                  />
                  {forkError && <div className="workspace-popover-error">{forkError}</div>}
                  <Button
                    size="small"
                    type="primary"
                    block
                    onClick={() => void handleForkSubmit(project.path)}
                  >
                    Fork
                  </Button>
                </div>
              )
            }
          >
            <Button
              type="text"
              size="small"
              icon={<BranchesOutlined />}
              className="project-action"
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={`Fork worktree in ${project.name}`}
            />
          </Popover>
        )}
        <Popconfirm
          title="Remove this project?"
          description="Its worktrees remain on disk."
          okText="Remove"
          okButtonProps={{ danger: true }}
          onConfirm={() => void removeProject(project.path)}
        >
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            className="project-action"
            onMouseDown={(e) => e.stopPropagation()}
            aria-label={`Remove ${project.name}`}
          />
        </Popconfirm>
      </span>
    ),
    children: project.worktrees.map((wt) => ({
      key: `w:${wt.path}`,
      title: worktreeTitle(wt, project),
    })),
  }));

  const onSelect: TreeProps["onSelect"] = (keys) => {
    const key = keys[0];
    // Only worktree nodes activate; project nodes just expand/collapse.
    if (typeof key === "string" && key.startsWith("w:")) {
      setActiveWorktree(key.slice(2));
    }
  };

  return (
    <>
      <div className="app-sider-header">
        <Input
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects & branches"
          className="workspace-search"
          allowClear
        />
        <Popover
          trigger="click"
          placement="bottomLeft"
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (open) {
              setAddPath("");
              setAddError(null);
            }
          }}
          content={
            <div className="workspace-popover">
              <Input
                size="small"
                placeholder="/path/to/project"
                value={addPath}
                onChange={(e) => setAddPath(e.target.value)}
                onPressEnter={() => void submitAdd()}
                autoFocus
              />
              {addError && <div className="workspace-popover-error">{addError}</div>}
              <Button size="small" type="primary" block onClick={() => void submitAdd()}>
                Add
              </Button>
            </div>
          }
        >
          <Tooltip title="Add project">
            <Button type="text" size="small" icon={<PlusOutlined />} aria-label="Add project" />
          </Tooltip>
        </Popover>
      </div>
      <Tree
        className="workspace-tree"
        treeData={treeData}
        key={filtered.map((p) => p.path).join("|")}
        defaultExpandAll
        showLine
        switcherIcon={({ expanded }) => (
          <DownOutlined
            style={{
              transform: `rotate(${expanded ? 0 : -90}deg)`,
              transition: "transform 0.3s",
            }}
          />
        )}
        selectedKeys={activeWorktree != null ? [`w:${activeWorktree}`] : []}
        onSelect={onSelect}
        blockNode
      />
    </>
  );
}

export default WorkspaceSidebar;
