/**
 * AdminDashboard.tsx — DataFlow Suite Phase 4
 * Owner-only admin panel:
 *   • Team overview cards (members, projects, storage)
 *   • Member management (role changes, remove, invite)
 *   • Usage stats with simple bar chart
 *   • Billing / plan info
 * Drop into src/pages/Admin/
 */

import { useState, useEffect } from "react";
import { useTeamStore, canAdmin, roleLabel, roleColor } from "../../store/teamStore";
import { useAuthStore } from "../../store/authStore";
import {
  getTeamMembers,
  getPendingInvites,
  createInvite,
  updateMemberRole,
  removeMember,
  revokeInvite,
  getTeamUsageStats,
} from "../../lib/supabase";
import type { TeamRole, DbTeamMember, DbInvite } from "../../store/teamStore";

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const { activeTeam, myRole } = useTeamStore();

  const [members, setMembers] = useState<DbTeamMember[]>([]);
  const [invites, setInvites] = useState<DbInvite[]>([]);
  const [stats, setStats] = useState({ memberCount: 0, projectCount: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "members" | "billing">("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("editor");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!activeTeam) return;
    setLoading(true);
    Promise.all([
      getTeamMembers(activeTeam.id),
      getPendingInvites(activeTeam.id),
      getTeamUsageStats(activeTeam.id),
    ]).then(([mems, inv, s]) => {
      setMembers(mems);
      setInvites(inv);
      setStats(s);
    }).finally(() => setLoading(false));
  }, [activeTeam]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRoleChange(userId: string, role: TeamRole) {
    if (!activeTeam) return;
    try {
      await updateMemberRole(activeTeam.id, userId, role);
      setMembers((ms) => ms.map((m) => m.user_id === userId ? { ...m, role } : m));
      showToast("Role updated.");
    } catch (err) {
      showToast("Failed: " + (err as Error).message);
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!activeTeam || !window.confirm(`Remove ${name} from the team?`)) return;
    try {
      await removeMember(activeTeam.id, userId);
      setMembers((ms) => ms.filter((m) => m.user_id !== userId));
      setStats((s) => ({ ...s, memberCount: s.memberCount - 1 }));
      showToast(`${name} removed.`);
    } catch (err) {
      showToast("Failed: " + (err as Error).message);
    }
  }

  async function handleInvite() {
    if (!activeTeam || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const inv = await createInvite(activeTeam.id, inviteEmail.trim(), inviteRole);
      setInvites((ii) => [...ii, inv]);
      setInviteEmail("");
      showToast(`Invite sent to ${inv.email}`);
    } catch (err) {
      showToast("Failed: " + (err as Error).message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    await revokeInvite(inviteId);
    setInvites((ii) => ii.filter((i) => i.id !== inviteId));
    showToast("Invite revoked.");
  }

  // Guard — only owners see this
  if (!canAdmin(myRole)) {
    return (
      <div style={{ padding: 32 }}>
        <div style={s.emptyState}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Owner Access Required</div>
          <div style={{ fontSize: 12, color: "#73726c", marginTop: 4 }}>The Admin Dashboard is only accessible to team Owners.</div>
        </div>
      </div>
    );
  }

  if (!activeTeam) {
    return (
      <div style={{ padding: 32 }}>
        <div style={s.emptyState}>No active team. Go to Team Workspace to create or join one.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.pageTitle}>Admin Dashboard</div>
          <div style={s.muted}>{activeTeam.name} · Owner view</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 11, padding: "4px 10px", background: "#ede9fe", color: "#534AB7", borderRadius: 20, fontWeight: 600 }}>Team Plan</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={s.tabBar}>
        {(["overview", "members", "billing"] as const).map((tb) => (
          <button key={tb} style={{ ...s.tabBtn, ...(tab === tb ? s.tabBtnActive : {}) }} onClick={() => setTab(tb)}>
            {tb.charAt(0).toUpperCase() + tb.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {loading ? (
          <div style={s.emptyState}>Loading…</div>
        ) : (
          <>
            {tab === "overview" && <OverviewTab stats={stats} members={members} pendingInviteCount={invites.length} />}
            {tab === "members" && (
              <MembersTab
                members={members}
                invites={invites}
                currentUserId={user?.id ?? ""}
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                inviteRole={inviteRole}
                setInviteRole={setInviteRole}
                onInvite={handleInvite}
                onRoleChange={handleRoleChange}
                onRemove={handleRemove}
                onRevoke={handleRevoke}
                inviting={inviting}
              />
            )}
            {tab === "billing" && <BillingTab teamName={activeTeam.name} memberCount={stats.memberCount} />}
          </>
        )}
      </div>

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, members, pendingInviteCount }: { stats: { memberCount: number; projectCount: number }; members: DbTeamMember[]; pendingInviteCount: number }) {
  const roleBreakdown = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});

  const cards = [
    { label: "Total Members", value: stats.memberCount, icon: "👥", color: "#534AB7" },
    { label: "Cloud Projects", value: stats.projectCount, icon: "📁", color: "#1D9E75" },
    { label: "Pending Invites", value: pendingInviteCount, icon: "📬", color: "#BA7517" },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ padding: "16px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 12 }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "#73726c" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Role breakdown */}
      <div style={s.sectionLabel}>Role Distribution</div>
      <div style={{ background: "white", border: "0.5px solid #e8e6e0", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
        {Object.entries(roleBreakdown).map(([role, count]) => {
          const pct = stats.memberCount > 0 ? Math.round((count / stats.memberCount) * 100) : 0;
          return (
            <div key={role} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: roleColor(role as TeamRole) }}>{roleLabel(role as TeamRole)}</span>
                <span style={{ fontSize: 11, color: "#73726c" }}>{count} member{count !== 1 ? "s" : ""} ({pct}%)</span>
              </div>
              <div style={{ height: 6, background: "#f0ede8", borderRadius: 4 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: roleColor(role as TeamRole), borderRadius: 4, transition: "width 0.6s" }} />
              </div>
            </div>
          );
        })}
        {Object.keys(roleBreakdown).length === 0 && (
          <div style={{ fontSize: 12, color: "#9e9b94" }}>No members yet.</div>
        )}
      </div>

      {/* Recent members */}
      <div style={s.sectionLabel}>Team Members</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {members.slice(0, 6).map((m) => (
          <div key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "white", border: "0.5px solid #e8e6e0", borderRadius: 8 }}>
            <MemberAvatar name={m.name ?? m.email ?? "?"} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name ?? "Unknown"}</div>
              <div style={{ fontSize: 11, color: "#73726c" }}>{m.email}</div>
            </div>
            <span style={{ ...s.badge, color: roleColor(m.role), borderColor: roleColor(m.role) }}>{roleLabel(m.role)}</span>
            <div style={{ fontSize: 11, color: "#9e9b94" }}>Joined {new Date(m.joined_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Members tab ──────────────────────────────────────────────────────────────

function MembersTab({
  members, invites, currentUserId, inviteEmail, setInviteEmail, inviteRole, setInviteRole,
  onInvite, onRoleChange, onRemove, onRevoke, inviting,
}: {
  members: DbTeamMember[];
  invites: DbInvite[];
  currentUserId: string;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: TeamRole;
  setInviteRole: (v: TeamRole) => void;
  onInvite: () => void;
  onRoleChange: (uid: string, role: TeamRole) => void;
  onRemove: (uid: string, name: string) => void;
  onRevoke: (id: string) => void;
  inviting: boolean;
}) {
  return (
    <div>
      {/* Invite */}
      <div style={{ marginBottom: 24, padding: 16, background: "white", border: "0.5px solid #e8e6e0", borderRadius: 12 }}>
        <div style={s.sectionLabel}>Invite New Member</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input style={{ ...s.input, flex: 2, minWidth: 200 }} placeholder="email@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onInvite()} />
          <select style={{ ...s.input, flex: 1, minWidth: 110 }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as TeamRole)}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            <option value="owner">Owner</option>
          </select>
          <button style={{ ...s.btnPrimary, opacity: inviting ? 0.6 : 1 }} onClick={onInvite} disabled={inviting}>{inviting ? "Sending…" : "Send Invite"}</button>
        </div>
      </div>

      {/* Members table */}
      <div style={s.sectionLabel}>All Members ({members.length})</div>
      <div style={{ background: "white", border: "0.5px solid #e8e6e0", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f5f3ef" }}>
              <th style={s.th}>Member</th>
              <th style={s.th}>Role</th>
              <th style={s.th}>Joined</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.user_id} style={{ borderTop: i > 0 ? "0.5px solid #f0ede8" : "none" }}>
                <td style={s.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <MemberAvatar name={m.name ?? m.email ?? "?"} />
                    <div>
                      <div style={{ fontWeight: 500 }}>{m.name ?? "Unknown"}</div>
                      <div style={{ color: "#73726c", fontSize: 11 }}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td style={s.td}>
                  {m.user_id !== currentUserId ? (
                    <select style={{ fontSize: 11, border: "1px solid #e8e6e0", borderRadius: 6, padding: "3px 6px", background: "white" }} value={m.role} onChange={(e) => onRoleChange(m.user_id, e.target.value as TeamRole)}>
                      <option value="owner">Owner</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span style={{ ...s.badge, color: roleColor(m.role), borderColor: roleColor(m.role) }}>{roleLabel(m.role)} (you)</span>
                  )}
                </td>
                <td style={{ ...s.td, color: "#73726c" }}>{new Date(m.joined_at).toLocaleDateString()}</td>
                <td style={s.td}>
                  {m.user_id !== currentUserId && m.role !== "owner" && (
                    <button style={{ background: "none", border: "none", cursor: "pointer", color: "#E24B4A", fontSize: 11 }} onClick={() => onRemove(m.user_id, m.name ?? m.email ?? "member")}>Remove</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <>
          <div style={s.sectionLabel}>Pending Invites ({invites.length})</div>
          <div style={{ background: "white", border: "0.5px solid #e8e6e0", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#fffbf0" }}>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Expires</th>
                  <th style={s.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv, i) => (
                  <tr key={inv.id} style={{ borderTop: i > 0 ? "0.5px solid #f0ede8" : "none" }}>
                    <td style={s.td}>📬 {inv.email}</td>
                    <td style={{ ...s.td, color: roleColor(inv.role) }}>{roleLabel(inv.role)}</td>
                    <td style={{ ...s.td, color: "#73726c" }}>{new Date(inv.expires_at).toLocaleDateString()}</td>
                    <td style={s.td}>
                      <button style={{ background: "none", border: "none", cursor: "pointer", color: "#E24B4A", fontSize: 11 }} onClick={() => onRevoke(inv.id)}>Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Billing tab ──────────────────────────────────────────────────────────────

function BillingTab({ teamName, memberCount }: { teamName: string; memberCount: number }) {
  const pricePerSeat = 99;
  const total = pricePerSeat * memberCount;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ padding: "20px", background: "linear-gradient(135deg, #534AB7, #7c75d4)", borderRadius: 16, color: "white", marginBottom: 20 }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>Current Plan</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Team</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{teamName}</div>
      </div>

      <div style={s.sectionLabel}>Seat Summary</div>
      <div style={{ background: "white", border: "0.5px solid #e8e6e0", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid #f0ede8" }}>
          <span style={{ fontSize: 12 }}>Team members</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{memberCount}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "0.5px solid #f0ede8" }}>
          <span style={{ fontSize: 12 }}>Price per seat (one-time)</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>${pricePerSeat}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#f5f3ef" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Total</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#534AB7" }}>${total}</span>
        </div>
      </div>

      <div style={s.sectionLabel}>Included Features</div>
      <div style={{ background: "white", border: "0.5px solid #e8e6e0", borderRadius: 12, padding: "16px" }}>
        {[
          "Shared workspaces",
          "Role-based access (Owner, Editor, Viewer)",
          "Cloud project sync (Supabase)",
          "Version history & restore",
          "Admin dashboard",
          "Member onboarding",
          "All Pro features included",
        ].map((f) => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "0.5px solid #f5f3ef" }}>
            <span style={{ color: "#1D9E75", fontSize: 13 }}>✓</span>
            <span style={{ fontSize: 12 }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const colors = ["#534AB7", "#1D9E75", "#BA7517", "#E24B4A", "#0ea5e9"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: 26, height: 26, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  header: { padding: "20px 24px", borderBottom: "0.5px solid #e8e6e0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  pageTitle: { fontSize: 18, fontWeight: 700, color: "#1a1917" },
  muted: { fontSize: 12, color: "#73726c", marginTop: 2 },
  tabBar: { display: "flex", gap: 2, padding: "0 16px", borderBottom: "0.5px solid #e8e6e0", background: "white" },
  tabBtn: { padding: "10px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "#73726c" },
  tabBtnActive: { color: "#534AB7", borderBottom: "2px solid #534AB7" },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: "#9e9b94", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 },
  badge: { fontSize: 10, fontWeight: 600, border: "1px solid", borderRadius: 4, padding: "2px 6px" },
  input: { padding: "8px 10px", border: "1px solid #e8e6e0", borderRadius: 8, fontSize: 12, background: "#fafaf8", outline: "none", boxSizing: "border-box" },
  btnPrimary: { padding: "9px 16px", background: "#534AB7", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  th: { padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#73726c" },
  td: { padding: "10px 14px" },
  emptyState: { textAlign: "center", padding: 48, color: "#9e9b94" },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1a1917", color: "white", padding: "10px 18px", borderRadius: 8, fontSize: 12, zIndex: 1000, pointerEvents: "none" },
};
