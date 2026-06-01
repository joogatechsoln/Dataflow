/**
 * Vercel Analytics custom event logger.
 *
 * Page views are collected by <Analytics /> in App.tsx when Vercel Analytics
 * is enabled for the project. Custom product events only fire when the user
 * has opted in through app settings.
 */

import { track } from "@vercel/analytics";
import { useLicenseStore } from "../store/licenseStore";

export const Events = {
  // Onboarding
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_PLAN_SELECTED: "onboarding_plan_selected",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_SKIPPED: "onboarding_skipped",

  // Licensing
  TRIAL_STARTED: "trial_started",
  LICENSE_ACTIVATED: "license_activated",
  UPGRADE_CTA_CLICKED: "upgrade_cta_clicked",
  REFERRAL_LINK_COPIED: "referral_link_copied",

  // Pipeline
  PIPELINE_TAB_OPENED: "pipeline_tab_opened",
  PROJECT_CREATED: "project_created",
  DATA_IMPORTED: "data_imported",
  CHART_BUILT: "chart_built",
  REPORT_EXPORTED: "report_exported",

  // AI
  AI_PROMPT_SENT: "ai_prompt_sent",
  AI_ASSISTANT_OPENED: "ai_assistant_opened",

  // Plugins
  PLUGIN_INSTALLED: "plugin_installed",
  PLUGIN_UNINSTALLED: "plugin_uninstalled",

  // Advanced workflow events
  COMMAND_PALETTE_ACTION: "command_palette_action",
  SHORTCUT_USED: "shortcut_used",
  PDF_EXPORT_COMPLETED: "pdf_export_completed",
  PPTX_EXPORT_COMPLETED: "pptx_export_completed",
  CHART_DOWNLOADED: "chart_downloaded",
  ANNOTATION_ADDED: "annotation_added",
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

export function trackEvent(
  event: EventName,
  props?: Record<string, string | number | boolean>,
): void {
  const { analyticsOptIn } = useLicenseStore.getState();
  if (!analyticsOptIn) return;

  try {
    track(event, props);
  } catch {
    // Analytics must never crash the app.
  }
}

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
