/**
 * CommandPalette.tsx — DataFlow Suite Phase 7
 * Ctrl+K / Cmd+K global command palette.
 * Searches: projects, pipeline tabs, app routes, and quick actions.
 * Fuzzy-matches query against label + keywords.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectStore, PipelineStep } from "../../store/projectStore";
import { trackEvent, Events } from "../../lib/analytics";

// ── Types ──────────────────────────────────────────────────────────────────

interface PaletteItem {
  id: string;
  icon: string;
  label: string;
  sublabel?: string;
  keywords?: string;
  category: "project" | "navigation" | "action" | "pipeline";
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

// ── Static command items ────────────────────────────────────────────────────

const PIPELINE_STEPS: { key: PipelineStep; label: string; icon: string }[] = [
  { key: "define",    label: "Define",    icon: "🎯" },
  { key: "collect",  label: "Collect",   icon: "📥" },
  { key: "clean",    label: "Clean",     icon: "🧹" },
  { key: "analyze",  label: "Analyze",   icon: "🔬" },
  { key: "visualize",label: "Visualize", icon: "📊" },
  { key: "report",   label: "Report",    icon: "📄" },
];

const NAV_ITEMS = [
  { id: "nav-dashboard",    icon: "🏠", label: "Dashboard",         path: "/",           keywords: "home projects" },
  { id: "nav-learn",        icon: "📚", label: "Learn Hub",          path: "/learn",      keywords: "lessons tutorials education" },
  { id: "nav-team",         icon: "👥", label: "Team Workspace",     path: "/team",       keywords: "collaborate share members" },
  { id: "nav-admin",        icon: "🛡️", label: "Admin Dashboard",    path: "/admin",      keywords: "admin roles usage" },
  { id: "nav-marketplace",  icon: "🧩", label: "Plugin Marketplace", path: "/marketplace",keywords: "plugins extensions" },
  { id: "nav-settings",     icon: "⚙️", label: "Settings",           path: "/settings",   keywords: "config preferences api key" },
  { id: "nav-billing",      icon: "💳", label: "Billing & Plans",    path: "/settings?tab=billing", keywords: "upgrade pro team trial license" },
  { id: "nav-permissions",  icon: "🔐", label: "Permissions",        path: "/permissions",keywords: "access data permissions" },
];

// ── Fuzzy match ─────────────────────────────────────────────────────────────

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return true;
  // character-by-character subsequence match
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { projects, activeProjectId, setActivePipelineTab } = useProjectStore();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Build full item list ─────────────────────────────────────────────────

  const allItems = useCallback((): PaletteItem[] => {
    const items: PaletteItem[] = [];

    // Projects
    projects.forEach((p) => {
      items.push({
        id: `project-${p.id}`,
        icon: "📁",
        label: p.name,
        sublabel: `Project • ${p.stepStatus.define === "complete" ? "Active" : "New"}`,
        keywords: p.name,
        category: "project",
        onSelect: () => {
          useProjectStore.getState().setActiveProject(p.id);
          navigate("/pipeline");
        },
      });
    });

    // Pipeline tabs (only when a project is open)
    if (activeProjectId) {
      PIPELINE_STEPS.forEach(({ key, label, icon }) => {
        items.push({
          id: `pipeline-${key}`,
          icon,
          label: `Go to ${label}`,
          sublabel: "Pipeline step",
          keywords: label + " pipeline step tab",
          category: "pipeline",
          onSelect: () => {
            setActivePipelineTab(key);
            navigate("/pipeline");
          },
        });
      });
    }

    // Navigation
    NAV_ITEMS.forEach(({ id, icon, label, path, keywords }) => {
      items.push({
        id,
        icon,
        label,
        sublabel: "Navigate",
        keywords,
        category: "navigation",
        onSelect: () => navigate(path),
      });
    });

    // Quick actions
    items.push(
      {
        id: "action-new-project",
        icon: "✨",
        label: "Create New Project",
        sublabel: "Action",
        keywords: "new project create add",
        category: "action",
        onSelect: () => navigate("/"),
      },
      {
        id: "action-trial",
        icon: "🎁",
        label: "Start Free Trial",
        sublabel: "Action • 14 days Pro free",
        keywords: "trial pro free upgrade",
        category: "action",
        onSelect: () => navigate("/settings?tab=billing"),
      },
      {
        id: "action-ai",
        icon: "🤖",
        label: "Open AI Assistant",
        sublabel: "Action",
        keywords: "ai assistant chat gpt",
        category: "action",
        onSelect: () => {
          // Dispatch a custom event that App.tsx listens to
          window.dispatchEvent(new CustomEvent("dataflow:toggle-ai"));
        },
      },
    );

    return items;
  }, [projects, activeProjectId, navigate, setActivePipelineTab]);

  // ── Filtered results ─────────────────────────────────────────────────────

  const results = query.trim()
    ? allItems().filter((item) =>
        fuzzyMatch(query, item.label + " " + (item.keywords ?? "") + " " + (item.sublabel ?? ""))
      )
    : allItems().slice(0, 12); // show recent / top 12 when empty

  // ── Keyboard navigation ──────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIdx(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    // Scroll selected item into view
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[selectedIdx];
      if (item) selectItem(item);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const selectItem = (item: PaletteItem) => {
    trackEvent(Events.COMMAND_PALETTE_ACTION, { action: item.id });
    item.onSelect();
    onClose();
  };

  // ── Category label ───────────────────────────────────────────────────────

  const CATEGORY_LABELS: Record<PaletteItem["category"], string> = {
    project: "Projects",
    pipeline: "Pipeline",
    navigation: "Navigate",
    action: "Quick Actions",
  };

  // Group results by category (preserve insertion order)
  const grouped: { category: PaletteItem["category"]; items: PaletteItem[] }[] = [];
  const seen = new Set<string>();
  results.forEach((item) => {
    if (!seen.has(item.category)) {
      seen.add(item.category);
      grouped.push({ category: item.category, items: [] });
    }
    grouped[grouped.length - 1].items.push(item);
    // fix grouping when items are reordered mid-loop
    const grp = grouped.find((g) => g.category === item.category);
    if (grp && grp !== grouped[grouped.length - 1]) {
      grp.items.push(item);
      grouped[grouped.length - 1].items.pop();
    }
  });

  if (!open) return null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 80,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 560, maxWidth: "90vw",
          background: "white", borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          overflow: "hidden",
          border: "0.5px solid #e8e6e0",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKey}
      >
        {/* Search input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "14px 16px", borderBottom: "0.5px solid #f0ede8",
        }}>
          <span style={{ fontSize: 16, color: "#b0aea6" }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tabs, actions…"
            style={{
              border: "none", outline: "none", fontSize: 14,
              flex: 1, background: "transparent", padding: 0,
              boxShadow: "none",
            }}
          />
          <kbd style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 4,
            background: "#f0ede8", color: "#73726c",
            border: "0.5px solid #d0cec6", fontFamily: "inherit",
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{ maxHeight: 420, overflowY: "auto", padding: "8px 0" }}
        >
          {results.length === 0 ? (
            <div style={{
              padding: "32px 16px", textAlign: "center",
              fontSize: 13, color: "#b0aea6",
            }}>
              No results for <strong>"{query}"</strong>
            </div>
          ) : (
            (() => {
              // Re-group properly for rendering
              const renderGroups: { category: string; items: (PaletteItem & { globalIdx: number })[] }[] = [];
              let idx = 0;
              const categoryOrder: string[] = [];
              const catMap: Record<string, (PaletteItem & { globalIdx: number })[]> = {};
              results.forEach((item) => {
                if (!catMap[item.category]) {
                  catMap[item.category] = [];
                  categoryOrder.push(item.category);
                }
                catMap[item.category].push({ ...item, globalIdx: idx++ });
              });
              categoryOrder.forEach((cat) => {
                renderGroups.push({ category: cat, items: catMap[cat] });
              });

              return renderGroups.map(({ category, items: groupItems }) => (
                <div key={category}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
                    color: "#b0aea6", textTransform: "uppercase",
                    padding: "8px 16px 4px",
                  }}>
                    {CATEGORY_LABELS[category as PaletteItem["category"]] ?? category}
                  </div>
                  {groupItems.map((item) => {
                    const isSelected = item.globalIdx === selectedIdx;
                    return (
                      <div
                        key={item.id}
                        onClick={() => selectItem(item)}
                        onMouseEnter={() => setSelectedIdx(item.globalIdx)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "9px 16px", cursor: "pointer",
                          background: isSelected ? "#f0ede8" : "transparent",
                          transition: "background 0.08s",
                        }}
                      >
                        <span style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: isSelected ? "white" : "#f5f5f4",
                          display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 16, flexShrink: 0,
                          border: "0.5px solid #e8e6e0",
                        }}>
                          {item.icon}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#1a1a18" }}>
                            {item.label}
                          </div>
                          {item.sublabel && (
                            <div style={{ fontSize: 11, color: "#b0aea6", marginTop: 1 }}>
                              {item.sublabel}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <kbd style={{
                            fontSize: 10, padding: "2px 6px", borderRadius: 4,
                            background: "#e8e6e0", color: "#73726c",
                            border: "0.5px solid #d0cec6", fontFamily: "inherit",
                          }}>↵</kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          borderTop: "0.5px solid #f0ede8",
          padding: "8px 16px",
          display: "flex", gap: 16, alignItems: "center",
        }}>
          {[["↑↓", "Navigate"], ["↵", "Open"], ["ESC", "Close"]].map(([key, hint]) => (
            <span key={key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#b0aea6" }}>
              <kbd style={{
                padding: "1px 5px", borderRadius: 3, background: "#f5f5f4",
                border: "0.5px solid #e8e6e0", fontFamily: "inherit",
              }}>{key}</kbd>
              {hint}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
