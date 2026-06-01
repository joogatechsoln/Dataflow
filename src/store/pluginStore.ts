/**
 * pluginStore.ts — DataFlow Suite Phase 5
 * Zustand store for managing installed plugins, their enabled/disabled state,
 * per-plugin config, and the cached marketplace registry.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InstalledPlugin, PluginRegistryEntry, PluginPermission } from "../plugins/types";

interface PluginState {
  // ── Installed plugins (persisted) ─────────────────────────────────────────
  installedPlugins: InstalledPlugin[];

  // ── Marketplace registry (not persisted — fetched fresh each visit) ───────
  registryPlugins: PluginRegistryEntry[];
  registryLoading: boolean;
  registryError: string | null;
  registryLastFetched: string | null;

  // ── UI state ──────────────────────────────────────────────────────────────
  selectedPluginId: string | null;

  // ── Actions ───────────────────────────────────────────────────────────────

  installPlugin: (entry: PluginRegistryEntry, acceptedPermissions: PluginPermission[]) => void;
  uninstallPlugin: (pluginId: string) => void;
  enablePlugin: (pluginId: string) => void;
  disablePlugin: (pluginId: string) => void;
  setPluginConfig: (pluginId: string, key: string, value: string) => void;

  setRegistryPlugins: (plugins: PluginRegistryEntry[]) => void;
  setRegistryLoading: (loading: boolean) => void;
  setRegistryError: (error: string | null) => void;
  setRegistryLastFetched: (ts: string) => void;

  setSelectedPlugin: (id: string | null) => void;
}

export const usePluginStore = create<PluginState>()(
  persist(
    (set) => ({
      installedPlugins: [],
      registryPlugins: [],
      registryLoading: false,
      registryError: null,
      registryLastFetched: null,
      selectedPluginId: null,

      installPlugin: (entry, acceptedPermissions) =>
        set((s) => {
          // Update if already installed (upgrade)
          const exists = s.installedPlugins.find((p) => p.manifest.id === entry.id);
          if (exists) {
            return {
              installedPlugins: s.installedPlugins.map((p) =>
                p.manifest.id === entry.id
                  ? { ...p, manifest: entry, acceptedPermissions }
                  : p
              ),
            };
          }
          const newPlugin: InstalledPlugin = {
            manifest: entry,
            enabled: true,
            installedAt: new Date().toISOString(),
            acceptedPermissions,
            config: {},
          };
          return { installedPlugins: [newPlugin, ...s.installedPlugins] };
        }),

      uninstallPlugin: (pluginId) =>
        set((s) => ({
          installedPlugins: s.installedPlugins.filter((p) => p.manifest.id !== pluginId),
          selectedPluginId: s.selectedPluginId === pluginId ? null : s.selectedPluginId,
        })),

      enablePlugin: (pluginId) =>
        set((s) => ({
          installedPlugins: s.installedPlugins.map((p) =>
            p.manifest.id === pluginId ? { ...p, enabled: true } : p
          ),
        })),

      disablePlugin: (pluginId) =>
        set((s) => ({
          installedPlugins: s.installedPlugins.map((p) =>
            p.manifest.id === pluginId ? { ...p, enabled: false } : p
          ),
        })),

      setPluginConfig: (pluginId, key, value) =>
        set((s) => ({
          installedPlugins: s.installedPlugins.map((p) =>
            p.manifest.id === pluginId
              ? { ...p, config: { ...p.config, [key]: value } }
              : p
          ),
        })),

      setRegistryPlugins: (plugins) => set({ registryPlugins: plugins }),
      setRegistryLoading: (registryLoading) => set({ registryLoading }),
      setRegistryError: (registryError) => set({ registryError }),
      setRegistryLastFetched: (ts) => set({ registryLastFetched: ts }),
      setSelectedPlugin: (selectedPluginId) => set({ selectedPluginId }),
    }),
    {
      name: "dataflow-plugins",
      // Only persist installed plugins (not the live registry or UI state)
      partialize: (state) => ({
        installedPlugins: state.installedPlugins,
      }),
    }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────── 

export function selectInstalledIds(state: PluginState): Set<string> {
  return new Set(state.installedPlugins.map((p) => p.manifest.id));
}

export function selectEnabledPlugins(state: PluginState): InstalledPlugin[] {
  return state.installedPlugins.filter((p) => p.enabled);
}

export function selectPluginById(state: PluginState, id: string): InstalledPlugin | undefined {
  return state.installedPlugins.find((p) => p.manifest.id === id);
}
