import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  BranchesOutlined,
  DeleteOutlined,
  DownOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Button, Input, message, Popconfirm, Popover, Tooltip, Tree } from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import { open } from "@tauri-apps/plugin-dialog";
import { useWorkspace, type ProjectInfo } from "../workspace/WorkspaceContext";
import { useTerminalLayout } from "../layout/TerminalLayoutContext";
import { registerShortcutAction } from "../shortcuts/actionRegistry";
import "./WorkspaceSidebar.css";

interface WorkspaceSidebarProps {
  /** Open the panel when it's collapsed (used by the focus shortcut). */
  onReveal: () => void;
}

/**
 * Project/worktree tree. Projects are the top level; each contains its default
 * worktree (the directory itself) plus managed git worktrees. Selecting any
 * worktree makes it the active one. The search filters by project path or
 * branch name; `+` adds a project via the native folder picker; the fork
 * button creates worktrees.
 */
function WorkspaceSidebar({ onReveal }: WorkspaceSidebarProps) {
  const {
    filtered,
    search,
    setSearch,
    addProject,
    removeProject,
    branchExists,
    forkWorktree,
    worktreeIsDirty,
    removeWorktree,
  } = useWorkspace();
  const { activeWorktree, setActiveWorktree } = useTerminalLayout();

  // Fork popover (one at a time, tracked by project path).
  const [forkProject, setForkProject] = useState<string | null>(null);
  const [forkBranch, setForkBranch] = useState("");
  const [forkBranchExists, setForkBranchExists] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);

  // Dirty-worktree force-removal prompt (project path + worktree path).
  const [forceWorktree, setForceWorktree] = useState<{
    projectPath: string;
    worktreePath: string;
  } | null>(null);

  // The search input, for programmatic focus (Cmd+4 focuses the workspace).
  const searchRef = useRef<HTMLDivElement | null>(null);

  // Flat list of all navigable tree keys (projects + worktrees) for arrow-key
  // navigation from the search input, mirroring the launcher's highlight.
  const navigableKeys = useMemo<string[]>(
    () =>
      filtered.flatMap((p) => [
        `p:${p.path}`,
        ...p.worktrees.map((wt) => `w:${wt.path}`),
      ]),
    [filtered],
  );

  // Index of the highlighted tree node when navigating via arrow keys.
  const [navIndex, setNavIndex] = useState(0);

  // Keep the highlight in range when the tree changes (search/filter).
  useEffect(() => {
    setNavIndex((i) => Math.min(i, Math.max(0, navigableKeys.length - 1)));
  }, [navigableKeys.length]);

  // Follow the active worktree when it changes elsewhere (launch, fork).
  useEffect(() => {
    if (activeWorktree == null) return;
    const idx = navigableKeys.indexOf(`w:${activeWorktree}`);
    if (idx >= 0) setNavIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorktree]);

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (navigableKeys.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setNavIndex((i) => (i + 1) % navigableKeys.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setNavIndex((i) => (i - 1 + navigableKeys.length) % navigableKeys.length);
    } else if (e.key === "Enter") {
      const key = navigableKeys[navIndex];
      if (key.startsWith("w:")) {
        e.preventDefault();
        setActiveWorktree(key.slice(2));
      }
    }
  };

  // The highlighted node, shown as the tree's selected key.
  const selectedKey = navigableKeys[navIndex] ?? null;

  // Cmd+4 focuses the workspace panel: reveal it if collapsed, then focus the
  // search input so the user can immediately type to filter projects.
  useEffect(() => {
    return registerShortcutAction("focusSidebar", () => {
      onReveal();
      requestAnimationFrame(() => {
        searchRef.current
          ?.querySelector<HTMLInputElement>("input")
          ?.focus();
      });
    });
  }, [onReveal]);

  const pickAddProject = async () => {
    const picked = await open({ multiple: false, directory: true });
    if (typeof picked !== "string") return; // canceled
    const err = await addProject(picked);
    if (err) void message.error(err);
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

  const worktreeTitle = (
    wt: { path: string; branch: string | null; isDefault: boolean },
    project: ProjectInfo,
  ) => {
    const label = wt.isDefault
      ? project.isGit
        ? (wt.branch ?? "default")
        : "default"
      : (wt.branch ?? "worktree");
    return (
      <span className="project-title">
        <span className="worktree-label" title={wt.path}>
          {label}
        </span>
        {!wt.isDefault && (
          <Popconfirm
            title="Delete this worktree?"
            description="Its branch stays in the repository."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleDeleteWorktree(project.path, wt.path)}
            onPopupClick={(e) => e.stopPropagation()}
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              className="project-action"
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={`Delete worktree ${label}`}
            />
          </Popconfirm>
        )}
      </span>
    );
  };

  const handleDeleteWorktree = async (projectPath: string, worktreePath: string) => {
    // Dirty worktrees (uncommitted changes) need an explicit force-confirm;
    // clean ones delete immediately.
    const dirty = await worktreeIsDirty(projectPath, worktreePath);
    if (!dirty) {
      await removeWorktree(projectPath, worktreePath, false);
      return;
    }
    // Dirty: show the force/cancel prompt.
    setForceWorktree({ projectPath, worktreePath });
  };

  const forceDelete = async () => {
    if (!forceWorktree) return;
    const { projectPath, worktreePath } = forceWorktree;
    setForceWorktree(null);
    await removeWorktree(projectPath, worktreePath, true);
  };

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
    // Sync the keyboard highlight with the clicked node.
    if (typeof key === "string") {
      const idx = navigableKeys.indexOf(key);
      if (idx >= 0) setNavIndex(idx);
    }
    // Only worktree nodes activate; project nodes just expand/collapse.
    if (typeof key === "string" && key.startsWith("w:")) {
      setActiveWorktree(key.slice(2));
    }
  };

  return (
    <>
      <div className="app-sider-header" ref={searchRef}>
        <Input
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search projects & branches"
          className="workspace-search"
          allowClear
        />
        <Tooltip title="Add project">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => void pickAddProject()}
            aria-label="Add project"
          />
        </Tooltip>
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
          selectedKeys={selectedKey != null ? [selectedKey] : activeWorktree != null ? [`w:${activeWorktree}`] : []}
          onSelect={onSelect}
          blockNode
        />
      <Popconfirm
        title="Force remove this worktree?"
        description="It has uncommitted changes that will be discarded."
        okText="Force remove"
        okButtonProps={{ danger: true }}
        open={forceWorktree != null}
        onConfirm={() => void forceDelete()}
        onCancel={() => setForceWorktree(null)}
        onPopupClick={(e) => e.stopPropagation()}
      />
    </>
  );
}

export default WorkspaceSidebar;
