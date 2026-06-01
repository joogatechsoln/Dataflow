/**
 * supabase.ts — DataFlow Suite Phase 4
 * Supabase client + typed helpers for teams, projects, versions, and invites.
 * Drop this into src/lib/ replacing the Phase 3 stub.
 *
 * Requires environment variables (set in .env or Tauri env):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Types matching the Supabase schema ────────────────────────────────────

export type TeamRole = "owner" | "editor" | "viewer";

export interface DbTeam {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface DbTeamMember {
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  // joined from profiles
  email?: string;
  name?: string;
}

export interface DbProject {
  id: string;
  team_id: string | null;
  owner_id: string;
  name: string;
  description: string;
  data: Record<string, unknown>;   // full pipeline state snapshot
  updated_at: string;
  created_at: string;
}

export interface DbProjectVersion {
  id: string;
  project_id: string;
  snapshot: Record<string, unknown>;
  changed_by: string;
  change_summary: string;
  created_at: string;
  // joined from profiles
  changer_name?: string;
  changer_email?: string;
}

export interface DbInvite {
  id: string;
  team_id: string;
  email: string;
  role: TeamRole;
  token: string;
  expires_at: string;
  accepted: boolean;
  created_at: string;
}

export interface DbProfile {
  id: string;          // same as auth.users.id
  email: string;
  name: string;
  avatar_url?: string;
  plan: "solo" | "pro" | "team";
}

// ─── Client singleton ──────────────────────────────────────────────────────

let _client: SupabaseClient | null = null;

/** Returns the Supabase client, or null if env vars are not configured. Never throws. */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const url = import.meta.env.VITE_SUPABASE_URL  as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url || !key || url === "https://placeholder.supabase.co") {
    // Running without Supabase — local-only mode, fully supported
    return null;
  }

  _client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return _client;
}

/** True when Supabase is configured and cloud features are available */
export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}

// ─── Auth helpers ──────────────────────────────────────────────────────────

/** Sign in with email + password */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    await ensureProfile(
      data.user.id,
      data.user.email ?? email,
      data.user.user_metadata?.name ?? email.split("@")[0]
    );
  }
  return data;
}

/** Sign up with email + password */
export async function signUpWithEmail(email: string, password: string, name: string) {
  const sb = requireSupabase();
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;

  // Insert profile row
  if (data.user) {
    await ensureProfile(data.user.id, email, name);
  }
  return data;
}

/** OAuth — Google */
export async function signInWithGoogle() {
  const { error } = await requireSupabase().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

/** OAuth — GitHub */
export async function signInWithGitHub() {
  const { error } = await requireSupabase().auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

/** Sign out */
export async function signOut() {
  await requireSupabase().auth.signOut();
}

/** Get current session user id (null if not signed in) */
export async function currentUserId(): Promise<string | null> {
  const { data } = await requireSupabase().auth.getSession();
  return data.session?.user?.id ?? null;
}

// ─── Profile helpers ───────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await requireSupabase()
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as DbProfile;
}

export async function ensureProfile(userId: string, email: string, name: string): Promise<void> {
  const { error } = await requireSupabase().from("profiles").upsert({
    id: userId,
    email,
    name: name || email.split("@")[0] || "User",
  });
  if (error) throw error;
}

export async function updateProfile(userId: string, updates: Partial<DbProfile>) {
  const { error } = await requireSupabase()
    .from("profiles")
    .update(updates)
    .eq("id", userId);
  if (error) throw error;
}

// ─── Team helpers ──────────────────────────────────────────────────────────

export async function createTeam(name: string, ownerId: string): Promise<DbTeam> {
  const sb = requireSupabase();
  const { data: authUser } = await sb.auth.getUser();
  if (authUser.user?.id === ownerId) {
    await ensureProfile(
      ownerId,
      authUser.user.email ?? "",
      authUser.user.user_metadata?.name ?? authUser.user.email?.split("@")[0] ?? "User"
    );
  }

  const { data, error } = await sb
    .from("teams")
    .insert({ name, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;

  // Add owner as member
  await sb.from("team_members").insert({
    team_id: data.id,
    user_id: ownerId,
    role: "owner",
  });

  return data as DbTeam;
}

export async function getTeam(teamId: string): Promise<DbTeam | null> {
  const { data, error } = await requireSupabase()
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();
  if (error) return null;
  return data as DbTeam;
}

export async function getTeamsForUser(userId: string): Promise<DbTeam[]> {
  const { data, error } = await requireSupabase()
    .from("team_members")
    .select("teams(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r: { teams: unknown }) => r.teams as DbTeam);
}

// ─── Team member helpers ───────────────────────────────────────────────────

export async function getTeamMembers(teamId: string): Promise<DbTeamMember[]> {
  const { data, error } = await requireSupabase()
    .from("team_members")
    .select("*, profiles(name, email)")
    .eq("team_id", teamId);
  if (error) throw error;

  return (data ?? []).map((r: DbTeamMember & { profiles?: { name: string; email: string } }) => ({
    team_id: r.team_id,
    user_id: r.user_id,
    role: r.role,
    joined_at: r.joined_at,
    name: r.profiles?.name,
    email: r.profiles?.email,
  }));
}

export async function updateMemberRole(teamId: string, userId: string, role: TeamRole) {
  const { error } = await requireSupabase()
    .from("team_members")
    .update({ role })
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function removeMember(teamId: string, userId: string) {
  const { error } = await requireSupabase()
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ─── Invite helpers ────────────────────────────────────────────────────────

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createInvite(
  teamId: string,
  email: string,
  role: TeamRole
): Promise<DbInvite> {
  const token = generateToken();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  const { data, error } = await requireSupabase()
    .from("invites")
    .insert({ team_id: teamId, email, role, token, expires_at, accepted: false })
    .select()
    .single();
  if (error) throw error;
  return data as DbInvite;
}

export async function getPendingInvites(teamId: string): Promise<DbInvite[]> {
  const { data, error } = await requireSupabase()
    .from("invites")
    .select("*")
    .eq("team_id", teamId)
    .eq("accepted", false)
    .gt("expires_at", new Date().toISOString());
  if (error) throw error;
  return (data ?? []) as DbInvite[];
}

export async function acceptInvite(token: string, userId: string): Promise<void> {
  const sb = requireSupabase();
  const { data: invite, error } = await sb
    .from("invites")
    .select("*")
    .eq("token", token)
    .eq("accepted", false)
    .gt("expires_at", new Date().toISOString())
    .single();
  if (error || !invite) throw new Error("Invalid or expired invite link.");

  await sb.from("team_members").insert({
    team_id: invite.team_id,
    user_id: userId,
    role: invite.role,
  });

  await sb.from("invites").update({ accepted: true }).eq("id", invite.id);
}

export async function revokeInvite(inviteId: string) {
  const { error } = await requireSupabase().from("invites").delete().eq("id", inviteId);
  if (error) throw error;
}

// ─── Cloud project sync ────────────────────────────────────────────────────

export async function pushProject(project: {
  id: string;
  team_id: string | null;
  owner_id: string;
  name: string;
  description: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const { error } = await requireSupabase().from("projects").upsert(
    { ...project, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function pullTeamProjects(teamId: string): Promise<DbProject[]> {
  const { data, error } = await requireSupabase()
    .from("projects")
    .select("*")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbProject[];
}

export async function pullOwnProjects(ownerId: string): Promise<DbProject[]> {
  const { data, error } = await requireSupabase()
    .from("projects")
    .select("*")
    .eq("owner_id", ownerId)
    .is("team_id", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbProject[];
}

export async function deleteCloudProject(projectId: string) {
  const { error } = await requireSupabase().from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

// ─── Version history helpers ───────────────────────────────────────────────

export async function saveVersion(
  projectId: string,
  snapshot: Record<string, unknown>,
  changedBy: string,
  summary: string
): Promise<void> {
  const { error } = await requireSupabase().from("project_versions").insert({
    project_id: projectId,
    snapshot,
    changed_by: changedBy,
    change_summary: summary,
  });
  if (error) throw error;
}

export async function getVersionHistory(projectId: string): Promise<DbProjectVersion[]> {
  const { data, error } = await requireSupabase()
    .from("project_versions")
    .select("*, profiles(name, email)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? []).map((r: DbProjectVersion & { profiles?: { name: string; email: string } }) => ({
    id: r.id,
    project_id: r.project_id,
    snapshot: r.snapshot,
    changed_by: r.changed_by,
    change_summary: r.change_summary,
    created_at: r.created_at,
    changer_name: r.profiles?.name,
    changer_email: r.profiles?.email,
  }));
}

// ─── Admin / usage stats ───────────────────────────────────────────────────

export async function getTeamUsageStats(teamId: string) {
  const sb = requireSupabase();

  const [membersResult, projectsResult] = await Promise.all([
    sb.from("team_members").select("user_id", { count: "exact" }).eq("team_id", teamId),
    sb.from("projects").select("id", { count: "exact" }).eq("team_id", teamId),
  ]);

  return {
    memberCount: membersResult.count ?? 0,
    projectCount: projectsResult.count ?? 0,
  };
}

// ─── Internal: throws if Supabase is not configured ────────────────────────
// Used by auth helpers that intentionally require cloud connectivity.
function requireSupabase(): SupabaseClient {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud features require Supabase. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.");
  return sb;
}
