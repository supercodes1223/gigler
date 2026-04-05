import type { MetadataRoute } from "next";

const EXAMPLE_CATEGORIES = [
  "coding",
  "business",
  "planning",
  "creative",
  "professional",
  "scheduling",
  "lifestyle",
  "education",
  "reservations",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gigler.ai";
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/examples`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = EXAMPLE_CATEGORIES.map(
    (cat) => ({
      url: `${siteUrl}/examples/${cat}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })
  );

  // TODO: Phase 7 -- Query Deliverable table for all public shortCodes
  // and add them to the sitemap as dynamic gig review pages.

  return [...staticPages, ...categoryPages];
}
