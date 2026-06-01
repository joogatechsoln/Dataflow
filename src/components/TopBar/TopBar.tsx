/**
 * TopBar.tsx — DataFlow Suite (updated for Phase 7)
 * Adds:
 *   - 🔍 Search button opens CommandPalette via onOpenPalette callback
 *   - 🔔 Notifications button shows unread badge + opens NotificationsPanel
 *   - Ctrl+K hint in search button tooltip
 * All Phase 6 behaviour unchanged.
 */

import { useProjectStore, PipelineStep } from "../../store/projectStore";
import { useNavigate } from "react-router-dom";
import { useNotifStore } from "../../store/notifStore";
import TrialBanner from "./TrialBanner";

const TABS: { key: PipelineStep; label: string }[] = [
  { key: "define",     label: "1. Define"    },
  { key: "collect",   label: "2. Collect"   },
  { key: "clean",     label: "3. Clean"     },
  { key: "analyze",   label: "4. Analyze"   },
  { key: "visualize", label: "5. Visualize" },
  { key: "report",    label: "6. Report"    },
];

interface TopBarProps {
  onToggleAI: () => void;
  aiOpen: boolean;
  /** Phase 7: open command palette */
  onOpenPalette?: () => void;
  /** Phase 7: toggle notifications panel */
  onToggleNotifications?: () => void;
  notifsOpen?: boolean;
}

export default function TopBar({ onToggleAI, aiOpen, onOpenPalette, onToggleNotifications, notifsOpen }: TopBarProps) {
  const { activePipelineTab, setActivePipelineTab, activeProjectId, projects } = useProjectStore();
  const navigate = useNavigate();
  const unreadCount = useNotifStore((s) => s.unreadCount);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const handleTab = (key: PipelineStep) => {
    setActivePipelineTab(key);
    navigate("/pipeline");
  };

  return (
    <div style={{
      height: 48, borderBottom: "0.5px solid #e8e6e0",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px", background: "white", flexShrink: 0, gap: 10,
    }}>
      {/* Pipeline tabs */}
      <div style={{ display: "flex", gap: 2, alignItems: "center", flexShrink: 0 }}>
        {activeProject && (
          <span style={{ fontSize: 12, color: "#b0aea6", marginRight: 10, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeProject.name}
          </span>
        )}
        {TABS.map(({ key, label }) => {
          const active = activePipelineTab === key;
          const status = activeProject?.stepStatus[key];
          return (
            <button key={key} onClick={() => handleTab(key)}
              style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 12,
                cursor: "pointer", border: "0.5px solid transparent",
                background: active ? "#534AB7" : "transparent",
                color: active ? "white" : status === "complete" ? "#1D9E75" : "#73726c",
                fontWeight: active ? 500 : 400,
                transition: "all 0.12s",
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "#f0ede8"; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              {status === "complete" && !active ? "✓ " : ""}{label}
            </button>
          );
        })}
      </div>

      {/* Trial banner */}
      <TrialBanner />

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

        {/* Search / Command Palette — Phase 7 */}
        <button
          className="btn btn-ghost"
          style={{
            padding: "5px 10px", fontSize: 12, display: "flex",
            alignItems: "center", gap: 6, color: "#73726c",
          }}
          onClick={onOpenPalette}
          title="Open command palette (Ctrl+K)"
        >
          🔍
          <span style={{
            fontSize: 10, color: "#b0aea6",
            background: "#f0ede8", borderRadius: 4,
            padding: "1px 5px", fontWeight: 500,
            border: "0.5px solid #d0cec6",
          }}>
            ⌃K
          </span>
        </button>

        {/* Notifications bell — Phase 7 */}
        <button
          className="btn btn-ghost"
          style={{
            padding: "5px 8px", fontSize: 16, position: "relative",
            background: notifsOpen ? "#f0ede8" : undefined,
          }}
          onClick={onToggleNotifications}
          title="Notifications"
        >
          🔔
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 2, right: 2,
              width: 14, height: 14, borderRadius: "50%",
              background: "#E24B4A", color: "white",
              fontSize: 8, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1.5px solid white",
            }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* AI Assistant toggle */}
        <button onClick={onToggleAI}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 8,
            background: aiOpen ? "#534AB7" : "#EEEDFE",
            color: aiOpen ? "white" : "#534AB7",
            border: "0.5px solid #AFA9EC", fontSize: 12,
            fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
          }}>
          ✨ AI Assistant
        </button>
      </div>
    </div>
  );
}
