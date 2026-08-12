import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  BranchesOutlined,
  CopyOutlined,
  DownOutlined,
  EditOutlined,
  PlusOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import {
  Button,
  Dropdown,
  Input,
  MenuProps,
  message,
  Modal,
  Popconfirm,
  Tooltip,
  Tree,
} from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import { open } from "@tauri-apps/plugin-dialog";
import {
  useWorkspace,
  projectLabel,
  truncateName,
  type ProjectInfo,
} from "../workspace/WorkspaceContext";
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
 * branch name; `+` adds a project via the native folder picker. Actions live
 * in a right-click context menu (fork/rename/copy/remove) plus a star button
 * for favorites; fork and rename use modals.
 */
function WorkspaceSidebar({ onReveal }: WorkspaceSidebarProps) {
  const {
    filtered,
    search,
    setSearch,
    addProject,
    removeProject,
    setProjectFavorite,
    renameProject,
    copyPathToClipboard,
    branchExists,
    forkWorktree,
    worktreeIsDirty,
    removeWorktree,
  } = useWorkspace();
  const { activeWorktree, setActiveWorktree } = useTerminalLayout();

  // Fork modal (one at a time, tracked by project path).
  const [forkProject, setForkProject] = useState<string | null>(null);
  const [forkBranch, setForkBranch] = useState("");
  const [forkBranchExists, setForkBranchExists] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);

  // Rename modal (one at a time, tracked by project path).
  const [renameProjectPath, setRenameProjectPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

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

  const openRename = (project: ProjectInfo) => {
    setRenameProjectPath(project.path);
    setRenameValue(project.displayName ?? project.name);
  };

  const handleRenameSubmit = async () => {
    if (renameProjectPath == null) return;
    await renameProject(renameProjectPath, renameValue);
    setRenameProjectPath(null);
    setRenameValue("");
  };

  const projectMenu = (project: ProjectInfo): MenuProps => ({
    items: [
      ...(project.isGit
        ? [
            {
              key: "fork",
              icon: <BranchesOutlined />,
              label: "Fork worktree…",
              onClick: () => openFork(project.path),
            },
          ]
        : []),
      {
        key: "rename",
        icon: <EditOutlined />,
        label: "Rename…",
        onClick: () => openRename(project),
      },
      {
        key: "copy",
        icon: <CopyOutlined />,
        label: "Copy path",
        onClick: () => void copyPathToClipboard(project.path),
      },
      { type: "divider" as const },
      {
        key: "remove",
        icon: <span style={{ color: "#f87171" }}>🗑</span>,
        label: "Remove project",
        danger: true,
        onClick: () => confirmRemoveProject(project),
      },
    ],
  });

  const confirmRemoveProject = (project: ProjectInfo) => {
    Modal.confirm({
      title: "Remove this project?",
      content: "Its worktrees remain on disk.",
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: () => void removeProject(project.path),
    });
  };

  const worktreeMenu = (
    wt: { path: string; isDefault: boolean },
    project: ProjectInfo,
  ): MenuProps => {
    const deleteItems: MenuProps["items"] = wt.isDefault
      ? []
      : [
          { type: "divider" },
          {
            key: "delete",
            icon: <span style={{ color: "#f87171" }}>🗑</span>,
            label: "Delete worktree",
            danger: true,
            onClick: () => void handleDeleteWorktree(project.path, wt.path),
          },
        ];
    return {
      items: [
        {
          key: "copy",
          icon: <CopyOutlined />,
          label: "Copy path",
          onClick: () => void copyPathToClipboard(wt.path),
        },
        ...(deleteItems ?? []),
      ],
    };
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
      <Dropdown trigger={["contextMenu"]} menu={worktreeMenu(wt, project)}>
        <span className="project-title">
          <span className="worktree-label" title={wt.path}>
            {label}
          </span>
        </span>
      </Dropdown>
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
      <Dropdown trigger={["contextMenu"]} menu={projectMenu(project)}>
        <span className="project-title">
          <span className="project-name" title={project.path}>
            {truncateName(projectLabel(project))}
          </span>
          <Button
            type="text"
            size="small"
            className="project-action project-star"
            icon={project.favorite ? <StarFilled /> : <StarOutlined />}
            style={
              project.favorite
                ? { color: "var(--ol-accent-0)" }
                : { color: "var(--ol-text-muted)" }
            }
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              void setProjectFavorite(project.path, !project.favorite);
            }}
            aria-label={
              project.favorite
                ? `Unfavorite ${projectLabel(project)}`
                : `Favorite ${projectLabel(project)}`
            }
          />
        </span>
      </Dropdown>
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

  const forkModal = forkProject != null && (
    <Modal
      title={`Fork worktree in ${projectLabel(
        filtered.find((p) => p.path === forkProject) ?? ({
          path: forkProject,
          name: forkProject,
        } as ProjectInfo),
      )}`}
      open
      onCancel={() => setForkProject(null)}
      footer={
        forkBranchExists ? (
          <div className="workspace-modal-actions">
            <Button onClick={() => setForkProject(null)}>Cancel</Button>
            <Button type="primary" onClick={() => void doFork(forkProject, true)}>
              Continue
            </Button>
          </div>
        ) : (
          <div className="workspace-modal-actions">
            <Button onClick={() => setForkProject(null)}>Cancel</Button>
            <Button
              type="primary"
              disabled={!forkBranch.trim()}
              onClick={() => void handleForkSubmit(forkProject)}
            >
              Fork
            </Button>
          </div>
        )
      }
    >
      {forkBranchExists ? (
        <div className="workspace-popover-text">
          Branch "{forkBranch}" already exists. Attach the new worktree to it?
        </div>
      ) : (
        <Input
          placeholder="branch name"
          value={forkBranch}
          onChange={(e) => {
            setForkBranch(e.target.value);
            setForkBranchExists(false);
          }}
          onPressEnter={() => void handleForkSubmit(forkProject)}
          autoFocus
        />
      )}
      {forkError && <div className="workspace-popover-error">{forkError}</div>}
    </Modal>
  );

  const renameModal = renameProjectPath != null && (
    <Modal
      title="Rename project"
      open
      onCancel={() => setRenameProjectPath(null)}
      onOk={() => void handleRenameSubmit()}
    >
      <Input
        placeholder="Display name (empty resets to the folder name)"
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        onPressEnter={() => void handleRenameSubmit()}
        autoFocus
      />
    </Modal>
  );

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
      {forkModal}
      {renameModal}
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
