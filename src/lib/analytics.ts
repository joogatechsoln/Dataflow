/**
 * analytics.ts — DataFlow Suite Phase 6 + 7
 * Plausible opt-in event logger.
 * Phase 7 additions: COMMAND_PALETTE_ACTION, SHORTCUT_USED events.
 *
 * Fires events only when the user has opted in (analyticsOptIn = true).
 * All events are anonymous — no PII is sent.
 *
 * Plausible script is injected dynamically from VITE_PLAUSIBLE_DOMAIN.
 */

import { useLicenseStore } from "../store/licenseStore";

const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;

// ── Event catalogue ────────────────────────────────────────────────────────────

export const Events = {
  // Onboarding
  ONBOARDING_STARTED:        "onboarding_started",
  ONBOARDING_PLAN_SELECTED:  "onboarding_plan_selected",
  ONBOARDING_COMPLETED:      "onboarding_completed",
  ONBOARDING_SKIPPED:        "onboarding_skipped",

  // Licensing
  TRIAL_STARTED:             "trial_started",
  LICENSE_ACTIVATED:         "license_activated",
  UPGRADE_CTA_CLICKED:       "upgrade_cta_clicked",
  REFERRAL_LINK_COPIED:      "referral_link_copied",

  // Pipeline
  PIPELINE_TAB_OPENED:       "pipeline_tab_opened",
  PROJECT_CREATED:           "project_created",
  DATA_IMPORTED:             "data_imported",
  CHART_BUILT:               "chart_built",
  REPORT_EXPORTED:           "report_exported",

  // AI
  AI_PROMPT_SENT:            "ai_prompt_sent",
  AI_ASSISTANT_OPENED:       "ai_assistant_opened",

  // Plugins
  PLUGIN_INSTALLED:          "plugin_installed",
  PLUGIN_UNINSTALLED:        "plugin_uninstalled",

  // Phase 7 additions
  COMMAND_PALETTE_ACTION:    "command_palette_action",
  SHORTCUT_USED:             "shortcut_used",
  PDF_EXPORT_COMPLETED:      "pdf_export_completed",
  PPTX_EXPORT_COMPLETED:     "pptx_export_completed",
  CHART_DOWNLOADED:          "chart_downloaded",
  ANNOTATION_ADDED:          "annotation_added",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

// ── Plausible script injection ────────────────────────────────────────────────

let scriptInjected = false;

function injectPlausible() {
  if (scriptInjected || !PLAUSIBLE_DOMAIN) return;
  if (typeof document === "undefined") return;

  const script = document.createElement("script");
  script.defer = true;
  script.dataset.domain = PLAUSIBLE_DOMAIN;
  script.src = "https://plausible.io/js/plausible.js";
  document.head.appendChild(script);
  scriptInjected = true;
}

// ── Core track function ───────────────────────────────────────────────────────

export function trackEvent(
  event: EventName,
  props?: Record<string, string | number | boolean>
): void {
  // Guard: only fire if user has opted in
  const { analyticsOptIn } = useLicenseStore.getState();
  if (!analyticsOptIn) return;

  // Guard: no domain configured
  if (!PLAUSIBLE_DOMAIN) return;

  // Inject Plausible script on first event
  injectPlausible();

  // Fire via Plausible's window.plausible function
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plausible = (window as any).plausible;
    if (typeof plausible === "function") {
      plausible(event, props ? { props } : undefined);
    }
  } catch {
    // Analytics must never crash the app
  }
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export function trackPipelineTab(tab: string) {
  trackEvent(Events.PIPELINE_TAB_OPENED, { tab });
}

export function trackChartBuilt(chartType: string) {
  trackEvent(Events.CHART_BUILT, { chart_type: chartType });
}

export function trackReportExport(format: string) {
  trackEvent(Events.REPORT_EXPORTED, { format });
}

export function trackAIPrompt(tab: string) {
  trackEvent(Events.AI_PROMPT_SENT, { context_tab: tab });
}
