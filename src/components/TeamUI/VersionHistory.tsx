/**
 * VersionHistory.tsx — DataFlow Suite Phase 4
 * Displays version history for the active project.
 * Shows a timeline of snapshots with who changed what,
 * a diff summary, and a one-click restore button.
 * Drop into src/components/TeamUI/
 */

import { useState, useEffect } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useTeamStore, canEdit } from "../../store/teamStore";
import { useAuthStore } from "../../store/authStore";
import { useCloudSync } from "../../lib/useCloudSync";
import type { DbProjectVersion } from "../../lib/supabase";

interface VersionHistoryProps {
  projectId: string;
  onClose: () => void;
}

export default function VersionHistory({ projectId, onClose }: VersionHistoryProps) {
  const { user } = useAuthStore();
  const { versionHistory } = useTeamStore();
  const { myRole, activeTeam } = useTeamStore();
  const { projects } = useProjectStore();
  const { loadVersionHistory, restoreVersion } = useCloudSync();

  const [selected, setSelected] = useState<DbProjectVersion | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const project = projects.find((p) => p.id === projectId);
  const isEditable = canEdit(myRole) || !activeTeam; // solo users can always restore

  useEffect(() => {
    loadVersionHistory(projectId);
  }, [projectId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRestore(version: DbProjectVersion) {
    if (!user) return;
    if (!window.confirm(`Restore project to the version from ${formatDate(version.created_at)}? Current state will be saved as a new version first.`)) return;
    setRestoring(true);
    try {
      await restoreVersion(projectId, version.snapshot, user.name);
      showToast("Project restored to this version.");
      onClose();
    } catch (err) {
      showToast("Restore failed: " + (err as Error).message);
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Version History</div>
            <div style={styles.subtitle}>{project?.name ?? "Project"} · {versionHistory.length} versions saved</div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          {/* Version list */}
          <div style={styles.list}>
            {versionHistory.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#9e9b94", fontSize: 13 }}>
                No versions saved yet.<br />
                <span style={{ fontSize: 11 }}>Versions are saved automatically when you push to cloud.</span>
              </div>
            ) : (
              versionHistory.map((v, i) => (
                <button
                  key={v.id}
                  style={{ ...styles.versionItem, ...(selected?.id === v.id ? styles.versionItemActive : {}) }}
                  onClick={() => setSelected(v)}
                >
                  {/* Timeline dot */}
                  <div style={styles.timelineDot}>
                    <div style={{ ...styles.dot, background: i === 0 ? "#534AB7" : "#e8e6e0", border: i === 0 ? "2px solid #534AB7" : "2px solid #c8c5be" }} />
                    {i < versionHistory.length - 1 && <div style={styles.timelineLine} />}
                  </div>

                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1917" }}>
                        {v.change_summary || "Saved"}
                      </span>
                      {i === 0 && <span style={styles.latestBadge}>Latest</span>}
                    </div>
                    <div style={{ fontSize: 11, color: "#73726c", marginTop: 2 }}>
                      {v.changer_name ?? "Unknown"} · {formatDate(v.created_at)}
                    </div>
                  </div>

                  <span style={{ fontSize: 18, color: "#c8c5be" }}>›</span>
                </button>
              ))
            )}
          </div>

          {/* Detail pane */}
          <div style={styles.detail}>
            {!selected ? (
              <div style={{ padding: 24, color: "#9e9b94", fontSize: 13, textAlign: "center" }}>
                Select a version to preview
              </div>
            ) : (
              <div style={{ padding: 20 }}>
                <div style={styles.detailTitle}>{selected.change_summary || "Saved version"}</div>
                <div style={{ fontSize: 11, color: "#73726c", marginBottom: 16 }}>
                  {selected.changer_name ?? "Unknown user"} · {formatDate(selected.created_at)}
                </div>

                {/* Snapshot preview */}
                <div style={styles.sectionLabel}>Snapshot Preview</div>
                <SnapshotPreview snapshot={selected.snapshot} />

                {/* Diff with current */}
                <div style={{ ...styles.sectionLabel, marginTop: 16 }}>Changes vs Current</div>
                <DiffView current={project as Record<string, unknown> | undefined} snapshot={selected.snapshot} />

                {/* Restore */}
                {isEditable && (
                  <button
                    style={{ ...styles.restoreBtn, opacity: restoring ? 0.6 : 1, marginTop: 20 }}
                    onClick={() => handleRestore(selected)}
                    disabled={restoring}
                  >
                    {restoring ? "Restoring…" : "↩ Restore this version"}
                  </button>
                )}
                {!isEditable && (
                  <div style={{ fontSize: 11, color: "#73726c", marginTop: 12 }}>
                    Viewers cannot restore versions. Ask an Owner or Editor.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {toast && <div style={styles.toast}>{toast}</div>}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function SnapshotPreview({ snapshot }: { snapshot: Record<string, unknown> }) {
  const snap = snapshot as { name?: string; description?: string; problemStatement?: string; stepStatus?: Record<string, string> };
  return (
    <div style={{ background: "#f5f3ef", borderRadius: 8, padding: 12, fontSize: 12 }}>
      {snap.name && <div><strong>Name:</strong> {snap.name}</div>}
      {snap.description && <div style={{ marginTop: 4 }}><strong>Description:</strong> {snap.description}</div>}
      {snap.problemStatement && (
        <div style={{ marginTop: 4 }}>
          <strong>Problem Statement:</strong>{" "}
          <span style={{ color: "#73726c" }}>{String(snap.problemStatement).slice(0, 120)}{String(snap.problemStatement).length > 120 ? "…" : ""}</span>
        </div>
      )}
      {snap.stepStatus && (
        <div style={{ marginTop: 8 }}>
          <strong>Pipeline Progress:</strong>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {Object.entries(snap.stepStatus).map(([step, status]) => (
              <span key={step} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: status === "complete" ? "#d1fae5" : status === "active" ? "#ede9fe" : "#f0ede8", color: status === "complete" ? "#065f46" : status === "active" ? "#4c1d95" : "#73726c" }}>
                {step}: {status}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiffView({ current, snapshot }: { current: Record<string, unknown> | undefined; snapshot: Record<string, unknown> }) {
  if (!current) return <div style={{ fontSize: 12, color: "#9e9b94" }}>No current data to compare.</div>;

  const changes: Array<{ field: string; from: string; to: string }> = [];

  const fields: Array<keyof typeof current> = ["name", "description", "problemStatement", "goals", "successCriteria"];
  for (const field of fields) {
    const cur = String(current[field] ?? "");
    const snap = String(snapshot[field] ?? "");
    if (cur !== snap) {
      changes.push({ field: String(field), from: snap.slice(0, 80), to: cur.slice(0, 80) });
    }
  }

  if (changes.length === 0) {
    return <div style={{ fontSize: 12, color: "#1D9E75" }}>✓ No differences in key fields between this version and current.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {changes.map((c) => (
        <div key={c.field} style={{ borderRadius: 6, overflow: "hidden", border: "0.5px solid #e8e6e0" }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, padding: "4px 8px", background: "#f5f3ef", color: "#73726c" }}>{c.field}</div>
          <div style={{ padding: "6px 8px", background: "#fdf2f2", fontSize: 11, color: "#991b1b" }}>− {c.from || "(empty)"}</div>
          <div style={{ padding: "6px 8px", background: "#f0fdf4", fontSize: 11, color: "#065f46" }}>+ {c.to || "(empty)"}</div>
        </div>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" },
  panel: { background: "white", borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", width: "min(860px,95vw)", height: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { padding: "18px 24px", borderBottom: "0.5px solid #e8e6e0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: 16, fontWeight: 700, color: "#1a1917" },
  subtitle: { fontSize: 12, color: "#73726c", marginTop: 2 },
  closeBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#73726c", lineHeight: 1 },
  body: { flex: 1, display: "flex", overflow: "hidden" },
  list: { width: 280, borderRight: "0.5px solid #e8e6e0", overflowY: "auto", flexShrink: 0 },
  versionItem: { width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: "none", border: "none", borderBottom: "0.5px solid #f0ede8", cursor: "pointer", textAlign: "left" },
  versionItemActive: { background: "#f5f3ef" },
  timelineDot: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3, flexShrink: 0 },
  dot: { width: 10, height: 10, borderRadius: "50%" },
  timelineLine: { width: 2, flex: 1, minHeight: 24, background: "#e8e6e0", margin: "3px 0" },
  latestBadge: { fontSize: 9, fontWeight: 600, background: "#ede9fe", color: "#534AB7", borderRadius: 4, padding: "2px 5px" },
  detail: { flex: 1, overflowY: "auto" },
  detailTitle: { fontSize: 14, fontWeight: 700, color: "#1a1917", marginBottom: 2 },
  sectionLabel: { fontSize: 10, fontWeight: 600, color: "#9e9b94", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 },
  restoreBtn: { width: "100%", padding: "10px", background: "#534AB7", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  toast: { position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "#1a1917", color: "white", padding: "8px 16px", borderRadius: 8, fontSize: 12, zIndex: 10 },
};
