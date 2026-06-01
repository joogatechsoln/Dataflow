/**
 * types.ts — DataFlow Suite Phase 5
 * Plugin system: manifest interface, hook types, and loader contract.
 * All first-party and community plugins must conform to PluginManifest.
 */

// ─── Manifest ───────────────────────────────────────────────────────────────

export type PluginCategory =
  | "connector"   // data source connectors (BigQuery, Snowflake, S3 …)
  | "chart"       // extra chart types (Sankey, Funnel, Treemap …)
  | "export"      // new export formats
  | "transform"   // data cleaning / transformation helpers
  | "embed"       // embedded external tools (Power BI, Tableau …)
  | "utility";    // misc helpers

export type PluginPermission =
  | "network"        // can make external HTTP requests
  | "filesystem"     // can read/write local files via Tauri
  | "database"       // can open local DuckDB / SQLite connections
  | "openai"         // can call the user's OpenAI API key
  | "supabase"       // can read/write to the user's Supabase project
  | "clipboard"      // can write to the system clipboard
  | "notifications"; // can display desktop notifications

export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
}

export interface PluginManifest {
  /** Globally-unique reverse-domain identifier, e.g. "io.dataflow.bigquery" */
  id: string;

  /** Short human-readable name shown in the Marketplace */
  name: string;

  /** One-sentence description */
  description: string;

  /** Semver string, e.g. "1.2.0" */
  version: string;

  /** Minimum DataFlow Suite version required */
  minAppVersion: string;

  category: PluginCategory;

  /** Permissions the plugin needs; user must accept before install */
  permissions: PluginPermission[];

  author: PluginAuthor;

  /** URL to fetch the plugin's main JS bundle (ESM) */
  entryUrl: string;

  /** Optional absolute URL to plugin icon (square PNG, ≥64×64) */
  iconUrl?: string;

  /** Tags used for Marketplace search/filter */
  tags: string[];

  /** Whether this is an Anthropic/DataFlow first-party plugin */
  official: boolean;

  /** Download count (from registry, read-only) */
  downloads?: number;

  /** Average star rating 0–5 (from registry, read-only) */
  rating?: number;

  /** Screenshots for the Marketplace detail panel */
  screenshots?: string[];

  /** Detailed changelog markdown */
  changelog?: string;

  /** URL to plugin docs/homepage */
  homepageUrl?: string;
}

// ─── Installed plugin record (stored in pluginStore) ────────────────────────

export interface InstalledPlugin {
  manifest: PluginManifest;
  enabled: boolean;
  installedAt: string;   // ISO timestamp
  /** User-accepted permissions at install time */
  acceptedPermissions: PluginPermission[];
  /** Any user-supplied config key/value pairs */
  config: Record<string, string>;
}

// ─── Plugin hook API (what a loaded plugin can call back into the app) ───────

export type PipelineTab = "define" | "collect" | "clean" | "analyze" | "visualize" | "report";

export interface PluginHostAPI {
  /** Register a new sidebar nav item that opens a custom panel */
  registerNavItem(item: {
    id: string;
    label: string;
    icon: string;
    panel: () => HTMLElement | null;
  }): void;

  /** Register a new chart type in the Visualize tab */
  registerChartType(chart: {
    id: string;
    label: string;
    icon: string;
    render: (container: HTMLElement, data: unknown[], options: Record<string, unknown>) => void;
    destroy?: () => void;
  }): void;

  /** Register a new data connector in the Collect tab */
  registerConnector(connector: {
    id: string;
    label: string;
    icon: string;
    /** Returns rows as plain objects */
    fetchData: (config: Record<string, string>) => Promise<Record<string, unknown>[]>;
    /** Config fields to show in the connect form */
    configSchema: Array<{ key: string; label: string; type: "text" | "password" | "url" | "number"; required: boolean }>;
  }): void;

  /** Register a panel that appears in the Analyze tab */
  registerAnalysisPanel(panel: {
    id: string;
    label: string;
    render: (container: HTMLElement, projectId: string) => void;
    destroy?: () => void;
  }): void;

  /** Read-only access to current project data */
  getProjectData(): { id: string; name: string; rows: Record<string, unknown>[] } | null;

  /** Show a toast notification */
  toast(message: string, type?: "info" | "success" | "error"): void;
}

// ─── Runtime plugin instance (returned by loader) ───────────────────────────

export interface PluginInstance {
  manifest: PluginManifest;
  /** Called once after sandboxed code is loaded */
  activate(host: PluginHostAPI): Promise<void>;
  /** Called when user disables or uninstalls the plugin */
  deactivate(): Promise<void>;
}

// ─── Registry manifest list (fetched from hosted JSON) ──────────────────────

export interface PluginRegistryEntry extends PluginManifest {
  /** Last published timestamp ISO */
  publishedAt: string;
  latestVersion: string;
}

export interface PluginRegistry {
  version: number;
  updatedAt: string;
  plugins: PluginRegistryEntry[];
}
