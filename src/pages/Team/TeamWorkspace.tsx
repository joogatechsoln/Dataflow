/**
 * TeamWorkspace.tsx — DataFlow Suite Phase 4
 * Full team management UI:
 *   • Create / switch team workspace
 *   • Invite members by email, set roles
 *   • Member list with role editor
 *   • Shared projects list
 *   • Cloud sync indicator
 * Drop into src/pages/Team/
 */

import { useState, useEffect } from "react";
import { useTeamStore, canAdmin, canEdit, roleLabel, roleColor } from "../../store/teamStore";
import { useAuthStore } from "../../store/authStore";
import { useProjectStore } from "../../store/projectStore";
import { useCloudSync } from "../../lib/useCloudSync";
import {
  createTeam,
  getTeamsForUser,
  getTeamMembers,
  updateMemberRole,
  removeMember,
  createInvite,
  getPendingInvites,
  revokeInvite,
  getTeamUsageStats,
} from "../../lib/supabase";
import type { TeamRole, DbTeam } from "../../store/teamStore";

export default function TeamWorkspace() {
  const { user } = useAuthStore();
  const {
    activeTeam, myTeams, members, pendingInvites, myRole, cloudProjects, sync,
    setActiveTeam, setMyTeams, setMembers, setPendingInvites, setMyRole,
  } = useTeamStore();
  const { cloudProjects: syncedProjects } = useTeamStore();
  const { pullProjects, syncProject } = useCloudSync();
  const { projects } = useProjectStore();

  const [tab, setTab] = useState<"overview" | "members" | "projects" | "settings">("overview");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("editor");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stats, setStats] = useState({ memberCount: 0, projectCount: 0 });

  // Load teams on mount
  useEffect(() => {
    if (!user) return;
    getTeamsForUser(user.id).then(setMyTeams).catch(console.error);
  }, [user]);

  // Load team data when active team changes
  useEffect(() => {
    if (!activeTeam || !user) return;

    Promise.all([
      getTeamMembers(activeTeam.id),
      getPendingInvites(activeTeam.id),
      getTeamUsageStats(activeTeam.id),
    ]).then(([mems, invites, s]) => {
      setMembers(mems);
      setPendingInvites(invites);
      setStats(s);
      const me = mems.find((m) => m.user_id === user.id);
      setMyRole(me?.role ?? "viewer");
    });

    pullProjects();
  }, [activeTeam]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCreateTeam() {
    if (!user || !newTeamName.trim()) return;
    setLoading(true);
    try {
      const team = await createTeam(newTeamName.trim(), user.id);
      setMyTeams([...myTeams, team]);
      setActiveTeam(team);
      setMyRole("owner");
      setCreatingTeam(false);
      setNewTeamName("");
      showToast("Team created!");
    } catch (err) {
      showToast("Failed to create team: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!activeTeam || !inviteEmail.trim()) return;
    setLoading(true);
    try {
      const invite = await createInvite(activeTeam.id, inviteEmail.trim(), inviteRole);
      setPendingInvites([...pendingInvites, invite]);
      setInviteEmail("");
      showToast(`Invite sent to ${invite.email}`);
    } catch (err) {
      showToast("Failed to send invite: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, role: TeamRole) {
    if (!activeTeam) return;
    await updateMemberRole(activeTeam.id, userId, role);
    useTeamStore.getState().updateMemberRole(userId, role);
    showToast("Role updated.");
  }

  async function handleRemoveMember(userId: string) {
    if (!activeTeam || !window.confirm("Remove this member?")) return;
    await removeMember(activeTeam.id, userId);
    useTeamStore.getState().removeMember(userId);
    showToast("Member removed.");
  }

  async function handleRevokeInvite(inviteId: string) {
    await revokeInvite(inviteId);
    useTeamStore.getState().removePendingInvite(inviteId);
    showToast("Invite revoked.");
  }

  // ─── No team yet ─────────────────────────────────────────────────────────
  if (!activeTeam && !creatingTeam) {
    return (
      <div style={{ padding: 32, overflowY: "auto", height: "100%" }}>
        <h2 style={t.pageTitle}>Team Workspace</h2>
        <p style={t.muted}>Collaborate with your team in a shared workspace. All members see the same projects.</p>

        {myTeams.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={t.sectionLabel}>Your Teams</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480 }}>
              {myTeams.map((team) => (
                <button
                  key={team.id}
                  style={t.teamCard}
                  onClick={() => setActiveTeam(team)}
                >
                  <TeamAvatar name={team.name} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{team.name}</div>
                    <div style={{ fontSize: 11, color: "#73726c" }}>Click to open workspace</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 18, color: "#73726c" }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button style={t.btnPrimary} onClick={() => setCreatingTeam(true)}>
          + Create New Team
        </button>

        <div style={{ marginTop: 16, padding: "16px", background: "#f5f3ef", borderRadius: 10, maxWidth: 480 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>🔗 Join via invite link?</div>
          <div style={{ fontSize: 11, color: "#73726c" }}>
            Ask your team owner to send you an invite link. You'll be added automatically when you open it.
          </div>
        </div>
      </div>
    );
  }

  // ─── Create team form ─────────────────────────────────────────────────────
  if (creatingTeam) {
    return (
      <div style={{ padding: 32, overflowY: "auto", height: "100%" }}>
        <button style={t.btnGhost} onClick={() => setCreatingTeam(false)}>← Back</button>
        <h2 style={{ ...t.pageTitle, marginTop: 16 }}>Create a Team</h2>
        <p style={t.muted}>You'll be the Owner. You can invite others after setup.</p>
        <div style={{ maxWidth: 400 }}>
          <label style={t.label}>Team Name</label>
          <input
            style={t.input}
            placeholder="e.g. Marketing Analytics"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
          />
          <button
            style={{ ...t.btnPrimary, marginTop: 14, opacity: loading ? 0.6 : 1 }}
            onClick={handleCreateTeam}
            disabled={loading || !newTeamName.trim()}
          >
            {loading ? "Creating…" : "Create Team"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Main workspace view ──────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={t.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TeamAvatar name={activeTeam!.name} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{activeTeam!.name}</div>
            <div style={{ fontSize: 11, color: "#73726c" }}>
              {stats.memberCount} member{stats.memberCount !== 1 ? "s" : ""} · {stats.projectCount} project{stats.projectCount !== 1 ? "s" : ""}
              {myRole && <span style={{ ...t.roleBadge, color: roleColor(myRole), borderColor: roleColor(myRole) }}>{roleLabel(myRole)}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SyncIndicator sync={sync} />
          <button style={t.btnGhost} onClick={() => setActiveTeam(null)}>Switch Team</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={t.tabBar}>
        {(["overview", "members", "projects", "settings"] as const).map((tb) => (
          <button
            key={tb}
            style={{ ...t.tabBtn, ...(tab === tb ? t.tabBtnActive : {}) }}
            onClick={() => setTab(tb)}
          >
            {tb.charAt(0).toUpperCase() + tb.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {tab === "overview" && <OverviewTab stats={stats} members={members} syncProject={syncProject} projects={projects} />}
        {tab === "members" && (
          <MembersTab
            members={members}
            pendingInvites={pendingInvites}
            myRole={myRole}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
            onInvite={handleInvite}
            onRoleChange={handleRoleChange}
            onRemove={handleRemoveMember}
            onRevokeInvite={handleRevokeInvite}
            loading={loading}
          />
        )}
        {tab === "projects" && (
          <ProjectsTab
            cloudProjects={syncedProjects}
            onSync={() => pullProjects()}
          />
        )}
        {tab === "settings" && (
          <SettingsTab team={activeTeam!} myRole={myRole} onLeave={() => setActiveTeam(null)} />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={t.toast}>{toast}</div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TeamAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#534AB7,#7c75d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

function SyncIndicator({ sync }: { sync: { syncing: boolean; lastSynced: string | null; error: string | null } }) {
  if (sync.syncing) return <span style={{ fontSize: 11, color: "#73726c" }}>⟳ Syncing…</span>;
  if (sync.error) return <span style={{ fontSize: 11, color: "#E24B4A" }}>⚠ Sync error</span>;
  if (sync.lastSynced) {
    const d = new Date(sync.lastSynced);
    return <span style={{ fontSize: 11, color: "#1D9E75" }}>✓ Synced {d.toLocaleTimeString()}</span>;
  }
  return <span style={{ fontSize: 11, color: "#9e9b94" }}>Not synced</span>;
}

function OverviewTab({ stats, members, syncProject, projects }: { stats: { memberCount: number; projectCount: number }; members: ReturnType<typeof useTeamStore.getState>["members"]; syncProject: (id: string) => Promise<void>; projects: ReturnType<typeof useProjectStore.getState>["projects"] }) {
  return (
    <div>
      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Members", value: stats.memberCount, icon: "👥" },
          { label: "Projects", value: stats.projectCount, icon: "📁" },
          { label: "Role", value: "Owner", icon: "🔑" },
        ].map((s) => (
          <div key={s.label} style={{ padding: "14px 16px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 10 }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1917" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#73726c" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent members */}
      <div style={{ marginBottom: 24 }}>
        <div style={t.sectionLabel}>Recent Members</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {members.slice(0, 4).map((m) => (
            <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 8 }}>
              <MemberAvatar name={m.name ?? m.email ?? "?"} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name ?? "Unknown"}</div>
                <div style={{ fontSize: 11, color: "#73726c" }}>{m.email}</div>
              </div>
              <span style={{ ...t.roleBadge, color: roleColor(m.role), borderColor: roleColor(m.role) }}>{roleLabel(m.role)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick sync */}
      <div style={t.sectionLabel}>Sync Local Projects to Cloud</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {projects.slice(0, 5).map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>📁 {p.name}</span>
            <button style={{ ...t.btnSecondary, fontSize: 11, padding: "4px 10px" }} onClick={() => syncProject(p.id)}>
              Push to cloud ↑
            </button>
          </div>
        ))}
        {projects.length === 0 && <div style={{ fontSize: 12, color: "#9e9b94" }}>No local projects yet.</div>}
      </div>
    </div>
  );
}

function MembersTab({
  members, pendingInvites, myRole, inviteEmail, setInviteEmail, inviteRole, setInviteRole,
  onInvite, onRoleChange, onRemove, onRevokeInvite, loading,
}: {
  members: ReturnType<typeof useTeamStore.getState>["members"];
  pendingInvites: ReturnType<typeof useTeamStore.getState>["pendingInvites"];
  myRole: TeamRole | null;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: TeamRole;
  setInviteRole: (v: TeamRole) => void;
  onInvite: () => void;
  onRoleChange: (uid: string, role: TeamRole) => void;
  onRemove: (uid: string) => void;
  onRevokeInvite: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div>
      {/* Invite form */}
      {canAdmin(myRole) && (
        <div style={{ marginBottom: 24, padding: "16px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 10 }}>
          <div style={t.sectionLabel}>Invite Member</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              style={{ ...t.input, flex: 2, minWidth: 200 }}
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onInvite()}
            />
            <select style={{ ...t.input, flex: 1, minWidth: 110 }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamRole)}>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="owner">Owner</option>
            </select>
            <button style={{ ...t.btnPrimary, whiteSpace: "nowrap" as const, opacity: loading ? 0.6 : 1 }} onClick={onInvite} disabled={loading}>
              {loading ? "Sending…" : "Send Invite"}
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#73726c", marginTop: 6 }}>
            A one-time invite link will be generated. Valid for 7 days.
          </div>
        </div>
      )}

      {/* Members list */}
      <div style={t.sectionLabel}>Members ({members.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
        {members.map((m) => (
          <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 8 }}>
            <MemberAvatar name={m.name ?? m.email ?? "?"} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name ?? "Unknown"}</div>
              <div style={{ fontSize: 11, color: "#73726c" }}>{m.email}</div>
            </div>
            {canAdmin(myRole) && m.role !== "owner" ? (
              <select
                style={{ fontSize: 11, border: "1px solid #e8e6e0", borderRadius: 6, padding: "3px 6px", background: "white", cursor: "pointer" }}
                value={m.role}
                onChange={(e) => onRoleChange(m.user_id, e.target.value as TeamRole)}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                <option value="owner">Owner</option>
              </select>
            ) : (
              <span style={{ ...t.roleBadge, color: roleColor(m.role), borderColor: roleColor(m.role) }}>{roleLabel(m.role)}</span>
            )}
            {canAdmin(myRole) && m.role !== "owner" && (
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "#E24B4A", fontSize: 12 }} onClick={() => onRemove(m.user_id)}>Remove</button>
            )}
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <>
          <div style={t.sectionLabel}>Pending Invites ({pendingInvites.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pendingInvites.map((inv) => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fffbf0", border: "0.5px solid #f0e0b0", borderRadius: 8 }}>
                <span style={{ fontSize: 16 }}>📬</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{inv.email}</div>
                  <div style={{ fontSize: 11, color: "#73726c" }}>Invited as {roleLabel(inv.role)} · expires {new Date(inv.expires_at).toLocaleDateString()}</div>
                </div>
                {canAdmin(myRole) && (
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "#E24B4A", fontSize: 11 }} onClick={() => onRevokeInvite(inv.id)}>Revoke</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProjectsTab({ cloudProjects, onSync }: { cloudProjects: ReturnType<typeof useTeamStore.getState>["cloudProjects"]; onSync: () => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={t.sectionLabel}>Shared Projects ({cloudProjects.length})</div>
        <button style={t.btnSecondary} onClick={onSync}>↓ Pull from cloud</button>
      </div>
      {cloudProjects.length === 0 ? (
        <div style={{ padding: 24, textAlign: "center", color: "#9e9b94", fontSize: 13 }}>
          No cloud projects yet. Push a local project to get started.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {cloudProjects.map((p) => (
            <div key={p.id} style={{ padding: "14px 16px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>📁 {p.name}</div>
                  <div style={{ fontSize: 11, color: "#73726c", marginTop: 2 }}>{p.description}</div>
                </div>
                <div style={{ fontSize: 11, color: "#9e9b94", textAlign: "right" as const }}>
                  Updated<br />{new Date(p.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ team, myRole, onLeave }: { team: DbTeam; myRole: TeamRole | null; onLeave: () => void }) {
  return (
    <div style={{ maxWidth: 480 }}>
      <div style={t.sectionLabel}>Team Info</div>
      <div style={{ padding: "14px 16px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 10, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{team.name}</div>
        <div style={{ fontSize: 11, color: "#73726c" }}>Team ID: {team.id}</div>
        <div style={{ fontSize: 11, color: "#73726c" }}>Created: {new Date(team.created_at).toLocaleDateString()}</div>
      </div>

      <div style={t.sectionLabel}>Danger Zone</div>
      <div style={{ padding: "14px 16px", background: "#fff6f6", border: "0.5px solid #fcc", borderRadius: 10 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#E24B4A", fontSize: 13, fontWeight: 500 }} onClick={onLeave}>
          {myRole === "owner" ? "Disband Team" : "Leave Team"}
        </button>
        <div style={{ fontSize: 11, color: "#73726c", marginTop: 4 }}>
          {myRole === "owner" ? "This will remove all members and delete the workspace." : "You'll lose access to all shared projects."}
        </div>
      </div>
    </div>
  );
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const colors = ["#534AB7", "#1D9E75", "#BA7517", "#E24B4A", "#0ea5e9"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ─── Style tokens ────────────────────────────────────────────────────────────

const t: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: "#1a1917" },
  muted: { fontSize: 13, color: "#73726c", margin: "0 0 20px" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9b94", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 },
  header: { padding: "16px 24px", borderBottom: "0.5px solid #e8e6e0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "white" },
  tabBar: { display: "flex", gap: 2, padding: "0 16px", borderBottom: "0.5px solid #e8e6e0", background: "white" },
  tabBtn: { padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#73726c" },
  tabBtnActive: { color: "#534AB7", borderBottom: "2px solid #534AB7" },
  teamCard: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 10, cursor: "pointer", textAlign: "left" },
  label: { display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5, color: "#3d3c38" },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #e8e6e0", borderRadius: 8, fontSize: 12, background: "#fafaf8", outline: "none", boxSizing: "border-box" },
  btnPrimary: { padding: "9px 16px", background: "#534AB7", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  btnSecondary: { padding: "7px 12px", background: "white", color: "#534AB7", border: "1px solid #534AB7", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer" },
  btnGhost: { padding: "7px 12px", background: "none", color: "#73726c", border: "1px solid #e8e6e0", borderRadius: 8, fontSize: 12, cursor: "pointer" },
  roleBadge: { fontSize: 10, fontWeight: 600, border: "1px solid", borderRadius: 4, padding: "2px 6px" },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1a1917", color: "white", padding: "10px 18px", borderRadius: 8, fontSize: 12, zIndex: 1000, pointerEvents: "none" },
};
