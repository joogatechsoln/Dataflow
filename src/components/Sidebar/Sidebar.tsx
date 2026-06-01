/**
 * Sidebar.tsx — DataFlow Suite (updated for Phase 4)
 * Adds Team Workspace and Admin Dashboard nav items.
 * Admin item only shown for team owners.
 */

import { useNavigate, useLocation } from "react-router-dom";
import { useProjectStore } from "../../store/projectStore";
import { useAuthStore } from "../../store/authStore";
import { useTeamStore, canAdmin } from "../../store/teamStore";

type NavItem = {
  path: string;
  icon: string;
  label: string;
  ownerOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { path: "/",            icon: "⊞",  label: "Dashboard"   },
  { path: "/pipeline",    icon: "⚡",  label: "Pipeline"    },
  { path: "/learn",       icon: "🎓",  label: "Learn"       },
  { path: "/marketplace", icon: "🧩",  label: "Marketplace" },
  { path: "/team",        icon: "👥",  label: "Team"        },
  { path: "/admin",       icon: "🛡️",  label: "Admin",  ownerOnly: true },
  { path: "/settings",    icon: "⚙️",  label: "Settings"    },
  { path: "/permissions", icon: "🔒",  label: "Permissions" },
];

const PIPELINE_STEPS = [
  { key: "define",     icon: "✏️",  label: "Define"    },
  { key: "collect",    icon: "📥",  label: "Collect"   },
  { key: "clean",      icon: "🧹",  label: "Clean"     },
  { key: "analyze",    icon: "🔍",  label: "Analyze"   },
  { key: "visualize",  icon: "📊",  label: "Visualize" },
  { key: "report",     icon: "📄",  label: "Report"    },
] as const;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, activeProjectId, activePipelineTab, setActivePipelineTab } = useProjectStore();
  const { user } = useAuthStore();
  const { myRole, activeTeam, sync } = useTeamStore();

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const isPipelinePage = location.pathname === "/pipeline";

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.ownerOnly) return canAdmin(myRole) && !!activeTeam;
    return true;
  });

  return (
    <div style={{
      width: 200,
      flexShrink: 0,
      background: "#fafaf8",
      borderRight: "0.5px solid #e8e6e0",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      overflow: "hidden",
    }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px 12px", borderBottom: "0.5px solid #e8e6e0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg,#534AB7,#7c75d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontSize: 14 }}>⚡</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1917" }}>DataFlow</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {visibleNav.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/" && location.pathname === "/projects");
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                width: "100%", padding: "8px 14px",
                background: isActive ? "#ede9fe" : "none",
                border: "none", cursor: "pointer",
                color: isActive ? "#534AB7" : "#3d3c38",
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                borderRadius: 0,
              }}
            >
              <span style={{ fontSize: 14, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              {item.label}
              {/* Cloud sync dot for Team */}
              {item.path === "/team" && activeTeam && (
                <span style={{
                  marginLeft: "auto",
                  width: 6, height: 6, borderRadius: "50%",
                  background: sync.syncing ? "#BA7517" : sync.error ? "#E24B4A" : "#1D9E75",
                }} />
              )}
            </button>
          );
        })}

        {/* Pipeline sub-steps (only when on pipeline page with active project) */}
        {isPipelinePage && activeProject && (
          <div style={{ marginTop: 4 }}>
            <div style={{ padding: "6px 14px 4px", fontSize: 10, fontWeight: 600, color: "#9e9b94", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pipeline
            </div>
            {PIPELINE_STEPS.map(({ key, icon, label }) => {
              const status = activeProject.stepStatus[key];
              const isActiveStep = activePipelineTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActivePipelineTab(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    width: "100%", padding: "6px 14px 6px 22px",
                    background: isActiveStep ? "#ede9fe" : "none",
                    border: "none", cursor: "pointer",
                    color: isActiveStep ? "#534AB7" : "#73726c",
                    fontSize: 11, fontWeight: isActiveStep ? 600 : 400,
                  }}
                >
                  <span style={{ fontSize: 11 }}>{icon}</span>
                  <span style={{ flex: 1, textAlign: "left" }}>{label}</span>
                  <StepDot status={status} />
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer — user + team info */}
      <div style={{ padding: "10px 14px", borderTop: "0.5px solid #e8e6e0" }}>
        {activeTeam && (
          <div style={{ fontSize: 10, color: "#73726c", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <span>👥</span> {activeTeam.name}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "#534AB7",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 9, fontWeight: 700,
          }}>
            {user?.avatarInitials ?? "?"}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#1a1917" }}>{user?.name ?? "User"}</div>
            <div style={{ fontSize: 10, color: "#9e9b94" }}>{user?.role ?? "solo"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDot({ status }: { status: "pending" | "active" | "complete" }) {
  const colors = { pending: "#e8e6e0", active: "#534AB7", complete: "#1D9E75" };
  return (
    <div style={{
      width: 6, height: 6, borderRadius: "50%",
      background: colors[status],
      flexShrink: 0,
    }} />
  );
}
