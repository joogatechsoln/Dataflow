/**
 * useCloudSync.ts — DataFlow Suite Phase 4
 * React hook that handles pushing local project state to Supabase
 * and pulling team projects. Respects role permissions.
 * Drop into src/lib/
 */

import { useCallback } from "react";
import { useProjectStore } from "../store/projectStore";
import { useAuthStore } from "../store/authStore";
import { useTeamStore, canEdit } from "../store/teamStore";
import {
  pushProject,
  pullTeamProjects,
  pullOwnProjects,
  saveVersion,
  getVersionHistory,
  getSupabase,
} from "./supabase";

export function useCloudSync() {
  const { projects, updateProject } = useProjectStore();
  const { user } = useAuthStore();
  const {
    activeTeam,
    myRole,
    setCloudProjects,
    setVersionHistory,
    setSyncing,
    setSyncError,
    setSyncSuccess,
  } = useTeamStore();

  /**
   * Push a single local project to Supabase (upsert).
   * Automatically saves a version snapshot.
   */
  const syncProject = useCallback(
    async (projectId: string, changeSummary = "Auto-saved") => {
      if (!user) return;

      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      // If in a team, respect role
      if (activeTeam && !canEdit(myRole)) {
        console.warn("Viewer role — skipping sync push.");
        return;
      }

      setSyncing(true);
      try {
        const cloudPayload = {
          id: project.id,
          team_id: activeTeam?.id ?? null,
          owner_id: user.id,
          name: project.name,
          description: project.description,
          data: project as unknown as Record<string, unknown>,
        };

        await pushProject(cloudPayload);
        await saveVersion(
          project.id,
          cloudPayload.data,
          user.id,
          changeSummary
        );
        setSyncSuccess();
      } catch (err) {
        setSyncError((err as Error).message ?? "Sync failed");
      }
    },
    [projects, user, activeTeam, myRole, setSyncing, setSyncError, setSyncSuccess]
  );

  /**
   * Pull all projects for the active team (or own projects if solo).
   * Merges cloud projects into the cloud project list (does NOT overwrite local).
   */
  const pullProjects = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const cloudProjects = activeTeam
        ? await pullTeamProjects(activeTeam.id)
        : await pullOwnProjects(user.id);
      setCloudProjects(cloudProjects);
      setSyncSuccess();
    } catch (err) {
      setSyncError((err as Error).message ?? "Pull failed");
    }
  }, [user, activeTeam, setCloudProjects, setSyncing, setSyncError, setSyncSuccess]);

  /**
   * Pull version history for a specific project.
   */
  const loadVersionHistory = useCallback(
    async (projectId: string) => {
      try {
        const history = await getVersionHistory(projectId);
        setVersionHistory(history);
      } catch (err) {
        console.error("Failed to load version history:", err);
      }
    },
    [setVersionHistory]
  );

  /**
   * Restore a project from a specific version snapshot.
   * Writes the snapshot back into local Zustand state.
   */
  const restoreVersion = useCallback(
    async (projectId: string, snapshot: Record<string, unknown>, restoredBy: string) => {
      if (!canEdit(myRole) && activeTeam) {
        throw new Error("You don't have permission to restore versions.");
      }

      // Apply snapshot to local store
      updateProject(projectId, snapshot as Parameters<typeof updateProject>[1]);

      // Save a new version noting the restore
      if (user) {
        await saveVersion(projectId, snapshot, user.id, `Restored to earlier version by ${restoredBy}`);
      }
    },
    [myRole, activeTeam, updateProject, user]
  );

  /**
   * Subscribe to real-time project changes in the active team.
   * Returns an unsubscribe function.
   */
  const subscribeToTeamChanges = useCallback(
    (onUpdate: (projectId: string) => void): (() => void) => {
      if (!activeTeam) return () => {};

      const sb = getSupabase();
      if (!sb) return () => {};

      const channel = sb
        .channel(`team-projects-${activeTeam.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "projects",
            filter: `team_id=eq.${activeTeam.id}`,
          },
          (payload) => {
            const newRecord = payload.new as { id?: string } | null;
            if (newRecord?.id) {
              onUpdate(newRecord.id);
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    },
    [activeTeam]
  );

  return {
    syncProject,
    pullProjects,
    loadVersionHistory,
    restoreVersion,
    subscribeToTeamChanges,
  };
}
