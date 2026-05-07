import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const privacy = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/privacy" }),
  schema: z.object({
    appName: z.string().optional(),
    routeSlug: z.string().optional(),
    lastUpdated: z.string(),
    order: z.number().default(100).optional(),
    title: z.string().optional(),
    /** Bu adreste barındırılıyorsa yerel /slug/privacy sayfası yerine bu URL kullanılır ve yönlendirilir. */
    externalPrivacyUrl: z.string().url().optional(),
  }),
});

export const collections = {
  privacy,
};
