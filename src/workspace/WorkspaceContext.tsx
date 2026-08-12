import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

export interface WorktreeInfo {
  path: string;
  branch: string | null;
  isDefault: boolean;
}

export interface ProjectInfo {
  path: string;
  name: string;
  displayName: string | null;
  favorite: boolean;
  isGit: boolean;
  branch: string | null;
  worktrees: WorktreeInfo[];
}

/** The name shown in the tree: the display name when set, else the basename. */
export function projectLabel(project: ProjectInfo): string {
  return project.displayName ?? project.name;
}

/** Truncate a display name to 20 chars total (17 + trailing ellipsis). */
export function truncateName(name: string, max = 20): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 3) + "…";
}

interface WorkspaceContextValue {
  projects: ProjectInfo[];
  /** Live search query over project paths and worktree branch names. */
  search: string;
  setSearch: (q: string) => void;
  /** Filtered view: favorites first, then alphabetical by display name. */
  filtered: ProjectInfo[];
  refresh: () => Promise<void>;
  addProject: (path: string) => Promise<string | null>;
  removeProject: (path: string) => Promise<void>;
  setProjectFavorite: (path: string, favorite: boolean) => Promise<void>;
  renameProject: (path: string, displayName: string) => Promise<void>;
  copyPathToClipboard: (path: string) => Promise<void>;
  branchExists: (project: string, branch: string) => Promise<boolean>;
  forkWorktree: (
    project: string,
    branch: string,
    allowExisting: boolean,
  ) => Promise<WorktreeInfo | null>;
  worktreeIsDirty: (project: string, worktreePath: string) => Promise<boolean>;
  removeWorktree: (project: string, worktreePath: string, force: boolean) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function matches(query: string, value: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    try {
      setProjects(await invoke<ProjectInfo[]>("workspace_list"));
    } catch {
      /* keep the last known list */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addProject = useCallback(
    async (path: string): Promise<string | null> => {
      try {
        const project = await invoke<ProjectInfo>("workspace_add_project", { path });
        setProjects((prev) => {
          const rest = prev.filter((p) => p.path !== project.path);
          return [...rest, project];
        });
        return null;
      } catch (err) {
        return String(err);
      }
    },
    [],
  );

  const removeProject = useCallback(
    async (path: string) => {
      try {
        await invoke("workspace_remove_project", { path });
        setProjects((prev) => prev.filter((p) => p.path !== path));
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const setProjectFavorite = useCallback(
    async (path: string, favorite: boolean) => {
      try {
        await invoke("workspace_set_project_favorite", { path, favorite });
        setProjects((prev) =>
          prev.map((p) => (p.path === path ? { ...p, favorite } : p)),
        );
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const renameProject = useCallback(
    async (path: string, displayName: string) => {
      try {
        await invoke("workspace_rename_project", { path, displayName });
        setProjects((prev) =>
          prev.map((p) =>
            p.path === path
              ? { ...p, displayName: displayName.trim() || null }
              : p,
          ),
        );
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const copyPathToClipboard = useCallback(async (path: string) => {
    try {
      await writeText(path);
    } catch {
      /* ignore */
    }
  }, []);

  const branchExists = useCallback(
    async (project: string, branch: string): Promise<boolean> => {
      try {
        return await invoke<boolean>("workspace_branch_exists", { project, branch });
      } catch {
        return false;
      }
    },
    [],
  );

  const forkWorktree = useCallback(
    async (
      project: string,
      branch: string,
      allowExisting: boolean,
    ): Promise<WorktreeInfo | null> => {
      try {
        const worktree = await invoke<WorktreeInfo>("workspace_fork", {
          project,
          branch,
          allowExisting,
        });
        await refresh();
        return worktree;
      } catch {
        return null;
      }
    },
    [refresh],
  );

  const worktreeIsDirty = useCallback(
    async (project: string, worktreePath: string): Promise<boolean> => {
      try {
        return await invoke<boolean>("workspace_worktree_is_dirty", {
          project,
          worktreePath,
        });
      } catch {
        return true; // unknown state — prompt the user rather than deleting blind
      }
    },
    [],
  );

  const removeWorktree = useCallback(
    async (project: string, worktreePath: string, force: boolean) => {
      try {
        await invoke("workspace_remove_worktree", { project, worktreePath, force });
        await refresh();
      } catch {
        /* ignore */
      }
    },
    [refresh],
  );

  const filtered = useMemo<ProjectInfo[]>(() => {
    const q = search.trim();
    const base = q
      ? projects.flatMap((project) => {
          // Project path matches → show with all worktrees.
          if (matches(q, project.path)) {
            return [project];
          }
          // Branch name matches → show only the matching worktrees.
          const matching = project.worktrees.filter(
            (w) => w.branch != null && matches(q, w.branch),
          );
          return matching.length > 0 ? [{ ...project, worktrees: matching }] : [];
        })
      : projects;
    // Favorites first, then alphabetical by display name (per requirement).
    return [...base]
      .sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return projectLabel(a).localeCompare(projectLabel(b));
      })
      .map((p) => ({ ...p, worktrees: [...p.worktrees] }));
  }, [projects, search]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      projects,
      search,
      setSearch,
      filtered,
      refresh,
      addProject,
      removeProject,
      setProjectFavorite,
      renameProject,
      copyPathToClipboard,
      branchExists,
      forkWorktree,
      worktreeIsDirty,
      removeWorktree,
    }),
    [projects, search, filtered, refresh, addProject, removeProject, setProjectFavorite, renameProject, copyPathToClipboard, branchExists, forkWorktree, worktreeIsDirty, removeWorktree],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
