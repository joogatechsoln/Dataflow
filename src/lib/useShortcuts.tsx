/**
 * useShortcuts.ts — DataFlow Suite Phase 7
 * Global keyboard shortcut registry.
 *
 * Usage:
 *   // Register global shortcuts at app root
 *   useShortcuts([
 *     { keys: ["ctrl+k", "meta+k"], action: openPalette, description: "Open command palette" },
 *   ]);
 *
 *   // Per-component (only active while component is mounted)
 *   useShortcuts([
 *     { keys: ["ctrl+s"], action: saveData, description: "Save" },
 *   ], { scope: "analyze-tab" });
 *
 * Notes:
 *   - meta = ⌘ (Mac) / Win key (Windows)
 *   - Shortcuts with the same key, same scope = last registered wins
 *   - Scope "global" shortcuts are always active
 *   - A scope string means: only active while that component is mounted
 */

import { useEffect, useRef } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ShortcutDef {
  /** One or more key combos, e.g. ["ctrl+k", "meta+k"] */
  keys: string[];
  action: (e: KeyboardEvent) => void;
  /** Human-readable description shown in the shortcut overlay */
  description: string;
  /** Optional group for display in the hints overlay */
  group?: string;
  /** Prevent this shortcut from firing inside inputs/textareas */
  ignoreInInput?: boolean;
}

interface ShortcutOptions {
  /** Component-level scope — shortcuts auto-removed on unmount */
  scope?: string;
}

// ── Normalise a key combo string ────────────────────────────────────────────

function normaliseKey(raw: string): string {
  return raw
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
    .sort((a, b) => {
      // Modifiers first: ctrl, meta, alt, shift
      const order = ["ctrl", "meta", "alt", "shift"];
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    })
    .join("+");
}

function eventToKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey)  parts.push("ctrl");
  if (e.metaKey)  parts.push("meta");
  if (e.altKey)   parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  const key = e.key.toLowerCase();
  if (!["control", "meta", "alt", "shift"].includes(key)) parts.push(key);
  return parts.join("+");
}

// ── Global registry (module-level singleton) ────────────────────────────────

interface RegistryEntry {
  scope: string;
  def: ShortcutDef;
}

const registry: Map<string, RegistryEntry[]> = new Map();
let listenerAttached = false;

function handleKeyDown(e: KeyboardEvent) {
  const combo = eventToKey(e);
  const entries = registry.get(combo);
  if (!entries || entries.length === 0) return;

  // Last registered entry with a matching scope wins
  for (let i = entries.length - 1; i >= 0; i--) {
    const { def } = entries[i];

    // Skip if focus is in an editable element and shortcut opts out
    if (def.ignoreInInput !== false) {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) {
        continue;
      }
    }

    e.preventDefault();
    def.action(e);
    return; // first match wins (most-recent-scope wins)
  }
}

function ensureListener() {
  if (listenerAttached) return;
  window.addEventListener("keydown", handleKeyDown);
  listenerAttached = true;
}

function registerShortcut(scope: string, def: ShortcutDef) {
  def.keys.forEach((raw) => {
    const combo = normaliseKey(raw);
    if (!registry.has(combo)) registry.set(combo, []);
    registry.get(combo)!.push({ scope, def });
  });
}

function unregisterScope(scope: string) {
  registry.forEach((entries, combo) => {
    const filtered = entries.filter((e) => e.scope !== scope);
    if (filtered.length === 0) {
      registry.delete(combo);
    } else {
      registry.set(combo, filtered);
    }
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

let scopeCounter = 0;

/**
 * Register keyboard shortcuts. Shortcuts are automatically removed when
 * the component unmounts.
 */
export function useShortcuts(shortcuts: ShortcutDef[], options: ShortcutOptions = {}) {
  ensureListener();
  const scopeRef = useRef<string>(options.scope ?? `auto-${++scopeCounter}`);

  useEffect(() => {
    const scope = scopeRef.current;
    shortcuts.forEach((def) => registerShortcut(scope, def));
    return () => unregisterScope(scope);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ── Pre-defined shortcut catalogue (for the hints overlay) ─────────────────

export const SHORTCUT_CATALOGUE: { group: string; shortcuts: { keys: string; description: string }[] }[] = [
  {
    group: "General",
    shortcuts: [
      { keys: "Ctrl+K",       description: "Open command palette" },
      { keys: "Ctrl+/",       description: "Show keyboard shortcuts" },
      { keys: "Ctrl+Shift+D", description: "Go to Dashboard" },
      { keys: "Ctrl+,",       description: "Open Settings" },
    ],
  },
  {
    group: "Pipeline Navigation",
    shortcuts: [
      { keys: "Ctrl+1", description: "Jump to Define tab" },
      { keys: "Ctrl+2", description: "Jump to Collect tab" },
      { keys: "Ctrl+3", description: "Jump to Clean tab" },
      { keys: "Ctrl+4", description: "Jump to Analyze tab" },
      { keys: "Ctrl+5", description: "Jump to Visualize tab" },
      { keys: "Ctrl+6", description: "Jump to Report tab" },
    ],
  },
  {
    group: "AI & Tools",
    shortcuts: [
      { keys: "Ctrl+Shift+A", description: "Toggle AI Assistant" },
      { keys: "Ctrl+Enter",   description: "Run SQL / execute cell" },
      { keys: "Ctrl+S",       description: "Save current work" },
    ],
  },
  {
    group: "UI",
    shortcuts: [
      { keys: "Escape",        description: "Close modal / panel" },
      { keys: "Ctrl+Shift+N",  description: "Create new project" },
    ],
  },
];

// ── ShortcutHintsOverlay component ─────────────────────────────────────────

import React from "react";

interface ShortcutHintsOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutHintsOverlay({ open, onClose }: ShortcutHintsOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white", borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
          width: 560, maxWidth: "90vw", maxHeight: "80vh",
          overflow: "hidden", display: "flex", flexDirection: "column",
          border: "0.5px solid #e8e6e0",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "0.5px solid #f0ede8",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Keyboard Shortcuts</div>
            <div style={{ fontSize: 11, color: "#b0aea6", marginTop: 2 }}>
              Press <kbd style={{ padding: "1px 5px", background: "#f0ede8", borderRadius: 3, border: "0.5px solid #d0cec6" }}>Ctrl+/</kbd> to toggle this panel
            </div>
          </div>
          <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "12px 20px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {SHORTCUT_CATALOGUE.map((group) => (
              <div key={group.group}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                  color: "#b0aea6", textTransform: "uppercase",
                  marginBottom: 10,
                }}>
                  {group.group}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.shortcuts.map(({ keys, description }) => (
                    <div key={keys} style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 8,
                    }}>
                      <span style={{ fontSize: 12, color: "#3d3d3a" }}>{description}</span>
                      <kbd style={{
                        fontSize: 10, padding: "3px 7px", borderRadius: 5,
                        background: "#f5f5f4", border: "0.5px solid #d0cec6",
                        color: "#534AB7", fontWeight: 600, fontFamily: "inherit",
                        whiteSpace: "nowrap", flexShrink: 0,
                      }}>{keys}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
