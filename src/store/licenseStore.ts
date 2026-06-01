/**
 * licenseStore.ts — DataFlow Suite Phase 6
 * Manages plan type, license key, trial state, and expiry.
 * Persisted to localStorage via Zustand persist middleware.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PlanType = "solo" | "pro" | "team";

export interface LicenseState {
  plan: PlanType;
  licenseKey: string | null;
  /** ISO date string when the license was activated */
  activatedAt: string | null;
  /** ISO date string when the trial started (null = no trial active) */
  trialStartedAt: string | null;
  /** Whether the user has explicitly dismissed the trial expired screen */
  trialExpiredDismissed: boolean;
  /** Whether the user completed onboarding */
  onboardingComplete: boolean;
  /** Referral code generated for this user */
  referralCode: string | null;
  /** How many successful referrals this user has */
  referralCount: number;
  /** Usage analytics opt-in */
  analyticsOptIn: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  activateLicense: (key: string, plan: PlanType) => void;
  startTrial: () => void;
  dismissTrialExpired: () => void;
  completeOnboarding: () => void;
  setAnalyticsOptIn: (val: boolean) => void;
  generateReferralCode: (userId: string) => void;
  incrementReferral: () => void;
  resetLicense: () => void;
}

/** Trial length in days */
export const TRIAL_DAYS = 14;

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      plan: "solo",
      licenseKey: null,
      activatedAt: null,
      trialStartedAt: null,
      trialExpiredDismissed: false,
      onboardingComplete: false,
      referralCode: null,
      referralCount: 0,
      analyticsOptIn: false,

      activateLicense: (key, plan) =>
        set({
          licenseKey: key,
          plan,
          activatedAt: new Date().toISOString(),
          trialStartedAt: null, // trial replaced by real license
          trialExpiredDismissed: false,
        }),

      startTrial: () => {
        // Only start if not already in a trial and no active license
        const { trialStartedAt, plan } = get();
        if (trialStartedAt || plan !== "solo") return;
        set({ trialStartedAt: new Date().toISOString(), plan: "pro" });
      },

      dismissTrialExpired: () => set({ trialExpiredDismissed: true }),

      completeOnboarding: () => set({ onboardingComplete: true }),

      setAnalyticsOptIn: (val) => set({ analyticsOptIn: val }),

      generateReferralCode: (userId) => {
        const code = "DF-" + userId.slice(0, 6).toUpperCase() + "-" +
          Math.random().toString(36).slice(2, 6).toUpperCase();
        set({ referralCode: code });
      },

      incrementReferral: () =>
        set((s) => ({ referralCount: s.referralCount + 1 })),

      resetLicense: () =>
        set({
          plan: "solo",
          licenseKey: null,
          activatedAt: null,
          trialStartedAt: null,
          trialExpiredDismissed: false,
        }),
    }),
    {
      name: "dataflow-license",
    }
  )
);
