import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Modal, Tree } from "antd";
import type { TreeDataNode } from "antd";
import { useWorkspace } from "../workspace/WorkspaceContext";
import { useTerminalLayout } from "../layout/TerminalLayoutContext";
import "./CleanupModal.css";

interface CleanupModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Bulk cleanup: close terminals (and optionally delete cache worktrees) in
 * selected worktrees. Default worktrees (project roots) are never removed by
 * this feature — project removal stays in the sidebar.
 */
function CleanupModal({ open, onClose }: CleanupModalProps) {
  const { projects, removeWorktree } = useWorkspace();
  const { activeWorktree, worktreeTabCounts, closeWorktreeTabs } = useTerminalLayout();

  // Checked worktree paths (keyed by path — the tree keys are w:<path>).
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);

  // Default selection: everything except the active worktree. Recompute when
  // the modal opens so it reflects the current set of worktrees.
  useEffect(() => {
    if (!open) return;
    const all = projects.flatMap((p) =>
      p.worktrees.map((w) => `w:${w.path}`),
    );
    setCheckedKeys(all.filter((k) => k !== `w:${activeWorktree}`));
  }, [open, projects, activeWorktree]);

  // Only worktrees with open terminals are actionable.
  const selectablePaths = useMemo(() => {
    const s = new Set<string>();
    for (const [path, count] of Object.entries(worktreeTabCounts)) {
      if (count > 0) s.add(`w:${path}`);
    }
    return s;
  }, [worktreeTabCounts]);

  const treeData: TreeDataNode[] = useMemo(
    () =>
      projects.map((project) => ({
        key: `p:${project.path}`,
        selectable: false,
        title: <span className="cleanup-project">{project.name}</span>,
        children: project.worktrees
          .filter((w) => selectablePaths.has(`w:${w.path}`))
          .map((w) => {
            const key = `w:${w.path}`;
            const isActive = w.path === activeWorktree;
            const isDefault = w.isDefault;
            return {
              key,
              disableCheckbox: isActive,
              title: (
                <span className="cleanup-worktree">
                  <span className="cleanup-worktree-name">
                    {isDefault ? "default" : (w.branch ?? "worktree")}
                  </span>
                  <span className="cleanup-worktree-meta">
                    {worktreeTabCounts[w.path] ?? 0} terminals
                    {isDefault ? " · project root" : ""}
                  </span>
                </span>
              ),
            };
          }),
      })),
    [projects, selectablePaths, activeWorktree, worktreeTabCounts],
  );

  const selectAll = () => {
    const all = projects.flatMap((p) =>
      p.worktrees
        .filter((w) => w.path !== activeWorktree && selectablePaths.has(`w:${w.path}`))
        .map((w) => `w:${w.path}`),
    );
    setCheckedKeys(all);
  };

  const selectNone = () => setCheckedKeys([]);

  const closeTerminals = () => {
    for (const key of checkedKeys) {
      if (typeof key === "string" && key.startsWith("w:")) {
        closeWorktreeTabs(key.slice(2));
      }
    }
    onClose();
  };

  const deleteWorktrees = async () => {
    const tasks: Promise<void>[] = [];
    for (const key of checkedKeys) {
      if (typeof key !== "string" || !key.startsWith("w:")) continue;
      const path = key.slice(2);
      const project = projects.find((p) => p.worktrees.some((w) => w.path === path));
      const worktree = project?.worktrees.find((w) => w.path === path);
      if (!project || !worktree) continue;
      closeWorktreeTabs(path); // kill its terminals first
      if (!worktree.isDefault) {
        // Only cache worktrees are deleted; default worktrees (project roots)
        // are never removed here.
        tasks.push(removeWorktree(project.path, path, false).catch(() => undefined));
      }
    }
    await Promise.all(tasks);
    onClose();
  };

  const onConfirmDelete = () => {
    Modal.confirm({
      title: "Delete selected worktrees?",
      content:
        "This closes their terminals and removes the worktrees from disk. This cannot be undone. Project directories are never deleted.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => void deleteWorktrees(),
    });
  };

  return (
    <Modal
      title="Clean up workspaces"
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      centered
    >
      <Alert
        type="warning"
        showIcon
        message="Deleting worktrees is not recoverable. Project directories are never removed — to remove a project, use the trash icon in the sidebar."
        className="cleanup-alert"
      />

      <div className="cleanup-toolbar">
        <Button size="small" onClick={selectAll}>
          Select all
        </Button>
        <Button size="small" onClick={selectNone}>
          Select none
        </Button>
      </div>

      <Tree
        className="cleanup-tree"
        checkable
        selectable={false}
        defaultExpandAll
        checkedKeys={checkedKeys}
        onCheck={(keys) => setCheckedKeys(keys as React.Key[])}
        treeData={treeData}
      />

      <div className="cleanup-actions">
        <Button onClick={closeTerminals} disabled={checkedKeys.length === 0}>
          Close terminals
        </Button>
        <Button danger onClick={onConfirmDelete} disabled={checkedKeys.length === 0}>
          Delete
        </Button>
      </div>
    </Modal>
  );
}
export default CleanupModal;
