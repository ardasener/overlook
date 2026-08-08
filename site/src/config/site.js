const SITE_URL = import.meta.env.PUBLIC_SITE_URL || "https://ardasener.github.io";

export const siteConfig = {
	title: "Overlook",
	author: "Arda Sener",
	url: SITE_URL,
	utm: {
		source: SITE_URL,
		medium: "referral",
		campaign: "navigation",
	},
	meta: {
		title: "Overlook - Terminal-first workspace for projects and git worktrees",
		description:
			"A lightweight, terminal-first desktop workspace for project management — workspaces, git worktrees, and runnable apps.",
		keywords:
			"terminal, workspace, git worktree, tauri, developer tools, project management",
		image: `${SITE_URL}/overlook/icon.png`,
		twitterHandle: "",
	},
	social: {
		github: "https://github.com/ardasener/overlook",
	},
};
