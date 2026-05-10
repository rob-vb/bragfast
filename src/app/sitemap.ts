import type { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrls: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/demo`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/templates`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteUrl}/support`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/docs.md`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/llms.txt`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  let templateUrls: MetadataRoute.Sitemap = [];
  try {
    const templates = await fetchQuery(api.templates.listPublicTemplates, {});
    templateUrls = templates.map((t) => ({
      url: `${siteUrl}/templates/${t.externalId}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    // If Convex is unreachable at build time, ship the base sitemap so the
    // build doesn't break — template pages will still be crawlable directly.
  }

  return [...baseUrls, ...templateUrls];
}
