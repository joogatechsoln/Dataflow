/**
 * useLicense.ts — DataFlow Suite Phase 6
 * Central hook for all plan/feature gating checks.
 * Derived entirely from licenseStore — no extra state.
 */

import { useLicenseStore, TRIAL_DAYS } from "../store/licenseStore";

export interface LicenseInfo {
  plan: "solo" | "pro" | "team";
  isPro: boolean;
  isTeam: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  isTrialActive: boolean;
  /** Days remaining in trial, or null if not in trial */
  daysLeft: number | null;
  /** True when user has any paid or trial access (Pro features unlocked) */
  hasProAccess: boolean;
  /** True when user has team-tier access */
  hasTeamAccess: boolean;
}

export function useLicense(): LicenseInfo {
  const { plan, trialStartedAt } = useLicenseStore();

  // ── Trial maths ────────────────────────────────────────────────────────────
  let isTrial = false;
  let isTrialExpired = false;
  let isTrialActive = false;
  let daysLeft: number | null = null;

  if (trialStartedAt) {
    isTrial = true;
    const started = new Date(trialStartedAt).getTime();
    const now = Date.now();
    const elapsed = (now - started) / (1000 * 60 * 60 * 24); // days
    daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
    isTrialExpired = daysLeft === 0;
    isTrialActive = !isTrialExpired;
  }

  // ── Plan flags ─────────────────────────────────────────────────────────────
  // During an active trial the plan is stored as "pro" by startTrial()
  const isPro = plan === "pro" && !isTrialExpired;
  const isTeam = plan === "team";

  const hasProAccess = isPro || isTeam;
  const hasTeamAccess = isTeam;

  return {
    plan,
    isPro,
    isTeam,
    isTrial,
    isTrialExpired,
    isTrialActive,
    daysLeft,
    hasProAccess,
    hasTeamAccess,
  };
}
