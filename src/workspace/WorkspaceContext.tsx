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

export interface WorktreeInfo {
  path: string;
  branch: string | null;
  isDefault: boolean;
}

export interface ProjectInfo {
  path: string;
  name: string;
  isGit: boolean;
  branch: string | null;
  worktrees: WorktreeInfo[];
}

interface WorkspaceContextValue {
  projects: ProjectInfo[];
  /** Live search query over project paths and worktree branch names. */
  search: string;
  setSearch: (q: string) => void;
  /** Filtered view per D8: path match → all worktrees; branch match → only matches. */
  filtered: ProjectInfo[];
  refresh: () => Promise<void>;
  addProject: (path: string) => Promise<string | null>;
  removeProject: (path: string) => Promise<void>;
  branchExists: (project: string, branch: string) => Promise<boolean>;
  forkWorktree: (
    project: string,
    branch: string,
    allowExisting: boolean,
  ) => Promise<WorktreeInfo | null>;
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

  const filtered = useMemo<ProjectInfo[]>(() => {
    const q = search.trim();
    if (!q) return projects;
    return projects.flatMap((project) => {
      // Project path matches → show with all worktrees.
      if (matches(q, project.path)) {
        return [project];
      }
      // Branch name matches → show only the matching worktrees.
      const matching = project.worktrees.filter(
        (w) => w.branch != null && matches(q, w.branch),
      );
      return matching.length > 0 ? [{ ...project, worktrees: matching }] : [];
    });
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
      branchExists,
      forkWorktree,
    }),
    [projects, search, filtered, refresh, addProject, removeProject, branchExists, forkWorktree],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
