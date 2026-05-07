import type { CollectionEntry } from "astro:content";

export type PrivacyEntry = CollectionEntry<"privacy">;

/** Sunucuda barındırılan politika yolu veya harici tam URL. */
export function privacyPolicyHref(entry: PrivacyEntry): string {
  const external = entry.data.externalPrivacyUrl;
  if (external) return external;
  const slug = entry.data.routeSlug ?? entry.id;
  return `/${slug}/privacy`;
}

export function isExternalPrivacyPolicy(entry: PrivacyEntry): boolean {
  return Boolean(entry.data.externalPrivacyUrl);
}
