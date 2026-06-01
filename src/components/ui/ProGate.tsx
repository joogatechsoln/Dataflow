/**
 * ProGate.tsx — DataFlow Suite Phase 6
 * Gate wrapper for Pro and Team features.
 * Shows a lock overlay with upgrade CTA when the user lacks the required plan.
 *
 * Usage:
 *   <ProGate feature="PowerPoint export">
 *     <MyProComponent />
 *   </ProGate>
 *
 *   <ProGate require="team" feature="Admin dashboard">
 *     <AdminPanel />
 *   </ProGate>
 */

import React from "react";
import { useLicense } from "../../lib/useLicense";
import { useNavigate } from "react-router-dom";

interface ProGateProps {
  /** Minimum plan required. Default: "pro" */
  require?: "pro" | "team";
  /** Human-readable feature name shown in the lock overlay */
  feature?: string;
  /** If true, renders children inline with a subtle blur — no full overlay */
  inline?: boolean;
  children: React.ReactNode;
}

export default function ProGate({
  require = "pro",
  feature = "This feature",
  inline = false,
  children,
}: ProGateProps) {
  const { hasProAccess, hasTeamAccess } = useLicense();
  const navigate = useNavigate();

  const allowed = require === "team" ? hasTeamAccess : hasProAccess;

  if (allowed) return <>{children}</>;

  if (inline) {
    return (
      <span
        style={{ position: "relative", display: "inline-block", cursor: "pointer" }}
        onClick={() => navigate("/settings?tab=billing")}
        title={`Upgrade to ${require === "team" ? "Team" : "Pro"} to unlock ${feature}`}
      >
        <span style={{ filter: "blur(3px)", pointerEvents: "none", userSelect: "none" }}>
          {children}
        </span>
        <span style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 12,
        }}>
          🔒
        </span>
      </span>
    );
  }

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 10 }}>
      {/* Blurred background preview */}
      <div style={{ filter: "blur(4px)", pointerEvents: "none", userSelect: "none", opacity: 0.5 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(2px)",
        borderRadius: 10,
        gap: 12,
        padding: 24,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1916" }}>
          {feature} is a {require === "team" ? "Team" : "Pro"} feature
        </div>
        <div style={{ fontSize: 12, color: "#73726c", maxWidth: 280 }}>
          {require === "team"
            ? "Upgrade to a Team plan to collaborate with others and unlock admin tools."
            : "Upgrade to Pro for advanced exports, AI reports, more chart types and no limits."}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12, padding: "8px 18px" }}
            onClick={() => navigate("/settings?tab=billing")}
          >
            {require === "team" ? "Upgrade to Team →" : "Upgrade to Pro →"}
          </button>
          {require === "pro" && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "8px 14px" }}
              onClick={() => navigate("/settings?tab=billing")}
            >
              Start Free Trial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small inline badge used next to menu items / buttons ───────────────────

export function ProBadge({ plan = "Pro" }: { plan?: "Pro" | "Team" }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: "0.03em",
      padding: "2px 5px", borderRadius: 4,
      background: plan === "Team" ? "#e6f7f1" : "#EEEDFE",
      color: plan === "Team" ? "#1D9E75" : "#534AB7",
      marginLeft: 5, verticalAlign: "middle",
    }}>
      {plan.toUpperCase()}
    </span>
  );
}
