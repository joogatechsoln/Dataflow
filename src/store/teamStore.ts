/**
 * teamStore.ts — DataFlow Suite Phase 4
 * Zustand store for team workspaces, members, roles, and cloud sync state.
 * Drop into src/store/
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TeamRole, DbTeam, DbTeamMember, DbInvite, DbProject, DbProjectVersion } from "../lib/supabase";

export type { TeamRole, DbTeam, DbTeamMember, DbInvite, DbProject, DbProjectVersion };

export interface CloudSyncState {
  lastSynced: string | null;   // ISO timestamp
  syncing: boolean;
  error: string | null;
}

interface TeamState {
  // Active workspace
  activeTeam: DbTeam | null;
  myTeams: DbTeam[];
  members: DbTeamMember[];
  pendingInvites: DbInvite[];

  // My role in the active team
  myRole: TeamRole | null;

  // Cloud projects (pulled from Supabase)
  cloudProjects: DbProject[];

  // Version history for the focused project
  versionHistory: DbProjectVersion[];

  // Sync status
  sync: CloudSyncState;

  // ─── Actions ────────────────────────────────────────────────

  setActiveTeam: (team: DbTeam | null) => void;
  setMyTeams: (teams: DbTeam[]) => void;
  setMembers: (members: DbTeamMember[]) => void;
  setPendingInvites: (invites: DbInvite[]) => void;
  setMyRole: (role: TeamRole | null) => void;
  setCloudProjects: (projects: DbProject[]) => void;
  setVersionHistory: (history: DbProjectVersion[]) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  setSyncSuccess: () => void;

  // Optimistic UI helpers
  addTeam: (team: DbTeam) => void;
  removeTeam: (teamId: string) => void;
  updateMemberRole: (userId: string, role: TeamRole) => void;
  removeMember: (userId: string) => void;
  addPendingInvite: (invite: DbInvite) => void;
  removePendingInvite: (inviteId: string) => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      activeTeam: null,
      myTeams: [],
      members: [],
      pendingInvites: [],
      myRole: null,
      cloudProjects: [],
      versionHistory: [],
      sync: { lastSynced: null, syncing: false, error: null },

      setActiveTeam: (team) => set({ activeTeam: team }),
      setMyTeams: (teams) => set({ myTeams: teams }),
      setMembers: (members) => set({ members }),
      setPendingInvites: (invites) => set({ pendingInvites: invites }),
      setMyRole: (role) => set({ myRole: role }),
      setCloudProjects: (projects) => set({ cloudProjects: projects }),
      setVersionHistory: (history) => set({ versionHistory: history }),

      setSyncing: (syncing) =>
        set((s) => ({ sync: { ...s.sync, syncing, error: syncing ? null : s.sync.error } })),

      setSyncError: (error) =>
        set((s) => ({ sync: { ...s.sync, syncing: false, error } })),

      setSyncSuccess: () =>
        set((s) => ({
          sync: { ...s.sync, syncing: false, error: null, lastSynced: new Date().toISOString() },
        })),

      addTeam: (team) =>
        set((s) => ({ myTeams: [team, ...s.myTeams] })),

      removeTeam: (teamId) =>
        set((s) => ({
          myTeams: s.myTeams.filter((t) => t.id !== teamId),
          activeTeam: s.activeTeam?.id === teamId ? null : s.activeTeam,
        })),

      updateMemberRole: (userId, role) =>
        set((s) => ({
          members: s.members.map((m) => (m.user_id === userId ? { ...m, role } : m)),
        })),

      removeMember: (userId) =>
        set((s) => ({ members: s.members.filter((m) => m.user_id !== userId) })),

      addPendingInvite: (invite) =>
        set((s) => ({ pendingInvites: [invite, ...s.pendingInvites] })),

      removePendingInvite: (inviteId) =>
        set((s) => ({ pendingInvites: s.pendingInvites.filter((i) => i.id !== inviteId) })),
    }),
    {
      name: "dataflow-team",
      partialize: (state) => ({
        activeTeam: state.activeTeam,
        myTeams: state.myTeams,
        myRole: state.myRole,
        sync: state.sync,
      }),
    }
  )
);

// ─── Role-permission helpers (use these throughout the UI) ──────────────────

/** Returns true if the given role can edit projects / data */
export function canEdit(role: TeamRole | null): boolean {
  return role === "owner" || role === "editor";
}

/** Returns true if the given role can manage members / settings */
export function canAdmin(role: TeamRole | null): boolean {
  return role === "owner";
}

/** Human label for a role */
export function roleLabel(role: TeamRole): string {
  return { owner: "Owner", editor: "Editor", viewer: "Viewer" }[role];
}

/** Tailwind-compatible color token for a role badge */
export function roleColor(role: TeamRole): string {
  return { owner: "#534AB7", editor: "#1D9E75", viewer: "#73726c" }[role];
}
