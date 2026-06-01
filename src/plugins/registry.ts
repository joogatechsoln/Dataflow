/**
 * registry.ts — DataFlow Suite Phase 5
 * Bundled plugin registry (first-party plugins always available offline).
 * In production, merges with a remotely-fetched JSON manifest list.
 */

import type { PluginRegistryEntry } from "./types";

// ─── First-party / official plugins (bundled so they work offline) ───────────

export const OFFICIAL_PLUGINS: PluginRegistryEntry[] = [
  {
    id: "io.dataflow.bigquery",
    name: "BigQuery Connector",
    description: "Connect to Google BigQuery datasets and run SQL queries directly from the Collect tab.",
    version: "1.0.0",
    latestVersion: "1.0.0",
    minAppVersion: "0.5.0",
    category: "connector",
    permissions: ["network"],
    author: { name: "DataFlow Team", url: "https://dataflow.io" },
    entryUrl: "https://plugins.dataflow.io/bigquery/1.0.0/index.mjs",
    iconUrl: "https://plugins.dataflow.io/bigquery/icon.png",
    tags: ["bigquery", "google", "cloud", "sql", "warehouse"],
    official: true,
    downloads: 8420,
    rating: 4.8,
    publishedAt: "2025-09-01T00:00:00Z",
    homepageUrl: "https://docs.dataflow.io/plugins/bigquery",
  },
  {
    id: "io.dataflow.snowflake",
    name: "Snowflake Connector",
    description: "Query Snowflake data warehouses with your existing credentials. Supports virtual warehouses and role-based access.",
    version: "1.0.0",
    latestVersion: "1.0.0",
    minAppVersion: "0.5.0",
    category: "connector",
    permissions: ["network"],
    author: { name: "DataFlow Team", url: "https://dataflow.io" },
    entryUrl: "https://plugins.dataflow.io/snowflake/1.0.0/index.mjs",
    iconUrl: "https://plugins.dataflow.io/snowflake/icon.png",
    tags: ["snowflake", "cloud", "sql", "warehouse", "analytics"],
    official: true,
    downloads: 6210,
    rating: 4.7,
    publishedAt: "2025-09-01T00:00:00Z",
    homepageUrl: "https://docs.dataflow.io/plugins/snowflake",
  },
  {
    id: "io.dataflow.s3",
    name: "Amazon S3 Connector",
    description: "Browse S3 buckets, download CSV/Parquet/JSON files, and load them directly into your pipeline.",
    version: "1.0.0",
    latestVersion: "1.0.0",
    minAppVersion: "0.5.0",
    category: "connector",
    permissions: ["network", "filesystem"],
    author: { name: "DataFlow Team", url: "https://dataflow.io" },
    entryUrl: "https://plugins.dataflow.io/s3/1.0.0/index.mjs",
    iconUrl: "https://plugins.dataflow.io/s3/icon.png",
    tags: ["s3", "aws", "amazon", "storage", "parquet"],
    official: true,
    downloads: 5890,
    rating: 4.6,
    publishedAt: "2025-09-15T00:00:00Z",
  },
  {
    id: "io.dataflow.chart-sankey",
    name: "Sankey Chart",
    description: "Add Sankey flow diagrams to the Visualize tab — perfect for showing data flows, budget breakdowns, and user journeys.",
    version: "1.0.0",
    latestVersion: "1.0.0",
    minAppVersion: "0.5.0",
    category: "chart",
    permissions: [],
    author: { name: "DataFlow Team", url: "https://dataflow.io" },
    entryUrl: "https://plugins.dataflow.io/chart-sankey/1.0.0/index.mjs",
    iconUrl: "https://plugins.dataflow.io/chart-sankey/icon.png",
    tags: ["sankey", "flow", "chart", "visualization"],
    official: true,
    downloads: 4120,
    rating: 4.9,
    publishedAt: "2025-10-01T00:00:00Z",
  },
  {
    id: "io.dataflow.chart-funnel",
    name: "Funnel Chart",
    description: "Visualise conversion funnels, sales pipelines, and multi-stage processes with a clean, interactive funnel chart.",
    version: "1.0.0",
    latestVersion: "1.0.0",
    minAppVersion: "0.5.0",
    category: "chart",
    permissions: [],
    author: { name: "DataFlow Team", url: "https://dataflow.io" },
    entryUrl: "https://plugins.dataflow.io/chart-funnel/1.0.0/index.mjs",
    iconUrl: "https://plugins.dataflow.io/chart-funnel/icon.png",
    tags: ["funnel", "conversion", "sales", "chart", "visualization"],
    official: true,
    downloads: 3750,
    rating: 4.7,
    publishedAt: "2025-10-01T00:00:00Z",
  },
  {
    id: "io.dataflow.chart-treemap",
    name: "Treemap Chart",
    description: "Add treemap visualisations for hierarchical data — great for market share, budget allocation, and nested category comparisons.",
    version: "1.0.0",
    latestVersion: "1.0.0",
    minAppVersion: "0.5.0",
    category: "chart",
    permissions: [],
    author: { name: "DataFlow Team", url: "https://dataflow.io" },
    entryUrl: "https://plugins.dataflow.io/chart-treemap/1.0.0/index.mjs",
    iconUrl: "https://plugins.dataflow.io/chart-treemap/icon.png",
    tags: ["treemap", "hierarchy", "chart", "visualization"],
    official: true,
    downloads: 2980,
    rating: 4.5,
    publishedAt: "2025-10-15T00:00:00Z",
  },
  {
    id: "io.dataflow.powerbi",
    name: "Power BI Embed",
    description: "Embed live Power BI reports and dashboards directly inside the Visualize tab using your Microsoft 365 account.",
    version: "1.0.0",
    latestVersion: "1.0.0",
    minAppVersion: "0.5.0",
    category: "embed",
    permissions: ["network"],
    author: { name: "DataFlow Team", url: "https://dataflow.io" },
    entryUrl: "https://plugins.dataflow.io/powerbi/1.0.0/index.mjs",
    iconUrl: "https://plugins.dataflow.io/powerbi/icon.png",
    tags: ["powerbi", "microsoft", "embed", "dashboard", "business intelligence"],
    official: true,
    downloads: 7340,
    rating: 4.6,
    publishedAt: "2025-10-20T00:00:00Z",
    homepageUrl: "https://docs.dataflow.io/plugins/powerbi",
  },
];

// ─── Community plugins (subset for demo — would be fetched from registry) ───

export const COMMUNITY_PLUGINS: PluginRegistryEntry[] = [
  {
    id: "com.example.databricks",
    name: "Databricks Connector",
    description: "Connect to Databricks SQL warehouses and Spark clusters. Supports Delta Lake tables.",
    version: "0.9.2",
    latestVersion: "0.9.2",
    minAppVersion: "0.5.0",
    category: "connector",
    permissions: ["network"],
    author: { name: "JimData", url: "https://github.com/jimdata" },
    entryUrl: "https://cdn.jsdelivr.net/npm/df-databricks-plugin@0.9.2/dist/index.mjs",
    tags: ["databricks", "spark", "delta", "cloud"],
    official: false,
    downloads: 1230,
    rating: 4.3,
    publishedAt: "2025-11-01T00:00:00Z",
  },
  {
    id: "com.example.chart-wordcloud",
    name: "Word Cloud Chart",
    description: "Generate word cloud visualisations from text columns — useful for survey responses, reviews, and NLP output.",
    version: "1.1.0",
    latestVersion: "1.1.0",
    minAppVersion: "0.5.0",
    category: "chart",
    permissions: [],
    author: { name: "DataVizLab" },
    entryUrl: "https://cdn.jsdelivr.net/npm/df-wordcloud-plugin@1.1.0/dist/index.mjs",
    tags: ["wordcloud", "text", "nlp", "chart"],
    official: false,
    downloads: 890,
    rating: 4.1,
    publishedAt: "2025-11-15T00:00:00Z",
  },
  {
    id: "com.example.export-notion",
    name: "Notion Export",
    description: "Export DataFlow reports directly to Notion pages. Converts charts to images and appends to any Notion database.",
    version: "0.8.0",
    latestVersion: "0.8.0",
    minAppVersion: "0.5.0",
    category: "export",
    permissions: ["network"],
    author: { name: "NotionTools" },
    entryUrl: "https://cdn.jsdelivr.net/npm/df-notion-export@0.8.0/dist/index.mjs",
    tags: ["notion", "export", "report"],
    official: false,
    downloads: 2100,
    rating: 4.4,
    publishedAt: "2025-12-01T00:00:00Z",
  },
  {
    id: "com.example.airtable",
    name: "Airtable Connector",
    description: "Read Airtable bases as structured tables directly in the Collect tab. Supports filtering and field selection.",
    version: "1.0.1",
    latestVersion: "1.0.1",
    minAppVersion: "0.5.0",
    category: "connector",
    permissions: ["network"],
    author: { name: "AirConnect" },
    entryUrl: "https://cdn.jsdelivr.net/npm/df-airtable-plugin@1.0.1/dist/index.mjs",
    tags: ["airtable", "nocode", "connector"],
    official: false,
    downloads: 1680,
    rating: 4.2,
    publishedAt: "2025-12-10T00:00:00Z",
  },
];

// ─── Full registry (bundled) — production merges remote JSON on top ──────────

export const BUNDLED_REGISTRY: PluginRegistryEntry[] = [
  ...OFFICIAL_PLUGINS,
  ...COMMUNITY_PLUGINS,
];

// ─── Registry fetch hook ──────────────────────────────────────────────────── 

/**
 * Fetches the remote registry and merges with the bundled list.
 * Falls back gracefully to bundled data if offline or fetch fails.
 */
export async function fetchRegistry(remoteUrl?: string): Promise<PluginRegistryEntry[]> {
  if (!remoteUrl) return BUNDLED_REGISTRY;

  try {
    const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = await res.json() as { plugins: PluginRegistryEntry[] };

    // Merge: remote entries take precedence over bundled ones
    const remoteIds = new Set(remote.plugins.map((p) => p.id));
    const merged = [
      ...remote.plugins,
      ...BUNDLED_REGISTRY.filter((p) => !remoteIds.has(p.id)),
    ];
    return merged;
  } catch {
    console.warn("[PluginRegistry] Remote fetch failed, using bundled registry");
    return BUNDLED_REGISTRY;
  }
}
