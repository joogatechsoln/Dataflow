/**
 * PluginSettings.tsx — DataFlow Suite Phase 5
 * Per-plugin configuration panel, accessible from Settings > Plugins.
 * Shows installed plugin list, enable/disable toggles, and config key/value fields.
 */

import { useState } from "react";
import { usePluginStore } from "../../store/pluginStore";
import { unloadPlugin, loadPlugin } from "../../plugins/loader";
import type { InstalledPlugin } from "../../plugins/types";

const PERM_ICONS: Record<string, string> = {
  network: "🌐", filesystem: "📁", database: "🗄️",
  openai: "✨", supabase: "☁️", clipboard: "📋", notifications: "🔔",
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 36, height: 20, borderRadius: 20, cursor: "pointer",
        position: "relative", transition: "background 0.2s",
        background: on ? "#534AB7" : "#e8e6e0",
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: "50%", background: "white",
        position: "absolute", top: 3, transition: "left 0.2s",
        left: on ? 19 : 3,
      }} />
    </div>
  );
}

function PluginConfigPanel({ plugin }: { plugin: InstalledPlugin }) {
  const { setPluginConfig, uninstallPlugin, enablePlugin, disablePlugin } = usePluginStore();
  const [showConfig, setShowConfig] = useState(false);
  const [localConfig, setLocalConfig] = useState<Record<string, string>>(plugin.config ?? {});

  const { manifest } = plugin;

  function handleToggle(enabled: boolean) {
    if (enabled) {
      enablePlugin(manifest.id);
      loadPlugin(plugin).catch(console.error);
    } else {
      disablePlugin(manifest.id);
      unloadPlugin(manifest.id);
    }
  }

  function handleSaveConfig() {
    Object.entries(localConfig).forEach(([k, v]) => setPluginConfig(manifest.id, k, v));
    setShowConfig(false);
  }

  function handleUninstall() {
    if (!confirm(`Uninstall "${manifest.name}"? This cannot be undone.`)) return;
    unloadPlugin(manifest.id);
    uninstallPlugin(manifest.id);
  }

  return (
    <div style={{
      background: "white", border: "0.5px solid #e8e6e0", borderRadius: 10,
      marginBottom: 10, overflow: "hidden",
    }}>
      {/* Row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, background: "#f0ede8",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
        }}>
          {manifest.category === "connector" ? "🔌" :
           manifest.category === "chart" ? "📊" :
           manifest.category === "embed" ? "🖥️" : "🧩"}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{manifest.name}</div>
          <div style={{ fontSize: 11, color: "#73726c" }}>
            v{manifest.version} · by {manifest.author.name}
          </div>
          {manifest.permissions.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              {manifest.permissions.map((p) => (
                <span key={p} title={p} style={{ fontSize: 13 }}>{PERM_ICONS[p] ?? "🔐"}</span>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: plugin.enabled ? "#1D9E75" : "#73726c" }}>
            {plugin.enabled ? "Enabled" : "Disabled"}
          </span>
          <Toggle on={plugin.enabled} onChange={handleToggle} />
          <button
            className="btn btn-ghost"
            onClick={() => setShowConfig((s) => !s)}
            style={{ fontSize: 11, padding: "4px 10px" }}
          >
            Configure
          </button>
          <button
            className="btn btn-danger"
            onClick={handleUninstall}
            style={{ fontSize: 11, padding: "4px 10px" }}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div style={{ padding: "14px 16px", borderTop: "0.5px solid #e8e6e0", background: "#faf9f6" }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Plugin Configuration</div>

          {/* Installed metadata */}
          <div style={{ fontSize: 11, color: "#73726c", marginBottom: 14 }}>
            Installed {new Date(plugin.installedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>

          {/* Config fields from manifest configSchema (for connectors) */}
          {manifest.category === "connector" && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#73726c", marginBottom: 10 }}>
                Add connection configuration key/value pairs for this connector:
              </div>
              {["host", "port", "database", "username", "password"].map((key) => (
                <div key={key} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, width: 80, color: "#73726c", flexShrink: 0 }}>{key}</span>
                  <input
                    type={key === "password" ? "password" : "text"}
                    value={localConfig[key] ?? ""}
                    onChange={(e) => setLocalConfig({ ...localConfig, [key]: e.target.value })}
                    placeholder={`Enter ${key}…`}
                    style={{
                      flex: 1, padding: "6px 10px", borderRadius: 8, fontSize: 12,
                      border: "0.5px solid #e8e6e0", outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Accepted permissions recap */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Accepted permissions</div>
            {plugin.acceptedPermissions.length === 0 ? (
              <span style={{ fontSize: 11, color: "#1D9E75" }}>✓ None required</span>
            ) : (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {plugin.acceptedPermissions.map((p) => (
                  <span key={p} style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 20,
                    background: "#534AB718", color: "#534AB7", fontWeight: 600,
                  }}>
                    {PERM_ICONS[p]} {p}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSaveConfig} style={{ fontSize: 12 }}>
              Save Config
            </button>
            <button className="btn btn-ghost" onClick={() => setShowConfig(false)} style={{ fontSize: 12 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PluginSettings() {
  const { installedPlugins } = usePluginStore();

  return (
    <div style={{ padding: 28, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Plugin Settings</h2>
        <span style={{ fontSize: 12, color: "#73726c" }}>
          {installedPlugins.length} plugin{installedPlugins.length !== 1 ? "s" : ""} installed
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#73726c", margin: "0 0 20px" }}>
        Manage installed plugins, toggle them on/off, and configure connection credentials.
        Visit the <strong>Plugin Marketplace</strong> (sidebar) to browse and install more.
      </p>

      <div style={{ maxWidth: 680 }}>
        {installedPlugins.length === 0 ? (
          <div style={{
            padding: "48px 24px", textAlign: "center", background: "white",
            border: "0.5px solid #e8e6e0", borderRadius: 12,
          }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🧩</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No plugins installed</div>
            <div style={{ fontSize: 12, color: "#73726c" }}>
              Browse the Plugin Marketplace to discover connectors, chart types, and more.
            </div>
          </div>
        ) : (
          installedPlugins.map((plugin) => (
            <PluginConfigPanel key={plugin.manifest.id} plugin={plugin} />
          ))
        )}
      </div>
    </div>
  );
}
