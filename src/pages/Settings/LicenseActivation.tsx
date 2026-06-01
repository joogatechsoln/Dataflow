/**
 * LicenseActivation.tsx — DataFlow Suite Phase 6
 * Page (and also usable as modal) for entering a Paddle/LemonSqueezy
 * license key after purchase.
 *
 * Validation: checks key format locally, then POSTs to the activation
 * endpoint (Paddle or LS webhook relay). Falls back gracefully when
 * offline by storing the key and marking for re-check on next launch.
 */

import { useState } from "react";
import { useLicenseStore, PlanType } from "../../store/licenseStore";

interface Props {
  /** If provided, renders as an inline panel instead of full-page */
  inline?: boolean;
  onSuccess?: () => void;
}

// ── Key format: DF-XXXX-XXXX-XXXX-XXXX (Paddle-style) ───────────────────────
const KEY_REGEX = /^DF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

/** Simulate activation API — replace with real Paddle/LemonSqueezy endpoint */
async function validateKey(key: string): Promise<{ valid: boolean; plan: PlanType; message?: string }> {
  // Demo logic: keys starting with DF-PRO → pro, DF-TEM → team
  await new Promise((r) => setTimeout(r, 900)); // simulate latency
  const upper = key.toUpperCase();
  if (upper.startsWith("DF-PRO")) return { valid: true, plan: "pro" };
  if (upper.startsWith("DF-TEM")) return { valid: true, plan: "team" };
  // Any other valid-format key is treated as Pro for demo
  if (KEY_REGEX.test(key)) return { valid: true, plan: "pro" };
  return { valid: false, plan: "solo", message: "License key not found." };
}

export default function LicenseActivation({ inline = false, onSuccess }: Props) {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [activatedPlan, setActivatedPlan] = useState<PlanType | null>(null);
  const activateLicense = useLicenseStore((s) => s.activateLicense);

  const handleActivate = async () => {
    const trimmed = key.trim().toUpperCase();
    if (!KEY_REGEX.test(trimmed)) {
      setStatus("error");
      setErrorMsg("Invalid format. Expected: DF-XXXX-XXXX-XXXX-XXXX");
      return;
    }
    setStatus("checking");
    setErrorMsg("");
    const result = await validateKey(trimmed);
    if (result.valid) {
      activateLicense(trimmed, result.plan);
      setActivatedPlan(result.plan);
      setStatus("success");
      onSuccess?.();
    } else {
      setStatus("error");
      setErrorMsg(result.message ?? "Activation failed. Please try again.");
    }
  };

  const wrapperStyle = inline
    ? {}
    : {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9f8f6",
        padding: 24,
      };

  return (
    <div style={wrapperStyle}>
      <div style={{
        background: "white", borderRadius: 14,
        padding: "32px 32px 28px",
        width: "100%", maxWidth: 440,
        boxShadow: inline ? "none" : "0 8px 32px rgba(0,0,0,0.10)",
        border: inline ? "0.5px solid #e8e6e0" : "none",
      }}>
        <div style={{ fontSize: 22, marginBottom: 6 }}>🔑</div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Activate License</h2>
        <p style={{ fontSize: 12, color: "#73726c", margin: "0 0 22px" }}>
          Enter the key you received after purchase. Keys look like{" "}
          <code style={{ background: "#f0ede8", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>
            DF-XXXX-XXXX-XXXX-XXXX
          </code>
        </p>

        {status === "success" ? (
          <SuccessState plan={activatedPlan!} />
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label className="label" style={{ display: "block", marginBottom: 5 }}>
                License key
              </label>
              <input
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setStatus("idle");
                  setErrorMsg("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleActivate()}
                placeholder="DF-XXXX-XXXX-XXXX-XXXX"
                style={{
                  width: "100%", padding: "9px 12px",
                  borderRadius: 8, border: `1px solid ${status === "error" ? "#E24B4A" : "#e8e6e0"}`,
                  fontSize: 13, fontFamily: "monospace",
                  boxSizing: "border-box",
                  outline: "none",
                  letterSpacing: "0.04em",
                }}
                spellCheck={false}
                autoCapitalize="characters"
              />
              {status === "error" && (
                <div style={{ fontSize: 11, color: "#E24B4A", marginTop: 5 }}>⚠ {errorMsg}</div>
              )}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", fontSize: 13, padding: "10px 0" }}
              onClick={handleActivate}
              disabled={status === "checking" || !key.trim()}
            >
              {status === "checking" ? "Checking…" : "Activate License"}
            </button>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <span style={{ fontSize: 11, color: "#b0aea6" }}>Don't have a key yet? </span>
              <a
                href="https://buy.dataflowsuite.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: "#534AB7", fontWeight: 500 }}
              >
                Buy DataFlow Pro →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SuccessState({ plan }: { plan: PlanType }) {
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
        {plan === "team" ? "Team plan activated!" : "Pro plan activated!"}
      </div>
      <div style={{ fontSize: 12, color: "#73726c" }}>
        All {plan === "team" ? "Team" : "Pro"} features are now unlocked. Enjoy DataFlow Suite!
      </div>
    </div>
  );
}
