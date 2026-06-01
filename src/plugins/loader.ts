/**
 * loader.ts — DataFlow Suite Phase 5
 * Loads a plugin's ESM bundle inside a sandboxed iframe.
 * Communicates via postMessage to enforce CSP isolation.
 * The host API is serialised as a JSON-RPC bridge across the iframe boundary.
 */

import type { PluginManifest, PluginHostAPI, PluginInstance, InstalledPlugin } from "./types";

// ─── Sandboxed iframe HTML template ─────────────────────────────────────────

function buildSandboxHTML(entryUrl: string, pluginId: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <!--
    CSP: plugins may fetch from any https origin (for network-permissioned plugins)
    but cannot access parent frame DOM, run inline scripts, or load unsafe-eval.
  -->
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src '${entryUrl}' 'unsafe-inline'; connect-src https:; style-src 'unsafe-inline'; frame-ancestors 'self';" />
</head>
<body>
<script type="module">
  // ── JSON-RPC bridge (plugin → host) ───────────────────────────────────────
  const callHost = (method, ...args) =>
    new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2);
      const handler = (e) => {
        if (e.data?.rpcId !== id) return;
        window.removeEventListener("message", handler);
        if (e.data.error) reject(new Error(e.data.error));
        else resolve(e.data.result);
      };
      window.addEventListener("message", handler);
      window.parent.postMessage({ pluginId: "${pluginId}", rpcId: id, method, args }, "*");
    });

  // ── Lightweight host API proxy exposed to plugin code ────────────────────
  const host = {
    registerNavItem: (item)     => callHost("registerNavItem", item),
    registerChartType: (chart)  => callHost("registerChartType", chart),
    registerConnector: (conn)   => callHost("registerConnector", conn),
    registerAnalysisPanel: (p)  => callHost("registerAnalysisPanel", p),
    getProjectData: ()          => callHost("getProjectData"),
    toast: (msg, type)          => callHost("toast", msg, type),
  };

  // ── Load the plugin bundle ───────────────────────────────────────────────
  try {
    const mod = await import("${entryUrl}");
    if (typeof mod.activate !== "function") {
      throw new Error("Plugin must export activate(host)");
    }
    await mod.activate(host);
    window.parent.postMessage({ pluginId: "${pluginId}", event: "activated" }, "*");
  } catch (err) {
    window.parent.postMessage({ pluginId: "${pluginId}", event: "error", message: err?.message ?? String(err) }, "*");
  }
</script>
</body>
</html>`;
}

// ─── Active plugin registry (in-memory, not persisted) ──────────────────────

const activeIframes = new Map<string, HTMLIFrameElement>();
const pendingRPC = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

// ─── Global message router ────────────────────────────────────────────────── 

let hostAPI: PluginHostAPI | null = null;

export function setPluginHostAPI(api: PluginHostAPI) {
  hostAPI = api;
}

function handlePluginMessage(event: MessageEvent) {
  const { pluginId, rpcId, method, args, event: pluginEvent, message } = event.data ?? {};
  if (!pluginId) return;

  // RPC call from plugin to host
  if (rpcId && method && hostAPI) {
    const fn = (hostAPI as unknown as Record<string, unknown>)[method];
    if (typeof fn === "function") {
      Promise.resolve()
        .then(() => (fn as Function).apply(hostAPI, args ?? []))
        .then((result) => {
          const iframe = activeIframes.get(pluginId);
          iframe?.contentWindow?.postMessage({ rpcId, result }, "*");
        })
        .catch((err) => {
          const iframe = activeIframes.get(pluginId);
          iframe?.contentWindow?.postMessage({ rpcId, error: err?.message ?? String(err) }, "*");
        });
    }
    return;
  }

  // Lifecycle events
  if (pluginEvent === "activated") {
    console.info(`[PluginLoader] Plugin activated: ${pluginId}`);
  }
  if (pluginEvent === "error") {
    console.error(`[PluginLoader] Plugin error (${pluginId}): ${message}`);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("message", handlePluginMessage);
}

// ─── Load a plugin into a hidden sandbox iframe ──────────────────────────────

export async function loadPlugin(installed: InstalledPlugin): Promise<PluginInstance> {
  const { manifest } = installed;

  // Remove any previously loaded instance
  await unloadPlugin(manifest.id);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  iframe.style.cssText = "display:none;width:0;height:0;border:none;position:absolute;";

  const html = buildSandboxHTML(manifest.entryUrl, manifest.id);
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
  activeIframes.set(manifest.id, iframe);

  // Wait for activation or error (5 s timeout)
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Plugin ${manifest.id} activation timed out`)), 5000);

    const handler = (event: MessageEvent) => {
      if (event.data?.pluginId !== manifest.id) return;
      if (event.data.event === "activated") {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        resolve();
      }
      if (event.data.event === "error") {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        reject(new Error(event.data.message));
      }
    };
    window.addEventListener("message", handler);
  });

  return {
    manifest,
    activate: async (host) => {
      setPluginHostAPI(host);
    },
    deactivate: async () => {
      await unloadPlugin(manifest.id);
    },
  };
}

// ─── Unload / destroy a plugin ───────────────────────────────────────────────

export async function unloadPlugin(pluginId: string): Promise<void> {
  const iframe = activeIframes.get(pluginId);
  if (iframe) {
    iframe.remove();
    activeIframes.delete(pluginId);
  }
}

// ─── Load all enabled plugins on app start ──────────────────────────────────

export async function loadAllEnabledPlugins(
  plugins: InstalledPlugin[],
  host: PluginHostAPI
): Promise<void> {
  setPluginHostAPI(host);
  for (const plugin of plugins) {
    if (!plugin.enabled) continue;
    try {
      await loadPlugin(plugin);
    } catch (err) {
      console.error(`[PluginLoader] Failed to load ${plugin.manifest.id}:`, err);
    }
  }
}
