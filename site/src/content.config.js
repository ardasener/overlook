import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Placeholder: future documentation and blog collections are added here.
const docs = defineCollection({
	loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
	schema: z.object({
		title: z.string(),
		description: z.string().optional(),
	}),
});

export const collections = { docs };
