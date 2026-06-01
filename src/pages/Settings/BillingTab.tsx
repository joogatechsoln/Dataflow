/**
 * BillingTab.tsx — DataFlow Suite Phase 6
 * Billing section shown inside Settings > Billing tab.
 * Features:
 *   - Current plan summary
 *   - Start free trial CTA (Solo users)
 *   - Purchase links → LemonSqueezy checkout
 *   - License key activation (inline LicenseActivation)
 *   - Referral link generator
 *   - Webhook-driven billing summary (for Team admins)
 */

import { useState } from "react";
import { useLicense } from "../../lib/useLicense";
import { useLicenseStore } from "../../store/licenseStore";
import { useAuthStore } from "../../store/authStore";
import LicenseActivation from "./LicenseActivation";
import { trackEvent, Events } from "../../lib/analytics";

// Replace with real LemonSqueezy checkout URLs
const CHECKOUT_PRO  = "https://dataflowsuite.lemonsqueezy.com/checkout/buy/pro";
const CHECKOUT_TEAM = "https://dataflowsuite.lemonsqueezy.com/checkout/buy/team";

export default function BillingTab() {
  const license = useLicense();
  const { plan, referralCode, referralCount, trialStartedAt } = useLicenseStore();
  const startTrial = useLicenseStore((s) => s.startTrial);
  const generateReferralCode = useLicenseStore((s) => s.generateReferralCode);
  const user = useAuthStore((s) => s.user);
  const [showActivation, setShowActivation] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);

  const handleStartTrial = () => {
    startTrial();
    trackEvent(Events.TRIAL_STARTED);
  };

  const handleCopyReferral = () => {
    const code = referralCode ?? (() => {
      generateReferralCode(user?.id ?? "anon");
      return useLicenseStore.getState().referralCode!;
    })();
    const link = `https://dataflowsuite.com/ref/${code}`;
    navigator.clipboard.writeText(link);
    setReferralCopied(true);
    trackEvent(Events.REFERRAL_LINK_COPIED);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>

      {/* ── Current plan card ─────────────────────────────────────────── */}
      <PlanCard license={license} trialStartedAt={trialStartedAt} />

      {/* ── Upgrade CTA — only for Solo / expired trial ──────────────── */}
      {(plan === "solo" || license.isTrialExpired) && (
        <UpgradeSection
          onTrial={handleStartTrial}
          trialAlreadyUsed={!!trialStartedAt}
          onActivate={() => setShowActivation(true)}
        />
      )}

      {/* ── Inline license activation ─────────────────────────────────── */}
      {showActivation && (
        <LicenseActivation
          inline
          onSuccess={() => setShowActivation(false)}
        />
      )}

      {(plan === "pro" || plan === "team") && !showActivation && (
        <button
          className="btn btn-ghost"
          style={{ alignSelf: "flex-start", fontSize: 12 }}
          onClick={() => setShowActivation(true)}
        >
          Enter a different license key
        </button>
      )}

      {/* ── Referral ──────────────────────────────────────────────────── */}
      <ReferralSection
        code={referralCode}
        count={referralCount}
        onGenerate={() => generateReferralCode(user?.id ?? "anon")}
        onCopy={handleCopyReferral}
        copied={referralCopied}
      />

      {/* ── Team billing webhook summary (Team plan only) ────────────── */}
      {plan === "team" && <TeamBillingSummary />}
    </div>
  );
}

// ── Plan summary card ─────────────────────────────────────────────────────────

function PlanCard({ license, trialStartedAt }: {
  license: ReturnType<typeof useLicense>;
  trialStartedAt: string | null;
}) {
  const planColors: Record<string, { bg: string; color: string }> = {
    solo:  { bg: "#f0ede8", color: "#73726c" },
    pro:   { bg: "#EEEDFE", color: "#534AB7" },
    team:  { bg: "#e6f7f1", color: "#1D9E75" },
  };
  const { bg, color } = planColors[license.plan] ?? planColors.solo;
  const planLabel = license.plan === "pro"
    ? license.isTrial ? "Pro (Trial)" : "Pro"
    : license.plan === "team" ? "Team" : "Solo (Free)";

  return (
    <div style={{ background: "white", border: "0.5px solid #e8e6e0", borderRadius: 12, padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Current Plan</div>
        <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
          {planLabel}
        </span>
      </div>
      {license.isTrial && license.isTrialActive && (
        <div style={{ fontSize: 12, color: "#BA7517" }}>
          ⏱ {license.daysLeft} day{license.daysLeft !== 1 ? "s" : ""} remaining in your trial
        </div>
      )}
      {license.isTrialExpired && (
        <div style={{ fontSize: 12, color: "#E24B4A" }}>
          ⚠ Your trial ended — some Pro features are locked
        </div>
      )}
      {license.plan === "solo" && !trialStartedAt && (
        <div style={{ fontSize: 12, color: "#73726c" }}>
          Upgrade to Pro for advanced exports, AI reports, and more.
        </div>
      )}
      {(license.plan === "pro" && !license.isTrial) && (
        <div style={{ fontSize: 12, color: "#1D9E75" }}>
          ✅ Lifetime Pro access — all Pro features unlocked
        </div>
      )}
      {license.plan === "team" && (
        <div style={{ fontSize: 12, color: "#1D9E75" }}>
          ✅ Team plan — all features + collaboration tools unlocked
        </div>
      )}
    </div>
  );
}

// ── Upgrade section ───────────────────────────────────────────────────────────

function UpgradeSection({
  onTrial,
  trialAlreadyUsed,
  onActivate,
}: {
  onTrial: () => void;
  trialAlreadyUsed: boolean;
  onActivate: () => void;
}) {
  return (
    <div style={{ background: "#F5F4FE", border: "0.5px solid #AFA9EC", borderRadius: 12, padding: "20px 22px" }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#534AB7", marginBottom: 4 }}>
        Unlock Pro Features
      </div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 16 }}>
        Export to PowerPoint and Word, advanced AI reports, Power BI embed, and unlimited charts.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!trialAlreadyUsed && (
          <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={onTrial}>
            Start 14-Day Free Trial
          </button>
        )}
        <a
          href={CHECKOUT_PRO}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
          style={{ fontSize: 12, textDecoration: "none" }}
          onClick={() => trackEvent(Events.UPGRADE_CTA_CLICKED, { plan: "pro" })}
        >
          Buy Pro — $49 one-time →
        </a>
        <a
          href={CHECKOUT_TEAM}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          style={{ fontSize: 12, textDecoration: "none" }}
          onClick={() => trackEvent(Events.UPGRADE_CTA_CLICKED, { plan: "team" })}
        >
          Team — $99/seat
        </a>
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onActivate}>
          I have a license key
        </button>
      </div>
    </div>
  );
}

// ── Referral section ──────────────────────────────────────────────────────────

function ReferralSection({
  code, count, onGenerate, onCopy, copied,
}: {
  code: string | null;
  count: number;
  onGenerate: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div style={{ background: "white", border: "0.5px solid #e8e6e0", borderRadius: 12, padding: "20px 22px" }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Refer a Friend</div>
      <div style={{ fontSize: 12, color: "#73726c", marginBottom: 14 }}>
        Share your referral link. When a friend buys Pro, you both get a $10 discount on renewal.
        {count > 0 && <span style={{ color: "#1D9E75", marginLeft: 6 }}>🎉 {count} successful referral{count !== 1 ? "s" : ""} so far!</span>}
      </div>
      {code ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            readOnly
            value={`https://dataflowsuite.com/ref/${code}`}
            style={{
              flex: 1, padding: "8px 10px", borderRadius: 7,
              border: "0.5px solid #e8e6e0", fontSize: 12,
              fontFamily: "monospace", color: "#534AB7", background: "#F5F4FE",
            }}
          />
          <button className="btn btn-secondary" style={{ fontSize: 12, flexShrink: 0 }} onClick={onCopy}>
            {copied ? "Copied! ✓" : "Copy"}
          </button>
        </div>
      ) : (
        <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onGenerate}>
          Generate my referral link
        </button>
      )}
    </div>
  );
}

// ── Team billing summary (placeholder — populated via LemonSqueezy webhooks) ─

function TeamBillingSummary() {
  // In production: fetch from Supabase billing_events table populated by webhook
  const mockSeats = 4;
  const mockNextBilling = "2026-07-01";
  const mockAmount = mockSeats * 99;

  return (
    <div style={{ background: "white", border: "0.5px solid #e8e6e0", borderRadius: 12, padding: "20px 22px" }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Team Billing</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        {[
          { label: "Active seats", value: mockSeats },
          { label: "Next billing", value: mockNextBilling },
          { label: "Amount due", value: `$${mockAmount}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "#f9f8f6", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#b0aea6", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <a
          href="https://app.lemonsqueezy.com/my-orders"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: "#534AB7" }}
        >
          Manage billing on LemonSqueezy →
        </a>
      </div>
    </div>
  );
}
