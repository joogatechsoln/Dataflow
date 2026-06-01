/**
 * PluginMarketplace.tsx — DataFlow Suite Phase 5
 * Community plugin marketplace: browse, search, filter, install,
 * enable/disable, uninstall, and configure plugins.
 */

import { useState, useEffect, useMemo } from "react";
import { usePluginStore, selectInstalledIds } from "../../store/pluginStore";
import { BUNDLED_REGISTRY } from "../../plugins/registry";
import { unloadPlugin, loadPlugin } from "../../plugins/loader";
import type { PluginRegistryEntry, PluginCategory, PluginPermission } from "../../plugins/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<PluginCategory, string> = {
  connector: "Connectors",
  chart:     "Charts",
  export:    "Export",
  transform: "Transforms",
  embed:     "Embeds",
  utility:   "Utilities",
};

const PERM_LABELS: Record<PluginPermission, string> = {
  network:       "Internet access",
  filesystem:    "Local file system",
  database:      "Local database",
  openai:        "OpenAI API key",
  supabase:      "Supabase project",
  clipboard:     "Clipboard write",
  notifications: "Desktop notifications",
};

function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span style={{ fontSize: 11, color: "#BA7517", letterSpacing: 1 }}>
      {"★".repeat(full)}{"☆".repeat(5 - full)}
      <span style={{ color: "#73726c", marginLeft: 4, letterSpacing: 0 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
      background: color ? `${color}18` : "#f0ede8", color: color ?? "#73726c",
      letterSpacing: 0.3, textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

// ─── Permission consent dialog ────────────────────────────────────────────── 

function PermissionDialog({
  plugin, onAccept, onCancel,
}: { plugin: PluginRegistryEntry; onAccept: (perms: PluginPermission[]) => void; onCancel: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: 28, maxWidth: 440, width: "90%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Install "{plugin.name}"?</h3>
        <p style={{ margin: "0 0 18px", fontSize: 12, color: "#73726c" }}>
          This plugin requires the following permissions:
        </p>

        {plugin.permissions.length === 0 ? (
          <p style={{ fontSize: 12, color: "#1D9E75", margin: "0 0 18px" }}>✓ No special permissions required</p>
        ) : (
          <div style={{ marginBottom: 18 }}>
            {plugin.permissions.map((perm) => (
              <div key={perm} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                background: "#fffbf5", border: "0.5px solid #e8e6e0", borderRadius: 8, marginBottom: 6,
              }}>
                <span style={{ fontSize: 16 }}>🔐</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{PERM_LABELS[perm]}</div>
                  <div style={{ fontSize: 11, color: "#73726c" }}>perm: {perm}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!plugin.official && (
          <div style={{
            padding: "8px 12px", background: "#fff8ee", border: "0.5px solid #BA7517",
            borderRadius: 8, fontSize: 11, color: "#BA7517", marginBottom: 18,
          }}>
            ⚠️ Community plugin — not audited by DataFlow. Install only from sources you trust.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onAccept(plugin.permissions)}>
            Accept & Install
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plugin detail panel (right drawer) ──────────────────────────────────────

function PluginDetail({
  plugin, installed, enabled, onInstall, onUninstall, onToggle,
}: {
  plugin: PluginRegistryEntry;
  installed: boolean;
  enabled: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onToggle: () => void;
}) {
  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, background: "#f0ede8",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, flexShrink: 0,
        }}>
          {plugin.category === "connector" ? "🔌" :
           plugin.category === "chart" ? "📊" :
           plugin.category === "embed" ? "🖥️" :
           plugin.category === "export" ? "📤" : "🧩"}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{plugin.name}</div>
          <div style={{ fontSize: 12, color: "#73726c", marginBottom: 6 }}>by {plugin.author.name}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Pill color={plugin.official ? "#534AB7" : "#73726c"}>
              {plugin.official ? "Official" : "Community"}
            </Pill>
            <Pill>{CATEGORY_LABELS[plugin.category]}</Pill>
            <span style={{ fontSize: 11, color: "#73726c" }}>v{plugin.version}</span>
          </div>
        </div>
      </div>

      {plugin.rating && <StarRating rating={plugin.rating} />}
      {plugin.downloads && (
        <span style={{ fontSize: 11, color: "#73726c", marginLeft: 12 }}>
          {plugin.downloads.toLocaleString()} installs
        </span>
      )}

      <p style={{ fontSize: 13, color: "#3d3c36", margin: "14px 0 18px", lineHeight: 1.6 }}>
        {plugin.description}
      </p>

      {/* Tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {plugin.tags.map((t) => <Pill key={t}>{t}</Pill>)}
      </div>

      {/* Permissions */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Permissions</div>
        {plugin.permissions.length === 0 ? (
          <div style={{ fontSize: 12, color: "#1D9E75" }}>✓ No special permissions</div>
        ) : plugin.permissions.map((perm) => (
          <div key={perm} style={{ fontSize: 12, color: "#73726c", marginBottom: 4 }}>
            🔐 {PERM_LABELS[perm]}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {!installed ? (
          <button className="btn btn-primary" onClick={onInstall} style={{ width: "100%" }}>
            Install Plugin
          </button>
        ) : (
          <>
            <button
              className={`btn ${enabled ? "btn-secondary" : "btn-primary"}`}
              onClick={onToggle}
              style={{ width: "100%" }}
            >
              {enabled ? "Disable" : "Enable"}
            </button>
            <button className="btn btn-danger" onClick={onUninstall} style={{ width: "100%" }}>
              Uninstall
            </button>
          </>
        )}
        {plugin.homepageUrl && (
          <a
            href={plugin.homepageUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#534AB7", textAlign: "center", marginTop: 4 }}
          >
            View documentation ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Plugin card ──────────────────────────────────────────────────────────── 

function PluginCard({
  plugin, installed, enabled, selected, onSelect,
}: {
  plugin: PluginRegistryEntry;
  installed: boolean;
  enabled: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex", gap: 14, padding: "14px 16px", cursor: "pointer",
        background: selected ? "#534AB708" : "white",
        border: `0.5px solid ${selected ? "#534AB7" : "#e8e6e0"}`,
        borderRadius: 10, marginBottom: 6, transition: "all 0.15s",
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: "#f0ede8",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>
        {plugin.category === "connector" ? "🔌" :
         plugin.category === "chart" ? "📊" :
         plugin.category === "embed" ? "🖥️" :
         plugin.category === "export" ? "📤" : "🧩"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{plugin.name}</span>
          {plugin.official && <Pill color="#534AB7">Official</Pill>}
          {installed && (
            <Pill color={enabled ? "#1D9E75" : "#73726c"}>
              {enabled ? "Enabled" : "Disabled"}
            </Pill>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#73726c", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {plugin.description}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center" }}>
          {plugin.rating && <StarRating rating={plugin.rating} />}
          {plugin.downloads && (
            <span style={{ fontSize: 10, color: "#73726c" }}>
              {plugin.downloads >= 1000 ? `${(plugin.downloads / 1000).toFixed(1)}k` : plugin.downloads} installs
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────── 

export default function PluginMarketplace() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<PluginCategory | "all">("all");
  const [showInstalled, setShowInstalled] = useState(false);
  const [consentPlugin, setConsentPlugin] = useState<PluginRegistryEntry | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { installedPlugins, selectedPluginId, registryPlugins,
          registryLoading, installPlugin, uninstallPlugin,
          enablePlugin, disablePlugin, setSelectedPlugin } = usePluginStore();

  // Load bundled registry on mount (in production, merge with remote)
  useEffect(() => {
    usePluginStore.getState().setRegistryPlugins(BUNDLED_REGISTRY);
  }, []);

  const installedIds = useMemo(() => selectInstalledIds({ installedPlugins } as any), [installedPlugins]);

  const allPlugins = registryPlugins.length > 0 ? registryPlugins : BUNDLED_REGISTRY;

  const filtered = useMemo(() => {
    let list = showInstalled
      ? allPlugins.filter((p) => installedIds.has(p.id))
      : allPlugins;

    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q))
      );
    }
    return list;
  }, [allPlugins, search, categoryFilter, showInstalled, installedIds]);

  const selectedPlugin = allPlugins.find((p) => p.id === selectedPluginId) ?? null;
  const selectedInstalled = selectedPluginId ? installedIds.has(selectedPluginId) : false;
  const selectedEnabled = installedPlugins.find((p) => p.manifest.id === selectedPluginId)?.enabled ?? false;

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleInstall(plugin: PluginRegistryEntry) {
    setConsentPlugin(plugin);
  }

  function handleAccept(perms: PluginPermission[]) {
    if (!consentPlugin) return;
    installPlugin(consentPlugin, perms);
    setConsentPlugin(null);
    showToast(`${consentPlugin.name} installed`, "success");
  }

  function handleUninstall(pluginId: string) {
    unloadPlugin(pluginId);
    uninstallPlugin(pluginId);
    showToast("Plugin uninstalled", "success");
    if (selectedPluginId === pluginId) setSelectedPlugin(null);
  }

  function handleToggle(pluginId: string, enabled: boolean) {
    if (enabled) {
      disablePlugin(pluginId);
      unloadPlugin(pluginId);
    } else {
      enablePlugin(pluginId);
      const installed = installedPlugins.find((p) => p.manifest.id === pluginId);
      if (installed) loadPlugin(installed).catch(console.error);
    }
  }

  const categories: Array<PluginCategory | "all"> = ["all", "connector", "chart", "embed", "export", "transform", "utility"];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden", background: "#faf9f6" }}>
      {/* ── Left: list + filters ─────────────────────────────────────────── */}
      <div style={{ width: 340, display: "flex", flexDirection: "column", borderRight: "0.5px solid #e8e6e0", background: "white" }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 14px", borderBottom: "0.5px solid #e8e6e0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🧩</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Plugin Marketplace</h2>
              <div style={{ fontSize: 11, color: "#73726c" }}>{allPlugins.length} plugins available</div>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search plugins…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
              border: "0.5px solid #e8e6e0", background: "#f9f8f5", outline: "none",
              boxSizing: "border-box",
            }}
          />

          {/* Installed toggle */}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={() => setShowInstalled(false)}
              className={showInstalled ? "btn btn-ghost" : "btn btn-primary"}
              style={{ flex: 1, fontSize: 11, padding: "6px 0" }}
            >
              All Plugins
            </button>
            <button
              onClick={() => setShowInstalled(true)}
              className={showInstalled ? "btn btn-primary" : "btn btn-ghost"}
              style={{ flex: 1, fontSize: 11, padding: "6px 0" }}
            >
              Installed ({installedPlugins.length})
            </button>
          </div>
        </div>

        {/* Category filter */}
        <div style={{ padding: "10px 16px", borderBottom: "0.5px solid #e8e6e0", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                border: "0.5px solid",
                borderColor: categoryFilter === cat ? "#534AB7" : "#e8e6e0",
                background: categoryFilter === cat ? "#534AB718" : "white",
                color: categoryFilter === cat ? "#534AB7" : "#73726c",
                cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.4,
              }}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat as PluginCategory]}
            </button>
          ))}
        </div>

        {/* Plugin list */}
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
          {registryLoading && (
            <div style={{ textAlign: "center", padding: 40, color: "#73726c", fontSize: 13 }}>
              Loading marketplace…
            </div>
          )}
          {!registryLoading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#73726c", fontSize: 13 }}>
              No plugins match your search.
            </div>
          )}
          {filtered.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              installed={installedIds.has(plugin.id)}
              enabled={installedPlugins.find((p) => p.manifest.id === plugin.id)?.enabled ?? false}
              selected={selectedPluginId === plugin.id}
              onSelect={() => setSelectedPlugin(plugin.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Right: detail panel ──────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {selectedPlugin ? (
          <PluginDetail
            plugin={selectedPlugin}
            installed={selectedInstalled}
            enabled={selectedEnabled}
            onInstall={() => handleInstall(selectedPlugin)}
            onUninstall={() => handleUninstall(selectedPlugin.id)}
            onToggle={() => handleToggle(selectedPlugin.id, selectedEnabled)}
          />
        ) : (
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", color: "#73726c",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧩</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Select a plugin</div>
            <div style={{ fontSize: 12 }}>Click any plugin to see details, permissions, and install options.</div>
          </div>
        )}
      </div>

      {/* ── Consent dialog ───────────────────────────────────────────────── */}
      {consentPlugin && (
        <PermissionDialog
          plugin={consentPlugin}
          onAccept={handleAccept}
          onCancel={() => setConsentPlugin(null)}
        />
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, padding: "12px 20px",
          background: toast.type === "success" ? "#1D9E75" : "#E24B4A",
          color: "white", borderRadius: 10, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 9998,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
